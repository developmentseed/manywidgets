"""Static-export browser check.

Serves docs/_build/html and loads the exported demo page in headless Chromium —
NO Python kernel involved — then asserts:

  1. the Chart rendered a <canvas>,
  2. both Sliders rendered range inputs,
  3. the Binder resolved (status line shows the check mark),
  4. jsdlink works: dragging the height slider changes the chart's height,
  5. Binder works: dragging the width slider changes the chart's width
     (width = value*100 + 200).

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
  return {
    hosts: hosts.length,
    hasChart: !!chart,
    hasCanvas: !!canvas,
    chartWidth: chart ? chart.style.width : null,
    chartHeight: chart ? chart.style.height : null,
    sliders,
    binderText: binder ? binder.textContent : null,
  };
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
            ok = page.evaluate(SET_SLIDER, ["Chart height", 460])
            if not ok:
                failures.append("could not find 'Chart height' slider")
            page.wait_for_timeout(800)
            after = page.evaluate(PROBE)
            print("after height=460:", after["chartHeight"])
            if after["chartHeight"] != "460px":
                failures.append(f"jsdlink failed: chart height = {after['chartHeight']} (expected 460px)")

            # 5. Binder: width slider -> chart width = value*100 + 200
            ok = page.evaluate(SET_SLIDER, ["Width", 5])
            if not ok:
                failures.append("could not find 'Width' slider")
            page.wait_for_timeout(800)
            after = page.evaluate(PROBE)
            print("after width=5:", after["chartWidth"])
            if after["chartWidth"] != "700px":  # 5*100 + 200
                failures.append(f"Binder failed: chart width = {after['chartWidth']} (expected 700px)")

            if errors:
                failures.append(f"page errors: {errors}")

            browser.close()
    finally:
        httpd.shutdown()

    if failures:
        print("\n❌ STATIC-EXPORT BROWSER CHECK FAILED:")
        for f in failures:
            print("  -", f)
        return 1
    print("\n✅ STATIC-EXPORT BROWSER CHECK PASSED (no kernel): "
          "Chart + 2 Sliders rendered, Binder resolved, jsdlink and Binder both drive the chart.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
