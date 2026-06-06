---
title: manywidgets
---

# manywidgets

A thoughtfully constructed, composable set of [anywidget](https://anywidget.dev)
widgets for data analysis and geospatial work in notebooks. Each widget is
self-contained, links and composes with the others, works well with
[lonboard](https://developmentseed.org/lonboard/), and is authored to render
correctly both in a **live Jupyter kernel** and in a **static export with no
kernel** (via the [`myst-anywidget-static-export`](https://github.com/developmentseed/myst-anywidget-static-export)
MyST plugin).

```{note}
This is the first vertical slice: `Chart`, `Slider`, and `Binder`. It proves the
package structure, the esbuild build, and the linking story. More widgets are on
the way.
```

## Install

```bash
pip install manywidgets
# optional lonboard interop widgets:
pip install "manywidgets[lonboard]"
```

## Widgets

- [`Chart`](widgets/chart.md) — interactive Chart.js charts.
- `Slider` — a labelled numeric range slider that drives other widgets.
- `Binder` — link a widget's trait into another with a transform or nested path.

## Linking

manywidgets gives you two complementary linking tools, covered in the
[linking guide](guides/linking.md):

1. **`ipywidgets.jslink` / `jsdlink`** — the canonical, kernel-free pass-through
   link. Works live and statically.
2. **`Binder`** — for the cases jslink can't express: scaling/transforms, value
   mapping, and writing nested dict keys (e.g. lonboard `view_state.zoom`).

See the [demo notebook](examples/demo.ipynb) for a live, statically-exportable
example wiring these together.
