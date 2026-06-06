# manywidgets

A composable set of [anywidget](https://anywidget.dev)-based widgets for data
analysis and geospatial work in notebooks. Widgets are self-contained, link and
compose with each other, work well with [lonboard](https://developmentseed.org/lonboard/),
and are authored to **render statically (no kernel)** when a notebook is exported
with the [`myst-anywidget-static-export`](https://github.com/developmentseed/myst-anywidget-static-export)
MyST plugin — while remaining ordinary anywidgets in a live kernel.

> **Status:** early. This is the first vertical slice — `Chart`, `Slider`, and
> `Binder` — proving the package structure, build, and linking story. More
> widgets (more input controls, value displays, and first-class lonboard interop
> widgets) are on the way; see `manywidgets-plan.md`.

## Install

```bash
pip install manywidgets
# optional lonboard interop widgets:
pip install "manywidgets[lonboard]"
```

## Quick start

```python
from manywidgets import Chart, Slider, Binder
import numpy as np

chart = Chart(title="Demo", x_label="x", y_label="y", height=320)
chart.add_series(x=np.linspace(0, 10, 100), y=np.sin(np.linspace(0, 10, 100)), name="sin")
chart
```

## Linking widgets

Two complementary tools — see [`docs/guides/linking.md`](docs/guides/linking.md):

```python
from ipywidgets import jsdlink

# 1. jslink / jsdlink — the canonical, kernel-free pass-through link.
slider = Slider(label="Amplitude", min=0, max=5, value=1)
jsdlink((slider, "value"), (chart, "title"))  # browser-side, works live + static

# 2. Binder — for transforms / nested paths jslink can't express.
Binder(source=slider, source_field="value",
       target=chart, target_field="height",
       multiplier=100, offset=200)
```

## How it works / design

Every widget extends a thin `BaseWidget` (auto-assigns a stable `widget_id`) and
follows the TypeScript "golden example" structure: `src/index.ts` bundled by
esbuild into `dist/widget.js`, styling via the `_css` trait. Cross-widget
resolution and the static-export safety rules live once in a shared
`@manywidgets/core` TypeScript module that esbuild inlines into each widget.

This package has **no code dependency** on the static-export plugin — it just
follows the rules the plugin needs (wrap `save_changes`, never inject `<link>`
into the mount element, vanilla DOM, buffer-free core widgets, link via
`jslink`/`Binder`). The docs site references the plugin by release URL only.

## Development

```bash
npm install
npm run build          # esbuild every widget src/index.ts -> dist/widget.js
npm run typecheck      # tsc --noEmit
pip install -e ".[dev]"
pytest
```

Releases are cut by publishing a GitHub Release (CI builds the wheel — with JS
compiled by the build hook — and publishes to PyPI). The JS bundles are
gitignored and rebuilt by the build; they ship inside the wheel.

## License

MIT — see [LICENSE](LICENSE).
