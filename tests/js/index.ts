// Shared JS test utilities for widget unit tests (vitest + jsdom).
//
// The default `fakeModel` deliberately mimics the STATIC-EXPORT emitter: its
// `on`/`off` match event names EXACTLY and do NOT split space-separated names.
// So if a widget regresses to `model.on("change:a change:b", fn)`, its listener
// never fires here and the widget's own test fails — the unit tests double as a
// guard for the static-export "one listener per trait" rule. Use `liveModel`
// for the rare test that needs Backbone-style space-separated `on`.

export interface FakeModel {
  model_id?: string;
  widget_manager?: { get_model?: (id: string) => Promise<unknown> };
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  on(event: string, fn: (...a: unknown[]) => void): void;
  off(event: string, fn: (...a: unknown[]) => void): void;
  save_changes(): void;
  /** number of save_changes() calls (test introspection) */
  readonly saved: number;
  /** registered listener count for an exact event name (test introspection) */
  listenerCount(event: string): number;
}

export interface FakeModelOptions {
  /** Split space-separated event names in on/off (live Backbone). Default false. */
  splitEvents?: boolean;
  widget_manager?: { get_model?: (id: string) => Promise<unknown> };
  model_id?: string;
}

export function fakeModel(
  state: Record<string, unknown> = {},
  opts: FakeModelOptions = {},
): FakeModel {
  const data: Record<string, unknown> = { ...state };
  const listeners = new Map<string, Set<(...a: unknown[]) => void>>();
  let savedCount = 0;
  const split = (event: string) =>
    opts.splitEvents ? event.split(/\s+/).filter(Boolean) : [event];

  return {
    model_id: opts.model_id,
    widget_manager: opts.widget_manager,
    get: (key) => data[key],
    set(key, value) {
      data[key] = value;
      const set = listeners.get(`change:${key}`);
      if (set) for (const fn of [...set]) fn();
    },
    on(event, fn) {
      for (const e of split(event)) {
        if (!listeners.has(e)) listeners.set(e, new Set());
        listeners.get(e)!.add(fn);
      }
    },
    off(event, fn) {
      for (const e of split(event)) listeners.get(e)?.delete(fn);
    },
    save_changes() {
      savedCount += 1;
    },
    get saved() {
      return savedCount;
    },
    listenerCount: (event) => listeners.get(event)?.size ?? 0,
  };
}

/** Backbone-style model (space-separated event names split). */
export const liveModel = (
  state: Record<string, unknown> = {},
  opts: FakeModelOptions = {},
): FakeModel => fakeModel(state, { ...opts, splitEvents: true });

/** A fresh jsdom mount element. */
export function mountEl(): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

// ── Static-export host registry (for resolveModel tests) ─────────────────────

/**
 * Install a fake `window.__myst_anywidget_hosts` registry over the given models,
 * keyed by `widget_id` (root widgets) and `model_id` (sub-model proxies), so
 * core's `resolveModel` static path can find them. Returns a cleanup function.
 */
export function installHostRegistry(models: FakeModel[]): () => void {
  const byKey = new Map<string, FakeModel>();
  for (const m of models) {
    const wid = m.get("widget_id");
    if (typeof wid === "string" && wid) byKey.set(wid, m);
    if (m.model_id) byKey.set(m.model_id, m);
  }
  const reg = {
    get: (key: string) => byKey.get(key),
    filter: (pred: (m: FakeModel) => boolean) => models.filter(pred),
    all: () => models.slice(),
  };
  (globalThis as Record<string, unknown>).__myst_anywidget_hosts = new Map([
    ["test", reg],
  ]);
  return () => {
    delete (globalThis as Record<string, unknown>).__myst_anywidget_hosts;
  };
}
