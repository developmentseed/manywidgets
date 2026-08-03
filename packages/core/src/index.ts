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
  /** Live (Backbone) model: fire an event locally. Used to deliver a custom
   *  message (`trigger("msg:custom", content, buffers)`) without a kernel. */
  trigger?: (event: string, ...args: unknown[]) => void;
  /** Static-export proxy: simulate an inbound kernel→frontend custom message by
   *  firing the model's `msg:custom` listeners locally. */
  receiveCustomMessage?: (content: unknown, buffers?: unknown[]) => void;
  widget_manager?: {
    get_model?: (id: string) => Promise<AnyModel>;
    create_view?: (model: AnyModel) => Promise<{ el: HTMLElement; remove?: () => void }>;
  };
  model_id?: string;
}

/** The static-export host injected into a widget's render args (`{model, el, host}`). */
export interface Host {
  renderChild?: (ref: string, el: HTMLElement) => Promise<(() => void) | void>;
}

/** A widget's render arguments — `host` is present only under static export. */
export interface RenderArgs {
  model: AnyModel;
  host?: Host;
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
 * Registers one listener per event. Both the live (Backbone) model and the
 * static-export emitter now accept space-separated event names in `on(...)`, so
 * `on("change:a change:b", fn)` works in either; this helper just keeps the
 * per-trait form explicit (and our test `fakeModel` enforces it as a style guard).
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

/**
 * Normalize a widget reference (from a `widget_serialization` trait) to a model id.
 * Static export gives an `IPY_MODEL_<id>` string; a live kernel may give a resolved
 * model object (use its `model_id`). Returns `""` if it can't be determined.
 */
export function idOf(ref: unknown): string {
  if (typeof ref === "string") return stripIpy(ref);
  const m = ref as { model_id?: string } | null | undefined;
  return m && typeof m.model_id === "string" ? m.model_id : "";
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

/**
 * Deliver a Jupyter "custom message" to a model's frontend `msg:custom`
 * listeners, locally and without a kernel.
 *
 * This lets a control widget drive another widget's comm-based behaviour (e.g.
 * lonboard's `Map.fly_to`, which reacts to `model.on("msg:custom", …)`) in both
 * contexts:
 *
 * - **Live kernel:** the target is a Backbone `WidgetModel`; `trigger("msg:custom",
 *   content, buffers)` fires its listeners — exactly what the comm layer does
 *   internally on a real kernel message, but with no round-trip.
 * - **Static export:** the target is a proxy whose `receiveCustomMessage` (added
 *   by myst-anywidget-static-export) fires the same listeners.
 *
 * Falls back to a no-op when neither path exists.
 */
export function deliverCustomMessage(
  model: AnyModel,
  content: unknown,
  buffers: unknown[] = [],
): void {
  if (typeof model.receiveCustomMessage === "function") {
    model.receiveCustomMessage(content, buffers); // static export
  } else if (typeof model.trigger === "function") {
    model.trigger("msg:custom", content, buffers); // live (Backbone)
  }
}

// Static-export host registry

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
  /** Deliver a custom message (`msg:custom`) to every matching proxy. */
  sendCustom(content: unknown, buffers?: unknown[]): void;
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
    sendCustom(content, buffers = []) {
      for (const m of getModels()) deliverCustomMessage(m, content, buffers);
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

// Child rendering for layout widgets

const noop = (): void => {};

/**
 * Render a referenced child widget into `el`, returning a dispose function.
 * The live-vs-static split lives here (mirroring {@link resolveModel}) so layout
 * widgets stay simple:
 *
 * - **Static export:** delegate to the plugin's `host.renderChild` (v0.2.0+),
 *   which loads the child's bundled `_esm`, injects its `_css`, and renders it.
 * - **Live kernel:** create a view via the widget manager and mount its element.
 *
 * @param args  The widget's render args (`{ model, host }`) — `host` is present
 *              only under static export.
 * @param ref   The child reference: an `IPY_MODEL_<id>` string (static) or a
 *              resolved child model (live).
 */
export async function renderChild(
  args: RenderArgs,
  ref: string | AnyModel,
  el: HTMLElement,
): Promise<() => void> {
  // Static export: the plugin host owns child loading + CSS + lifecycle.
  if (args.host && typeof args.host.renderChild === "function") {
    const dispose = await args.host.renderChild(ref as string, el);
    return typeof dispose === "function" ? dispose : noop;
  }

  // Live kernel: build a view through the widget manager and mount it.
  const wm = args.model.widget_manager;
  if (!wm || typeof wm.create_view !== "function") {
    throw new Error(
      "[manywidgets] renderChild needs a static host or a widget_manager with create_view",
    );
  }
  let child: AnyModel;
  if (typeof ref === "string") {
    if (!wm.get_model) throw new Error("[manywidgets] widget_manager has no get_model");
    child = await wm.get_model(stripIpy(ref));
  } else {
    child = ref;
  }
  const view = await wm.create_view(child);
  el.appendChild(view.el);
  return () => {
    try {
      view.remove?.();
    } catch {
      // best-effort teardown
    }
  };
}

// Theme variables

export type HostColorMode = "light" | "dark";

export const HOST_DARK_MODE_SELECTORS = [
  ".dark",
  ".dark-theme",
  "[data-theme='dark']",
  "[data-color-mode='dark']",
] as const;

export const HOST_LIGHT_MODE_SELECTORS = [
  ".light",
  ".light-theme",
  "[data-theme='light']",
  "[data-color-mode='light']",
] as const;

const THEME_DEFAULT_CSS = `
.manywidgets-theme-defaults {
  --mw-font-family: var(--jp-ui-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif);
  --mw-font-family-mono: var(--jp-code-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  --mw-font-size-sm: 12px;
  --mw-font-size-md: 14px;
  --mw-font-weight-strong: 600;
  --mw-color-text: var(--myst-color-text, var(--jp-content-font-color1, #24292e));
  --mw-color-text-muted: var(--myst-color-text-secondary, var(--jp-content-font-color2, #586069));
  --mw-color-surface: var(--myst-color-bg, var(--jp-layout-color1, #ffffff));
  --mw-color-surface-elevated: var(--myst-color-surface, var(--jp-layout-color2, #f6f8fa));
  --mw-color-border: var(--myst-color-border, var(--jp-border-color2, #e1e4e8));
  --mw-color-border-strong: var(--myst-color-border-strong, var(--jp-border-color1, #d0d7de));
  --mw-color-accent: var(--myst-color-primary, var(--jp-brand-color1, #0366d6));
  --mw-color-accent-hover: var(--myst-color-primary-hover, var(--jp-brand-color0, #0256c7));
  --mw-color-accent-soft: var(--myst-color-active-bg, #ddf4ff);
  --mw-color-on-accent: #ffffff;
  --mw-color-code-bg: var(--myst-color-bg-secondary, var(--jp-layout-color2, #f6f8fa));
  --mw-color-positive: var(--myst-color-success, #1a7f37);
  --mw-color-negative: var(--myst-color-danger, #cf222e);
  --mw-color-warning: var(--myst-color-warning, #9a6700);
  --mw-color-info: var(--myst-color-info, var(--mw-color-accent));
  --mw-color-focus: var(--myst-color-focus-ring, var(--mw-color-accent));
  --mw-radius-2: 4px;
  --mw-radius-3: 6px;
  --mw-radius-4: 8px;
  --mw-radius-5: 10px;
  --mw-radius-thumb: 9999px;
  --mw-shadow-1: 0 1px 2px rgba(0, 0, 0, 0.25);
  --mw-shadow-2: 0 0 0 1px rgba(0, 0, 0, 0.1);
  --mw-control-padding-x: 14px;
  --mw-control-padding-y: 10px;
  --mw-control-gap: 6px;
  --mw-control-max-width: 320px;
  --mw-control-radius: var(--mw-radius-4);
  --mw-input-padding-x: 8px;
  --mw-input-padding-y: 6px;
  --mw-input-radius: var(--mw-radius-3);
  --mw-panel-padding-x: 18px;
  --mw-panel-padding-y: 14px;
  --mw-panel-radius: var(--mw-radius-5);
  --mw-stat-min-width: 140px;
  --mw-stat-value-size: 30px;
  --mw-number-display-value-size: 40px;
  --mw-toggle-track-width: 40px;
  --mw-toggle-track-height: 22px;
  --mw-toggle-thumb-size: 18px;
  --mw-cursor-button: pointer;
  --mw-cursor-slider-thumb: default;
}

.manywidgets-theme-defaults[data-mw-color-mode="dark"] {
  --mw-color-text: var(--myst-color-text, var(--jp-content-font-color1, #f0f6fc));
  --mw-color-text-muted: var(--myst-color-text-secondary, var(--jp-content-font-color2, #8b949e));
  --mw-color-surface: var(--myst-color-bg, var(--jp-layout-color1, #111113));
  --mw-color-surface-elevated: var(--myst-color-surface, var(--jp-layout-color2, #18191b));
  --mw-color-border: var(--myst-color-border, var(--jp-border-color2, #3a3f44));
  --mw-color-border-strong: var(--myst-color-border-strong, var(--jp-border-color1, #4d5358));
  --mw-color-accent: var(--myst-color-primary, var(--jp-brand-color1, #6b9cff));
  --mw-color-accent-hover: var(--myst-color-primary-hover, var(--jp-brand-color0, #8bb3ff));
  --mw-color-accent-soft: var(--myst-color-active-bg, #1d2d50);
  --mw-color-code-bg: var(--myst-color-bg-secondary, var(--jp-layout-color2, #1f2328));
  --mw-color-positive: var(--myst-color-success, #7ee787);
  --mw-color-negative: var(--myst-color-danger, #ff7b72);
  --mw-color-warning: var(--myst-color-warning, #f2cc60);
  --mw-shadow-1: 0 1px 2px rgba(0, 0, 0, 0.5);
  --mw-shadow-2: 0 0 0 1px rgba(255, 255, 255, 0.12);
}
`;

function readThemeVars(model: AnyModel): Record<string, unknown> {
  const vars = model.get("theme_vars");
  return vars && typeof vars === "object" ? vars as Record<string, unknown> : {};
}

function colorModeFromThemeVars(vars: Record<string, unknown>): HostColorMode | null {
  const mode = vars["--mw-color-mode"];
  if (typeof mode !== "string") return null;
  const normalized = mode.trim().toLowerCase();
  if (normalized === "dark" || normalized === "light") return normalized;
  return null;
}

function elementHasSelector(el: Element, selectors: readonly string[]): boolean {
  return selectors.some((selector) => el.matches(selector) || !!el.closest(selector));
}

function hasThemeAncestor(el: HTMLElement): boolean {
  if (el.parentElement?.closest(".manywidgets-theme")) return true;
  const root = el.getRootNode();
  const host = typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? root.host : null;
  return !!host?.closest(".manywidgets-theme");
}

/**
 * Detect the host page's current color mode.
 *
 * MyST's default themes expose dark mode through Tailwind's `.dark` class.
 * The extra selectors cover common class/data-attribute host conventions so
 * widgets can share one detection path in notebooks and static exports.
 */
export function detectHostColorMode(el: HTMLElement): HostColorMode | null {
  const doc = el.ownerDocument;
  const root = el.getRootNode();
  const host = typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? root.host : null;
  const candidates = [el, host, doc.body, doc.documentElement].filter(
    (candidate): candidate is Element => candidate instanceof Element,
  );

  if (candidates.some((candidate) => elementHasSelector(candidate, HOST_DARK_MODE_SELECTORS))) {
    return "dark";
  }
  if (candidates.some((candidate) => elementHasSelector(candidate, HOST_LIGHT_MODE_SELECTORS))) {
    return "light";
  }

  const colorScheme = [el, doc.documentElement]
    .map((candidate) => getComputedStyle(candidate).colorScheme)
    .find((value) => value && value !== "normal") || "";
  const schemes = colorScheme.split(/\s+/);
  if (schemes.includes("dark") && !schemes.includes("light")) return "dark";
  if (schemes.includes("light") && !schemes.includes("dark")) return "light";
  return null;
}

export function observeHostColorMode(el: HTMLElement, fn: () => void): () => void {
  const doc = el.ownerDocument;
  const root = el.getRootNode();
  const host = typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? root.host : null;
  const targets = [host, doc.body, doc.documentElement].filter(
    (target): target is Element => target instanceof Element,
  );
  const observer = typeof MutationObserver !== "undefined"
    ? new MutationObserver(fn)
    : null;
  for (const target of targets) {
    observer?.observe(target, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-color-mode", "style"],
    });
  }

  const media = typeof globalThis.matchMedia === "function"
    ? globalThis.matchMedia("(prefers-color-scheme: dark)")
    : null;
  media?.addEventListener?.("change", fn);

  return () => {
    observer?.disconnect();
    media?.removeEventListener?.("change", fn);
  };
}

/**
 * Apply a widget's `theme_vars` trait as inline manywidgets CSS custom
 * properties on `el`.
 *
 * The Python side resolves `theme=` and `style=` to a flat `{ "--mw-*": value }`
 * dict. This helper intentionally stays dumb: set each manywidgets-owned var,
 * clear vars that disappeared and ignore any non-`--mw-*` key. Vars set here
 * cascade to descendants, so a themed layout can theme nested widgets once
 * individual widgets opt into this helper.
 */
export function applyThemeVars(el: HTMLElement, model: AnyModel): () => void {
  let applied: string[] = [];
  ensureShadowCss(el, THEME_DEFAULT_CSS, "manywidgets-theme-defaults");
  el.classList.add("manywidgets-theme");
  if (!hasThemeAncestor(el)) el.classList.add("manywidgets-theme-defaults");

  const apply = () => {
    const vars = readThemeVars(model);
    const next = Object.keys(vars).filter((k) => k.startsWith("--mw-"));
    for (const key of applied) {
      if (!next.includes(key)) el.style.removeProperty(key);
    }
    for (const key of next) {
      el.style.setProperty(key, String(vars[key]));
    }
    applied = next;
    applyColorMode();
  };

  const applyColorMode = () => {
    const mode = colorModeFromThemeVars(readThemeVars(model)) ?? detectHostColorMode(el);
    if (mode) {
      el.dataset.mwColorMode = mode;
    } else {
      delete el.dataset.mwColorMode;
    }
  };

  apply();
  const offTheme = onChange(model, "theme_vars", apply);
  const offHost = observeHostColorMode(el, applyColorMode);
  return () => {
    offTheme();
    offHost();
  };
}

// Shadow-DOM-safe CSS injection

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

// Non-DOM renderer theme resolution. A canvas/WebGL widget never reads CSS,
// so it resolves the --mw-* values it needs into plain JS. Core only provides
// the primitives below; see chart/src/theme.ts for how one widget uses them.

/**
 * Resolve a `--mw-*` custom property to its used value.
 *
 * A direct `getComputedStyle(el).getPropertyValue(varName)` leaves nested
 * `var()` references unsubstituted, so tokens like `--mw-color-text` that
 * fall back through `--myst-*`/`--jp-*` chains come back unresolved.
 * Assigning the same expression to a real CSS property forces the browser to
 * resolve it. See
 * https://css-tricks.com/making-sense-of-custom-properties-runtime-values/.
 *
 * One hidden probe per `(el, cssProperty)` is created once and reused,
 * instead of inserted and removed on every call.
 */
function getProbe(el: HTMLElement, cssProperty: string): HTMLElement {
  const attr = `data-mw-probe-${cssProperty}`;
  const existing = el.querySelector<HTMLElement>(`:scope > [${attr}]`);
  if (existing) return existing;
  const probe = document.createElement("span");
  probe.style.cssText = "display:none;";
  probe.setAttribute(attr, "");
  el.appendChild(probe);
  return probe;
}

function resolveCssVar(el: HTMLElement, cssProperty: string, varExpression: string, fallback: string): string {
  const probe = getProbe(el, cssProperty);
  probe.style.setProperty(cssProperty, `var(${varExpression}, ${fallback})`);
  const value = getComputedStyle(probe).getPropertyValue(cssProperty).trim();
  // Environments with no CSS custom-property support in getComputedStyle
  // (notably jsdom) hand the var() expression back verbatim.
  return value && !value.includes("var(") ? value : fallback;
}

/** Resolve a `--mw-*` token as a used color (e.g. `--mw-color-text`). */
export function resolveThemeColor(el: HTMLElement, varName: string, fallback: string): string {
  return resolveCssVar(el, "color", varName, fallback);
}

/** Resolve a `--mw-*` token as a used font family. */
export function resolveThemeFontFamily(el: HTMLElement, varName: string, fallback: string): string {
  return resolveCssVar(el, "font-family", varName, fallback);
}

/** Resolve a `--mw-*` token as a used font weight (e.g. `600`, `"bold"`). */
export function resolveThemeFontWeight(el: HTMLElement, varName: string, fallback: string): string {
  return resolveCssVar(el, "font-weight", varName, fallback);
}

/** Resolve a `--mw-*` font-size token to its used pixel value. */
export function resolveThemeFontSize(el: HTMLElement, varName: string, fallback: number): number {
  const n = Number.parseFloat(resolveCssVar(el, "font-size", varName, `${fallback}px`));
  return Number.isFinite(n) ? n : fallback;
}

export interface ResolveThemePaletteOptions {
  /** Used for every entry the cascade doesn't override. Required, core has no default palette. */
  fallback: string[];
  /** Custom property naming the palette length. Defaults to `--mw-palette-size`. */
  sizeVar?: string;
  /** Maps a 1-based index to its custom property name. Defaults to `--mw-palette-{i}`. */
  colorVar?: (index: number) => string;
}

/**
 * Resolve an indexed categorical palette (by default `--mw-palette-1`,
 * `--mw-palette-2`, and so on, sized by `--mw-palette-size`) into a plain
 * array. Reads the custom properties directly, unlike {@link
 * resolveThemeColor}, since `Theme.to_vars()` only ever writes literal
 * colors here.
 */
export function resolveThemePalette(el: HTMLElement, options: ResolveThemePaletteOptions): string[] {
  const { fallback, sizeVar = "--mw-palette-size", colorVar = (i: number) => `--mw-palette-${i}` } = options;
  const computed = getComputedStyle(el);
  const size = Number.parseInt(computed.getPropertyValue(sizeVar).trim(), 10);
  const count = Number.isFinite(size) && size > 0 ? size : fallback.length;
  const palette: string[] = [];
  for (let i = 1; i <= count; i++) {
    const literal = computed.getPropertyValue(colorVar(i)).trim();
    palette.push(literal || fallback[(i - 1) % fallback.length]);
  }
  return palette;
}

type ThemeFieldResolver<T> = (el: HTMLElement) => T;

/** Turn a `{ field: (el) => value }` map into a single `(el) => theme` function. */
export function defineThemeReader<T extends object>(
  resolvers: { [K in keyof T]: ThemeFieldResolver<T[K]> },
): (el: HTMLElement) => T {
  const entries = Object.entries(resolvers) as [keyof T, ThemeFieldResolver<T[keyof T]>][];
  return (el: HTMLElement): T => {
    const theme = {} as T;
    for (const [field, resolve] of entries) {
      theme[field] = resolve(el);
    }
    return theme;
  };
}
