import type { RenderProps } from "@anywidget/types";
import {
  applyThemeVars,
  idOf,
  type RenderArgs,
  renderChild,
  safeSaveChanges,
} from "@manywidgets/core";

interface FullscreenModel {
  child: unknown;
  fullscreen: unknown;
  is_open: boolean;
  widget_id: string;
}

// Page-global claim flag so a bare `?fullscreen` / `?fullscreen=true` URL opens
// only the FIRST Fullscreen widget that renders, not every one on the page.
const URL_CLAIM = "__mw_fullscreen_url_claimed";

async function render(args: RenderProps<FullscreenModel>): Promise<() => void> {
  const { model, el } = args;
  el.className = "manywidgets-fullscreen";
  const disposeTheme = applyThemeVars(el, model);

  const inlineWrap = document.createElement("div");
  inlineWrap.className = "mwfs__inline";
  const slot = document.createElement("div");
  slot.className = "mwfs__slot";
  const expandBtn = document.createElement("button");
  expandBtn.type = "button";
  expandBtn.className = "mwfs__expand";
  expandBtn.textContent = "⛶";
  expandBtn.setAttribute("aria-label", "Enter fullscreen");
  inlineWrap.append(slot, expandBtn);

  const overlay = document.createElement("div");
  overlay.className = "mwfs__overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "mwfs__close";
  closeBtn.textContent = "✕";
  closeBtn.setAttribute("aria-label", "Close fullscreen");
  const content = document.createElement("div");
  content.className = "mwfs__content";
  overlay.append(closeBtn, content);

  el.append(inlineWrap, overlay);

  const disposeChild = model.get("child")
    ? await renderChild(args as unknown as RenderArgs, model.get("child") as string, slot)
    : (): void => {};

  // Lazy, memoised mount of the alternate fullscreen layout: mounted on first
  // open, kept afterwards. The memoised promise means a fast open/close/open
  // can never double-mount.
  let disposeAlt: (() => void) | null = null;
  let altMount: Promise<void> | null = null;
  const hasAlt = (): boolean => !!idOf(model.get("fullscreen"));
  const ensureAlt = (): Promise<void> =>
    (altMount ??= renderChild(
      args as unknown as RenderArgs,
      model.get("fullscreen") as string,
      content,
    ).then(
      (d) => {
        disposeAlt = d;
      },
      (err) => {
        altMount = null; // let a later open retry instead of caching the failure
        console.warn("[manywidgets:fullscreen] fullscreen layout failed to render:", err);
      },
    ));

  const doc = el.ownerDocument;
  const win = doc.defaultView ?? window;

  // Deep-linking is static-export only: in a live kernel (JupyterLab, VS Code)
  // the page URL is the notebook's and must not be touched.
  const isStatic = !!(args as unknown as RenderArgs).host;
  const widgetId = String(model.get("widget_id") || "");

  const reflectUrl = (isOpen: boolean): void => {
    if (!isStatic || !widgetId) return;
    try {
      const url = new URL(win.location.href);
      if (isOpen) url.searchParams.set("fullscreen", widgetId);
      else url.searchParams.delete("fullscreen");
      const prevBase = doc.baseURI;
      // replaceState, not pushState: no history spam, no popstate handling.
      win.history.replaceState(win.history.state, "", url.toString());
      // The static-export host keys its per-page widget registry by
      // document.baseURI, which replaceState just changed — alias the existing
      // registry under the new key or every later child mount / cross-widget
      // lookup on this page would start from an empty registry and time out.
      const hosts = (globalThis as { __myst_anywidget_hosts?: Map<string, unknown> })
        .__myst_anywidget_hosts;
      const nextBase = doc.baseURI;
      if (hosts && nextBase !== prevBase && hosts.has(prevBase) && !hosts.has(nextBase)) {
        hosts.set(nextBase, hosts.get(prevBase));
      }
    } catch {
      // Sandboxed iframes can forbid history access.
    }
  };

  // Size-caching children (deck.gl/lonboard; Chart.js self-heals anyway via
  // responsive:true) re-measure after the overlay lays out.
  const kickResize = (): void => {
    if (win.requestAnimationFrame) {
      win.requestAnimationFrame(() => win.dispatchEvent(new Event("resize")));
    } else {
      win.dispatchEvent(new Event("resize"));
    }
  };

  function onKeydown(ev: KeyboardEvent): void {
    if (ev.key === "Escape") setOpen(false);
  }

  // Idempotent, trait-driven state machine: buttons/Esc only write the trait;
  // this single change:is_open listener does all DOM work, so Python-driven and
  // click-driven opens share one code path.
  // reflectReady stays false through the initial sync: a widget exported with
  // is_open=True must open on load WITHOUT rewriting the page URL — only
  // toggles after render (clicks, deep link, kernel writes) touch the URL.
  let reflectReady = false;
  let isOpen = false;
  function sync(): void {
    const want = !!model.get("is_open");
    if (want === isOpen) return;
    isOpen = want;
    el.classList.toggle("mwfs--open", want);
    if (reflectReady) reflectUrl(want);
    if (want) {
      // With no alternate layout, re-parent the live inline DOM instead of
      // re-rendering: renderChild has no remount primitive, and moving the
      // node preserves canvas/WebGL state.
      if (hasAlt()) void ensureAlt();
      else content.appendChild(slot);
      doc.addEventListener("keydown", onKeydown);
    } else {
      if (!hasAlt()) inlineWrap.insertBefore(slot, expandBtn);
      doc.removeEventListener("keydown", onKeydown);
    }
    kickResize();
  }

  function setOpen(value: boolean): void {
    model.set("is_open", value);
    safeSaveChanges(model);
  }

  expandBtn.addEventListener("click", () => setOpen(true));
  closeBtn.addEventListener("click", () => setOpen(false));
  model.on("change:is_open", sync);
  sync(); // honour is_open=True at construction time (no URL write)
  reflectReady = true;

  // Deep link: `?fullscreen=<widget_id>` opens this widget; a bare
  // `?fullscreen` / `?fullscreen=true` opens the page's first Fullscreen
  // widget. reflectUrl then normalizes the URL to the concrete widget_id, so
  // the address bar is always copyable as a deterministic link.
  if (isStatic) {
    let param: string | null = null;
    try {
      param = new URL(win.location.href).searchParams.get("fullscreen");
    } catch {
      // Unparseable location (unlikely) — no deep link.
    }
    if (param !== null && !model.get("is_open")) {
      const g = globalThis as Record<string, unknown>;
      if (param === widgetId && widgetId) {
        setOpen(true);
      } else if ((param === "" || param === "true") && !g[URL_CLAIM]) {
        g[URL_CLAIM] = true;
        setOpen(true);
      }
    }
  }

  return () => {
    doc.removeEventListener("keydown", onKeydown);
    model.off("change:is_open", sync);
    disposeTheme();
    disposeChild();
    disposeAlt?.();
    overlay.remove();
  };
}

export default { render };
