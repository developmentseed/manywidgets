// Shared JS test utilities for widget unit tests (vitest + jsdom).
//
// The default `fakeModel` is intentionally STRICTER than the static-export
// emitter: its `on`/`off` match event names EXACTLY and do NOT split
// space-separated names. (The real static-export emitter and Backbone both DO
// split — so `on("change:a change:b", fn)` works in production.) Keeping the
// fake non-splitting is a deliberate style guard: a regression to
// `model.on("change:a change:b", fn)` never fires here, so the widget's own test
// fails and we keep authoring one listener per trait. Use `liveModel` for the
// rare test that needs Backbone-style space-separated `on`.

export interface FakeModel {
  model_id?: string;
  widget_manager?: {
    get_model?: (id: string) => Promise<unknown>;
    create_view?: (model: unknown) => Promise<{ el: HTMLElement; remove?: () => void }>;
  };
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  on(event: string, fn: (...a: unknown[]) => void): void;
  off(event: string, fn: (...a: unknown[]) => void): void;
  /** Live (Backbone) model only: fire an event with args. */
  trigger?(event: string, ...args: unknown[]): void;
  /** Static-export proxy only: deliver an inbound custom message. */
  receiveCustomMessage?(content: unknown, buffers?: unknown[]): void;
  save_changes(): void;
  /** number of save_changes() calls (test introspection) */
  readonly saved: number;
  /** registered listener count for an exact event name (test introspection) */
  listenerCount(event: string): number;
}

export interface FakeModelOptions {
  /** Split space-separated event names in on/off (live Backbone). Default false. */
  splitEvents?: boolean;
  widget_manager?: {
    get_model?: (id: string) => Promise<unknown>;
    create_view?: (model: unknown) => Promise<{ el: HTMLElement; remove?: () => void }>;
  };
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
  const dispatch = (event: string, ...args: unknown[]) => {
    for (const e of split(event)) {
      const set = listeners.get(e);
      if (set) for (const fn of [...set]) fn(...args);
    }
  };

  // Mirror reality: the live (Backbone) model fires events via `trigger`, while
  // the static-export proxy exposes `receiveCustomMessage` (the comm mock). Only
  // one is present so each delivery path in `deliverCustomMessage` is exercised.
  const comm = opts.splitEvents
    ? { trigger: dispatch }
    : {
        receiveCustomMessage: (content: unknown, buffers?: unknown[]) =>
          dispatch("msg:custom", content, buffers),
      };

  return {
    model_id: opts.model_id,
    widget_manager: opts.widget_manager,
    get: (key) => data[key],
    set(key, value) {
      data[key] = value;
      dispatch(`change:${key}`);
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
    ...comm,
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

// ── Static-export host (for renderChild / layout tests) ──────────────────────

export interface FakeHost {
  renderChild(ref: string, el: HTMLElement): Promise<() => void>;
  /** refs passed to renderChild, in call order. */
  readonly mounted: string[];
  /** number of dispose() calls made on returned cleanups. */
  readonly disposed: number;
}

/**
 * A fake static-export `host` whose `renderChild` writes a `[ref]` marker into
 * the target element (with `data-child=<ref>`) and returns a dispose spy. Lets
 * layout-widget tests assert child order, placement, and cleanup without a real
 * plugin runtime.
 */
export function fakeHost(): FakeHost {
  const mounted: string[] = [];
  let disposed = 0;
  return {
    mounted,
    get disposed() {
      return disposed;
    },
    async renderChild(ref, el) {
      mounted.push(ref);
      el.setAttribute("data-child", ref);
      el.textContent = `[${ref}]`;
      return () => {
        disposed += 1;
      };
    },
  };
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
