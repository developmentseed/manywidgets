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
v1 ships a `Chart`, a set of input controls and value displays, and the `Binder`
linking primitive. First-class lonboard interop widgets are planned for a future
release.
```

## Install

```bash
pip install manywidgets
# optional lonboard interop widgets:
pip install "manywidgets[lonboard]"
```

## Widgets

- [`Chart`](widgets/chart.ipynb) — interactive Chart.js charts.

**Input controls:** [`Slider`](widgets/slider.ipynb),
[`RangeSlider`](widgets/range_slider.ipynb), [`Dropdown`](widgets/dropdown.ipynb),
[`Toggle`](widgets/toggle.ipynb), [`Button`](widgets/button.ipynb),
[`NumberInput`](widgets/number_input.ipynb).

**Value displays:** [`Stat`](widgets/stat.ipynb),
[`NumberDisplay`](widgets/number_display.ipynb), [`Text`](widgets/text.ipynb).

**Layout:** [`Row`](widgets/row.ipynb), [`Column`](widgets/column.ipynb),
[`Grid`](widgets/grid.ipynb) — arrange widgets side-by-side while keeping them
linked, live and in static export.

**Lonboard interop** (optional, `pip install "manywidgets[lonboard]"`):
[`LayerToggle`](widgets/layer_toggle.ipynb),
[`FilterBinder`](widgets/filter_binder.ipynb),
[`LayerFilter`](widgets/layer_filter.ipynb) — drive a lonboard map's layers. See
the [lonboard guide](guides/lonboard.md).

**Linking:** `Binder` — link a widget's trait into another with a transform or
nested path (see the [linking guide](guides/linking.md)).

## Linking

manywidgets gives you two complementary linking tools, covered in the
[linking guide](guides/linking.md):

1. **`ipywidgets.jslink` / `jsdlink`** — the canonical, kernel-free pass-through
   link. Works live and statically.
2. **`Binder`** — for the cases jslink can't express: scaling/transforms, value
   mapping, and writing nested dict keys (e.g. lonboard `view_state.zoom`).

See the [demo notebook](examples/demo.ipynb) for a live, statically-exportable
example wiring these together.
