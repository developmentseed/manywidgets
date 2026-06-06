// @manywidgets/core — shared client-side helpers bundled into every widget.
//
// This module encapsulates the static-export "hazards" once, so no individual
// widget has to reimplement them. esbuild inlines it into each widget's
// dist/widget.js (resolved via the `@manywidgets/core` alias), which means
// every widget ships its own copy of these helpers with no runtime dependency
// on a separately published package.
//
// The hazards (documented at length in the source dashboards) are:
//   1. In a live Jupyter kernel there is one canonical model per id, reachable
//      via `model.widget_manager.get_model(id)`. In static export there is NO
//      kernel: models live in a per-page host registry, and the SAME id can be
//      represented by MULTIPLE proxies — a write only lands on the proxy you
//      addressed, so cross-widget writes must fan out to every matching proxy.
//   2. A widget's wrapper module can load asynchronously, so its proxy may
//      register AFTER another widget's render() has returned. Resolution must
//      therefore be lazy / re-evaluated, never snapshotted once at startup.
//   3. There is no kernel statically, so `model.save_changes()` throws.

/** Minimal structural view of an anywidget model — both real models and the
 *  static-export proxies satisfy this. */
export interface AnyModel {
  get(name: string): unknown;
  set(name: string, value: unknown): void;
  save_changes?: () => void;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  off?: (event: string, cb: (...args: unknown[]) => void) => void;
  widget_manager?: { get_model?: (id: string) => Promise<AnyModel> };
  model_id?: string;
}

/** `model.save_changes()` is a no-op when there is no kernel (static export). */
export function safeSaveChanges(model: { save_changes?: () => void } | null | undefined): void {
  try {
    model?.save_changes?.();
  } catch {
    // No kernel (static export) — nothing to sync.
  }
}

/** Subscribe to a trait change. Returns an unsubscribe function. */
export function onChange(
  model: AnyModel,
  name: string,
  fn: (value: unknown) => void,
): () => void {
  const handler = () => fn(model.get(name));
  model.on?.(`change:${name}`, handler);
  return () => model.off?.(`change:${name}`, handler);
}

/**
 * Subscribe one callback to several trait changes.
 *
 * IMPORTANT: always register one listener per event. The live (Backbone) model
 * accepts space-separated event names in `on(...)`, but the static-export model
 * emitter does NOT — `on("change:a change:b", fn)` silently never fires there.
 * Use this helper instead of space-separated names.
 */
export function onChanges(
  model: AnyModel,
  names: string[],
  fn: () => void,
): () => void {
  for (const name of names) model.on?.(`change:${name}`, fn);
  return () => {
    for (const name of names) model.off?.(`change:${name}`, fn);
  };
}

/** Strip the `IPY_MODEL_` prefix that widget references sometimes carry. */
export function stripIpy(id: string | null | undefined): string {
  return id ? String(id).replace(/^IPY_MODEL_/, "") : "";
}

/** Coerce a value to a finite number, or return `fallback`. */
export function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Set a value at a (possibly dotted) path on a model.
 *
 * Leaf paths do a plain `model.set(key, value)`. Nested paths (e.g.
 * `"view_state.zoom"`) read the top-level object, clone-and-merge the leaf, and
 * set it back so listeners see a single coherent update.
 */
export function setByPath(model: AnyModel, path: string, value: unknown): void {
  const parts = path.split(".");
  if (parts.length === 1) {
    model.set(parts[0], value);
    return;
  }
  const topKey = parts[0];
  const existing = model.get(topKey);
  const next: Record<string, unknown> =
    existing && typeof existing === "object" ? { ...(existing as object) } : {};
  let cursor = next;
  for (let i = 1; i < parts.length - 1; i++) {
    const k = parts[i];
    const child = cursor[k];
    cursor[k] = child && typeof child === "object" ? { ...(child as object) } : {};
    cursor = cursor[k] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = value;
  model.set(topKey, next);
}

// ── Static-export host registry ──────────────────────────────────────────────

type Registry = {
  get?: (key: string) => AnyModel | undefined;
  filter?: (pred: (w: AnyModel) => boolean) => AnyModel[];
  all?: () => AnyModel[];
};

/** The per-page host registry installed by myst-anywidget-static-export, or
 *  null when running in a live kernel. */
function getStaticRegistry(): Registry | null {
  const hosts = (globalThis as { __myst_anywidget_hosts?: Map<string, Registry> })
    .__myst_anywidget_hosts;
  if (!hosts || typeof hosts.values !== "function") return null;
  for (const v of hosts.values()) return v; // typically one host per page
  return null;
}

/**
 * All registry models matching `id`. Root widgets are keyed by `widget_id` (and
 * their UUID / `_anywidget_id`) — `reg.get()` resolves those, normalizing the
 * ref. Sub-models (e.g. lonboard layers) can appear as several proxies sharing a
 * `model_id`; those are gathered via `filter` so writes can fan out to all of
 * them. Re-evaluated on each call so late-registering proxies are picked up.
 */
function findAllInRegistry(reg: Registry, id: string): AnyModel[] {
  const out: AnyModel[] = [];
  const seen = new Set<AnyModel>();
  const push = (m: AnyModel | undefined | null) => {
    if (m && !seen.has(m)) {
      seen.add(m);
      out.push(m);
    }
  };
  if (typeof reg.get === "function") push(reg.get(id));
  const all = typeof reg.filter === "function"
    ? reg.filter((w) => !!w && w.model_id === id)
    : typeof reg.all === "function"
      ? reg.all().filter((w) => !!w && w.model_id === id)
      : [];
  for (const m of all) push(m);
  return out;
}

/**
 * A handle to another widget's model that works in both contexts and hides the
 * multi-proxy / late-registration hazards. Writes fan out to every matching
 * proxy; reads/subscriptions re-resolve lazily so late-arriving proxies are
 * picked up.
 */
export interface ModelHandle {
  /** All currently-resolvable underlying models (re-evaluated on each access). */
  readonly models: AnyModel[];
  /** Read a field from the first resolvable model. */
  get(field: string): unknown;
  /** Write a field to every matching proxy. */
  set(field: string, value: unknown): void;
  /** Write a (possibly dotted) path to every matching proxy. */
  setByPath(path: string, value: unknown): void;
  /** `save_changes()` on every matching proxy (no-op statically). */
  save(): void;
  /** Subscribe a trait-change handler on every currently-resolvable model. */
  on(field: string, fn: (value: unknown) => void): void;
}

function makeHandle(getModels: () => AnyModel[]): ModelHandle {
  return {
    get models() {
      return getModels();
    },
    get(field) {
      const ms = getModels();
      return ms.length ? ms[0].get(field) : undefined;
    },
    set(field, value) {
      for (const m of getModels()) m.set(field, value);
    },
    setByPath(path, value) {
      for (const m of getModels()) setByPath(m, path, value);
    },
    save() {
      for (const m of getModels()) safeSaveChanges(m);
    },
    on(field, fn) {
      for (const m of getModels()) m.on?.(`change:${field}`, () => fn(m.get(field)));
    },
  };
}

/**
 * Resolve another widget by id into a {@link ModelHandle}, unifying the
 * live-kernel and static-export lookups.
 *
 * - **Static export:** returns a handle over the per-page registry — `models`
 *   re-scans on every access, so writes fan out to all proxies and late
 *   registrations are picked up automatically.
 * - **Live kernel:** resolves the single canonical model via
 *   `widget_manager.get_model(id)` (awaiting up to `timeout` ms).
 *
 * @param model  The calling widget's own model (used to reach `widget_manager`).
 * @param ref    The target's `widget_id` / model id (an `IPY_MODEL_` prefix is stripped).
 */
export async function resolveModel(
  model: AnyModel,
  ref: string,
  { timeout = 5000 }: { timeout?: number } = {},
): Promise<ModelHandle> {
  const id = stripIpy(ref);
  const reg = getStaticRegistry();

  if (reg) {
    // Static export: lazy fan-out over all matching proxies.
    return makeHandle(() => findAllInRegistry(reg, id));
  }

  // Live kernel: resolve the canonical model once.
  if (model.widget_manager?.get_model) {
    const resolved = await withTimeout(model.widget_manager.get_model(id), timeout);
    let current: AnyModel | null = resolved ?? null;
    return makeHandle(() => (current ? [current!] : []));
    // (current is captured so a single resolve is reused across calls.)
  }

  throw new Error(`[manywidgets] cannot resolve model "${id}": no host registry and no widget_manager`);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

// ── Shadow-DOM-safe CSS injection ────────────────────────────────────────────

/**
 * Inject a `<style>` block into the nearest shadow root (or document head),
 * keyed so repeated mounts don't duplicate it.
 *
 * Most widgets should just use the `_css` trait (the plugin inlines it). This
 * is the escape hatch for libraries that inject CSS at runtime: appending such
 * styles into `el` is unsafe because a destructive re-mount would wipe them.
 */
export function ensureShadowCss(el: HTMLElement, cssText: string, key: string): void {
  const root: Document | ShadowRoot =
    (el.getRootNode() as ShadowRoot | Document) ?? document;
  const container: ParentNode & { querySelector: ParentNode["querySelector"] } =
    "head" in root && (root as Document).head ? (root as Document).head : (root as ShadowRoot);
  const attr = "data-manywidgets-css";
  const existing = container.querySelector(`style[${attr}="${key}"]`);
  if (existing) return;
  const style = document.createElement("style");
  style.setAttribute(attr, key);
  style.textContent = cssText;
  container.appendChild(style);
}
