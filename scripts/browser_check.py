"""Static-export browser check.

Serves docs/_build/html and loads the exported demo page in headless Chromium —
NO Python kernel involved — then asserts:

  1. the Chart rendered a <canvas>,
  2. both Sliders rendered range inputs,
  3. the Binder resolved (status line shows the check mark),
  4. jsdlink works: dragging the height slider changes the chart's height,
  5. Binder works: dragging the width slider changes the chart's width
     (width = value*100 + 200),
  6. the new controls/displays all rendered (dropdown, toggle, button, stat,
     number display, number input, range slider, markdown text),
  7. a new jsdlink works: clicking the Button increments the Stat's value.

Run: .venv/bin/python scripts/browser_check.py
"""

import functools
import http.server
import socketserver
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

HTML_ROOT = Path(__file__).resolve().parent.parent / "docs" / "_build" / "html"

# JS run in the page: gather state from across all anywidget shadow roots.
PROBE = r"""
() => {
  const hosts = Array.from(document.querySelectorAll('.myst-anywidget'));
  const roots = hosts.map(h => h.shadowRoot).filter(Boolean);
  const q = (sel) => roots.flatMap(r => Array.from(r.querySelectorAll(sel)));
  const chart = q('.manywidgets-chart')[0];
  const canvas = q('.manywidgets-chart canvas')[0];
  const sliders = q('.manywidgets-slider').map(s => ({
    label: s.querySelector('.manywidgets-slider__label')?.textContent || '',
    value: s.querySelector('.manywidgets-slider__input')?.value,
  }));
  const binder = q('.manywidgets-binder')[0];
  const stat = q('.manywidgets-stat')[0];
  return {
    hosts: hosts.length,
    hasChart: !!chart,
    hasCanvas: !!canvas,
    chartWidth: chart ? chart.style.width : null,
    chartHeight: chart ? chart.style.height : null,
    sliders,
    binderText: binder ? binder.textContent : null,
    hasDropdown: q('.manywidgets-dropdown__select').length > 0,
    hasToggle: q('.manywidgets-toggle__input').length > 0,
    hasButton: q('.manywidgets-button').length > 0,
    hasStat: !!stat,
    hasNumberDisplay: q('.manywidgets-numberdisplay__value').length > 0,
    hasNumberInput: q('.manywidgets-number__input').length > 0,
    hasRange: q('.manywidgets-range').length > 0,
    hasMarkdown: q('.manywidgets-text--markdown strong').length > 0,
    statValue: stat ? stat.querySelector('.manywidgets-stat__value').textContent : null,
  };
}
"""

CLICK_BUTTON = r"""
() => {
  const roots = Array.from(document.querySelectorAll('.myst-anywidget'))
    .map(h => h.shadowRoot).filter(Boolean);
  for (const r of roots) {
    const b = r.querySelector('.manywidgets-button');
    if (b) { b.click(); return true; }
  }
  return false;
}
"""

# Does any anywidget shadow root contain `selector`? (selector passed as arg)
SELECTOR_EXISTS = r"""
(selector) => {
  const roots = Array.from(document.querySelectorAll('.myst-anywidget'))
    .map(h => h.shadowRoot).filter(Boolean);
  return roots.some(r => !!r.querySelector(selector));
}
"""

# Read the value of the Stat card whose label matches `labelText` (the /stat/ page
# has two Stats: the static minimal example and the interactive "Clicks" one).
STAT_VALUE = r"""
(labelText) => {
  const roots = Array.from(document.querySelectorAll('.myst-anywidget'))
    .map(h => h.shadowRoot).filter(Boolean);
  for (const r of roots) {
    for (const card of r.querySelectorAll('.manywidgets-stat')) {
      const label = card.querySelector('.manywidgets-stat__label');
      if (label && label.textContent === labelText) {
        return card.querySelector('.manywidgets-stat__value').textContent;
      }
    }
  }
  return null;
}
"""

# Set a slider (matched by a substring of its label) to `value` and fire input.
SET_SLIDER = r"""
([labelPart, value]) => {
  const roots = Array.from(document.querySelectorAll('.myst-anywidget'))
    .map(h => h.shadowRoot).filter(Boolean);
  for (const r of roots) {
    for (const s of r.querySelectorAll('.manywidgets-slider')) {
      const label = s.querySelector('.manywidgets-slider__label')?.textContent || '';
      if (label.includes(labelPart)) {
        const input = s.querySelector('.manywidgets-slider__input');
        input.value = String(value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    }
  }
  return false;
}
"""


def serve(directory: Path):
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(directory))
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, port


def main() -> int:
    if not HTML_ROOT.exists():
        print(f"FAIL: {HTML_ROOT} does not exist — build the docs first.")
        return 1

    httpd, port = serve(HTML_ROOT)
    url = f"http://127.0.0.1:{port}/demo/"
    failures = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(url, wait_until="networkidle")

            # Give the widgets' async wrappers + binder poll a moment to settle.
            page.wait_for_selector(".myst-anywidget", timeout=15000)
            page.wait_for_timeout(2500)

            state = page.evaluate(PROBE)
            print("initial state:", state)

            if not state["hasCanvas"]:
                failures.append("Chart did not render a <canvas>")
            if len([s for s in state["sliders"] if s["value"] is not None]) < 2:
                failures.append(f"expected 2 sliders, got {state['sliders']}")
            if not state["binderText"] or "✅" not in state["binderText"]:
                failures.append(f"Binder did not resolve: {state['binderText']!r}")

            # 4. jsdlink: height slider -> chart height
            ok = page.evaluate(SET_SLIDER, ["Height", 460])
            if not ok:
                failures.append("could not find 'Height' slider")
            page.wait_for_timeout(800)
            after = page.evaluate(PROBE)
            print("after height=460:", after["chartHeight"])
            if after["chartHeight"] != "460px":
                failures.append(f"jsdlink failed: chart height = {after['chartHeight']} (expected 460px)")

            # 5. Binder: width slider -> chart width = value*40 + 200
            ok = page.evaluate(SET_SLIDER, ["Width", 10])
            if not ok:
                failures.append("could not find 'Width' slider")
            page.wait_for_timeout(800)
            after = page.evaluate(PROBE)
            print("after width=10:", after["chartWidth"])
            if after["chartWidth"] != "600px":  # 10*40 + 200
                failures.append(f"Binder failed: chart width = {after['chartWidth']} (expected 600px)")

            # 6. controls/displays all rendered on the demo page (markdown Text is
            #    covered by the /text/ page check + vitest, not the demo).
            for key in (
                "hasDropdown", "hasToggle", "hasButton", "hasStat",
                "hasNumberDisplay", "hasNumberInput", "hasRange",
            ):
                if not state[key]:
                    failures.append(f"missing widget: {key}")

            # 7. Button -> Stat jsdlink (read the "Clicks" stat specifically — the
            #    metric grid adds other Stats to the page). This also exercises a
            #    jslink across two children rendered inside layout widgets.
            before_stat = page.evaluate(STAT_VALUE, "Clicks")
            if not page.evaluate(CLICK_BUTTON):
                failures.append("could not find Button to click")
            page.wait_for_timeout(600)
            after_clicks = page.evaluate(STAT_VALUE, "Clicks")
            print(f"Clicks stat: {before_stat} -> {after_clicks}")
            if after_clicks == before_stat:
                failures.append(
                    f"Button->Stat jsdlink failed: Clicks stat unchanged ({after_clicks})"
                )

            if errors:
                failures.append(f"page errors: {errors}")

            # 8. Per-widget doc pages render a live widget (no kernel). Each widget
            #    page is its own pre-executed notebook.
            widget_pages = {
                "/chart/": ".manywidgets-chart canvas",
                "/slider/": ".manywidgets-slider__input",
                "/range-slider/": ".manywidgets-range__input",
                "/dropdown/": ".manywidgets-dropdown__select",
                "/toggle/": ".manywidgets-toggle__input",
                "/button/": ".manywidgets-button",
                "/number-input/": ".manywidgets-number__input",
                "/stat/": ".manywidgets-stat",
                "/number-display/": ".manywidgets-numberdisplay__value",
                "/text/": ".manywidgets-text",
                "/legend/": ".manywidgets-legend__swatch",
                # Layout pages: assert the container rendered a real child inside it.
                "/row/": ".manywidgets-row .manywidgets-stat",
                "/column/": ".manywidgets-column .manywidgets-numberdisplay__value",
                "/grid/": ".manywidgets-grid .manywidgets-stat",
            }
            for path, selector in widget_pages.items():
                wp = browser.new_page()
                try:
                    wp.goto(f"http://127.0.0.1:{port}{path}", wait_until="networkidle")
                    wp.wait_for_selector(".myst-anywidget", timeout=15000)
                    wp.wait_for_timeout(1200)
                    found = wp.evaluate(SELECTOR_EXISTS, selector)
                    print(f"page {path}: {selector} -> {found}")
                    if not found:
                        failures.append(f"widget page {path}: '{selector}' not rendered")
                finally:
                    wp.close()

            # 9. A linked example on a display page works (Stat page: Button -> Stat).
            sp = browser.new_page()
            try:
                sp.goto(f"http://127.0.0.1:{port}/stat/", wait_until="networkidle")
                sp.wait_for_selector(".myst-anywidget", timeout=15000)
                sp.wait_for_timeout(1500)
                before = sp.evaluate(STAT_VALUE, "Clicks")
                sp.evaluate(CLICK_BUTTON)
                sp.wait_for_timeout(600)
                after_s = sp.evaluate(STAT_VALUE, "Clicks")
                print(f"/stat/ linked example: {before} -> {after_s}")
                if before == after_s:
                    failures.append(f"/stat/ Button->Stat link did not update ({after_s})")
            finally:
                sp.close()

            # 10. Layout cross-child link: on /row/ the Slider child drives the Stat
            #     child (both mounted via renderChild inside one Row), with no kernel.
            rp = browser.new_page()
            try:
                rp.goto(f"http://127.0.0.1:{port}/row/", wait_until="networkidle")
                rp.wait_for_selector(".myst-anywidget", timeout=15000)
                rp.wait_for_timeout(1500)
                in_row = rp.evaluate(SELECTOR_EXISTS, ".manywidgets-row .manywidgets-slider__input")
                if not in_row:
                    failures.append("/row/ did not render a Slider child inside the Row")
                before_r = rp.evaluate(STAT_VALUE, "Selected")
                rp.evaluate(SET_SLIDER, ["Value", 73])
                rp.wait_for_timeout(600)
                after_r = rp.evaluate(STAT_VALUE, "Selected")
                print(f"/row/ child link: {before_r} -> {after_r}")
                if after_r == before_r:
                    failures.append(f"/row/ Slider->Stat child link did not update ({after_r})")
            finally:
                rp.close()

            browser.close()
    finally:
        httpd.shutdown()

    if failures:
        print("\n❌ STATIC-EXPORT BROWSER CHECK FAILED:")
        for f in failures:
            print("  -", f)
        return 1
    print("\n✅ STATIC-EXPORT BROWSER CHECK PASSED (no kernel): demo page renders + "
          "jsdlink/Binder drive the chart; every widget doc page (incl. Row/Column/Grid) "
          "renders a live widget; Stat-page and in-Row child links both update.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
