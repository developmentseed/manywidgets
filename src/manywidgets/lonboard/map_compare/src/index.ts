import type { RenderProps } from "@anywidget/types";
import {
  asNumber,
  idOf,
  type ModelHandle,
  type RenderArgs,
  renderChild,
  resolveModel,
  safeSaveChanges,
} from "@manywidgets/core";

interface MapCompareModel {
  before: unknown;
  after: unknown;
  position: number;
  orientation: string;
  sync_views: boolean;
  height: string;
  initial_view: string;
}

const POLL_MS = 100;
const MAX_RUN_MS = 30 * 60 * 1000;

// View-state keys that define the camera. We compare only these (ignoring
// maxZoom/minZoom/transition* and any extra serialized keys) so the loop guard
// is robust to float noise and harmless metadata differences.
const CAMERA_KEYS = ["longitude", "latitude", "zoom", "pitch", "bearing"] as const;
const EPS: Record<string, number> = {
  longitude: 1e-9,
  latitude: 1e-9,
  zoom: 1e-6,
  pitch: 1e-6,
  bearing: 1e-6,
};

type ViewState = Record<string, unknown> | null | undefined;

function viewEqual(a: ViewState, b: ViewState): boolean {
  if (a == null || b == null) return a == null && b == null;
  for (const k of CAMERA_KEYS) {
    const av = a[k];
    const bv = b[k];
    const an = typeof av === "number" ? av : av == null ? NaN : Number(av);
    const bn = typeof bv === "number" ? bv : bv == null ? NaN : Number(bv);
    if (Number.isNaN(an) && Number.isNaN(bn)) continue; // both unset → equal
    if (Number.isNaN(an) !== Number.isNaN(bn)) return false;
    if (Math.abs(an - bn) > (EPS[k] ?? 1e-9)) return false;
  }
  return true;
}

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

async function render(args: RenderProps<MapCompareModel>): Promise<() => void> {
  const { model, el } = args;
  el.className = "manywidgets-mapcompare";

  const container = document.createElement("div");
  container.className = "manywidgets-mapcompare__container";
  container.style.height = String(model.get("height") || "500px");

  // before = top (clipped), after = bottom (revealed underneath).
  const bottomCell = document.createElement("div");
  bottomCell.className = "mc__map mc__map--bottom";
  const topCell = document.createElement("div");
  topCell.className = "mc__map mc__map--top";
  const handle = document.createElement("div");
  handle.className = "mc__handle";
  handle.setAttribute("role", "separator");
  handle.setAttribute("aria-label", "Drag to compare maps");

  container.append(bottomCell, topCell, handle);
  el.appendChild(container);

  const cleanups: Array<() => void> = [];

  // ── mount the two maps ────────────────────────────────────────────────────
  cleanups.push(await renderChild(args as unknown as RenderArgs, model.get("before") as string, topCell));
  cleanups.push(await renderChild(args as unknown as RenderArgs, model.get("after") as string, bottomCell));

  // ── swipe clip + handle ───────────────────────────────────────────────────
  function isVertical(): boolean {
    return (String(model.get("orientation") || "vertical")) !== "horizontal";
  }

  function applyClip(): void {
    const p = clamp01(asNumber(model.get("position"), 0.5));
    const pct = (1 - p) * 100;
    if (isVertical()) {
      // reveal the LEFT fraction p of the top map; handle is a vertical bar.
      topCell.style.clipPath = `inset(0 ${pct}% 0 0)`;
      handle.style.left = `${p * 100}%`;
      handle.style.top = "0";
      handle.classList.remove("mc__handle--horizontal");
    } else {
      // reveal the TOP fraction p of the top map; handle is a horizontal bar.
      topCell.style.clipPath = `inset(0 0 ${pct}% 0)`;
      handle.style.top = `${p * 100}%`;
      handle.style.left = "0";
      handle.classList.add("mc__handle--horizontal");
    }
  }

  function positionFromEvent(ev: PointerEvent): number {
    const rect = container.getBoundingClientRect();
    if (isVertical()) {
      return rect.width ? clamp01((ev.clientX - rect.left) / rect.width) : 0.5;
    }
    return rect.height ? clamp01((ev.clientY - rect.top) / rect.height) : 0.5;
  }

  let dragging = false;
  function onPointerDown(ev: PointerEvent): void {
    ev.preventDefault();
    dragging = true;
    handle.setPointerCapture?.(ev.pointerId); // unavailable under jsdom; harmless
    handle.classList.add("mc__handle--dragging");
  }
  function onPointerMove(ev: PointerEvent): void {
    if (!dragging) return;
    model.set("position", positionFromEvent(ev));
    applyClip();
  }
  function onPointerUp(ev: PointerEvent): void {
    if (!dragging) return;
    dragging = false;
    handle.releasePointerCapture?.(ev.pointerId);
    handle.classList.remove("mc__handle--dragging");
    safeSaveChanges(model); // persist the final position (no-op statically)
  }

  handle.addEventListener("pointerdown", onPointerDown);
  handle.addEventListener("pointermove", onPointerMove);
  handle.addEventListener("pointerup", onPointerUp);

  applyClip();
  model.on("change:position", applyClip);
  model.on("change:orientation", applyClip);

  // ── camera sync (JS proxy-to-proxy; lonboard writes view_state on pan/zoom) ─
  let stopSync: (() => void) | null = null;
  if (model.get("sync_views") !== false) {
    try {
      const [beforeH, afterH] = await Promise.all([
        resolveModel(model, idOf(model.get("before"))),
        resolveModel(model, idOf(model.get("after"))),
      ]);
      stopSync = startViewSync(beforeH, afterH, model.get("initial_view") === "after");
    } catch (err) {
      console.warn("[manywidgets:map-compare] view sync disabled:", err);
    }
  }

  return () => {
    stopSync?.();
    cleanups.forEach((d) => d());
  };
}

/**
 * Keep two maps' cameras locked together. Returns a stop function.
 *
 * Guards against the A→B→A feedback loop two ways:
 *   1. a synchronous `syncing` re-entrancy flag (the peer's `model.set` fires
 *      `change:view_state` synchronously and re-enters `mirror`, which is
 *      suppressed while the flag is set), and
 *   2. an epsilon value-equality check against the last value applied to each
 *      side (kills float ping-pong and any async echo).
 *
 * `.on` listeners give low-latency sync in a live kernel; a 100 ms change-
 * detection poll covers static export (where `.on` may bind before the map
 * proxies register) and self-heals — it works in BOTH directions by mirroring
 * from whichever side changed since the last tick.
 */
function startViewSync(
  beforeH: ModelHandle,
  afterH: ModelHandle,
  initialFromAfter: boolean,
): () => void {
  let syncing = false;
  const last = new WeakMap<object, ViewState>();

  const lastOf = (h: ModelHandle): ViewState => {
    const m = h.models[0];
    return m ? last.get(m) : undefined;
  };
  const markSeen = (h: ModelHandle, v: ViewState): void => {
    for (const m of h.models) last.set(m, v);
  };

  function mirror(src: ModelHandle, dst: ModelHandle): void {
    if (syncing) return;
    const v = src.get("view_state") as ViewState;
    if (v == null) return;
    if (viewEqual(v, lastOf(dst))) {
      markSeen(src, v); // record we've seen this source value (poll bookkeeping)
      return;
    }
    syncing = true;
    try {
      dst.set("view_state", v);
      dst.save();
      markSeen(dst, v);
      markSeen(src, v);
    } finally {
      syncing = false;
    }
  }

  // Immediate path (live kernel): mirror as soon as either side changes.
  beforeH.on("view_state", () => mirror(beforeH, afterH));
  afterH.on("view_state", () => mirror(afterH, beforeH));

  // Initial alignment, respecting initial_view.
  if (initialFromAfter) mirror(afterH, beforeH);
  else mirror(beforeH, afterH);

  // Poll: pick up late proxies (static export) + self-heal, bidirectional.
  const stopAt = Date.now() + MAX_RUN_MS;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const tick = (): void => {
    try {
      const vb = beforeH.get("view_state") as ViewState;
      const va = afterH.get("view_state") as ViewState;
      if (vb != null && !viewEqual(vb, lastOf(beforeH))) {
        mirror(beforeH, afterH);
      } else if (va != null && !viewEqual(va, lastOf(afterH))) {
        mirror(afterH, beforeH);
      }
    } catch (err) {
      console.warn("[manywidgets:map-compare] sync tick error", err);
    }
    if (Date.now() < stopAt) timer = setTimeout(tick, POLL_MS);
  };
  timer = setTimeout(tick, POLL_MS);

  return () => {
    if (timer) clearTimeout(timer);
  };
}

export default { render };
