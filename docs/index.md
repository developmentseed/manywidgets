---
title: manywidgets
---

# manywidgets

A set of [anywidget](https://anywidget.dev) widgets for data analysis and geospatial work in notebooks — self-contained, composable, and good with [lonboard](https://developmentseed.org/lonboard/). They work in a live Jupyter kernel and render statically (no kernel) via the [`myst-anywidget-static-export`](https://github.com/developmentseed/myst-anywidget-static-export) MyST plugin.


## Install

**Note**: This is not yet published to PyPi so pip install does not currently work. To install currently, use:

```bash
pip install "manywidgets[lonboard] @ git+https://github.com/developmentseed/manywidgets.git"
```

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
[`NumberDisplay`](widgets/number_display.ipynb), [`Text`](widgets/text.ipynb),
[`Legend`](widgets/legend.ipynb).

**Layout:** [`Row`](widgets/row.ipynb), [`Column`](widgets/column.ipynb),
[`Grid`](widgets/grid.ipynb) — arrange widgets side-by-side while keeping them
linked, live and in static export. See the [layout examples](examples/layout.ipynb)
for how they compose.

**Lonboard interop** (optional, `pip install "manywidgets[lonboard]"`):
[`LayerToggle`](widgets/layer_toggle.ipynb),
[`FilterBinder`](widgets/filter_binder.ipynb),
[`LayerFilter`](widgets/layer_filter.ipynb) — drive a lonboard map's layers. See
the [lonboard guide](guides/lonboard.md).

**Linking:** [`Binder`](widgets/binder.ipynb) — link a widget's trait into another
with a transform or nested path (see the [linking guide](guides/linking.md)).

## Linking

manywidgets gives you two complementary linking tools, covered in the
[linking guide](guides/linking.md):

1. **`ipywidgets.jslink` / `jsdlink`** — the canonical, kernel-free pass-through
   link. Works live and statically.
2. **`Binder`** — for the cases jslink can't express: scaling/transforms, value
   mapping, and writing nested dict keys (e.g. lonboard `view_state.zoom`).

See the [demo notebook](examples/demo.ipynb) for a live, statically-exportable
example wiring these together.
