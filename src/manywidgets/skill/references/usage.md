# Using manywidgets

Practical patterns for building notebook widgets and dashboards. For exact trait
names, defaults, and constructor signatures, see `widgets-api.md`.

## Display

A widget renders when it's the last expression in a cell, or via `display(w)`.
Mutating a synced trait after display updates the live widget:

```python
from manywidgets import Slider
s = Slider(label="Amplitude", min=0, max=5, value=1)
s                 # renders here
# ... later cell:
s.value = 3       # updates the rendered widget
```

## Layout: Row, Column, Grid

Containers take children **positionally** or via `children=[...]`, and keep them
fully interactive and linked (live and in static export). They nest freely.

```python
from manywidgets import Row, Column, Grid, Stat, Chart, Slider

Column(
    Row(Stat(label="Revenue", value="$1.2M"), Stat(label="Users", value=8421), gap="16px"),
    Chart(title="Trend", height=320),
    gap="16px",
)
```

- `Row(*children, gap="8px", align="stretch")` — horizontal; `align` is CSS
  `align-items`.
- `Column(*children, gap="8px", align="stretch")` — vertical.
- `Grid(*children, columns=2, gap="8px")` — N equal-width columns, row-major.

A common dashboard shape is a `Column` of a `Row` of `Stat`s (a KPI strip), a
`Chart`, and a `Row`/`Column` of controls. Compose with nesting; tune spacing with
`gap`.

## Linking widgets

Two complementary tools — both work live and in static export.

### jslink / jsdlink (same value)

Use when two traits should hold the **same value**.

```python
from ipywidgets import jslink, jsdlink
from manywidgets import Slider, Chart

slider = Slider(label="Height", min=200, max=600, value=320)
chart = Chart(title="Linked", height=320)

jsdlink((slider, "value"), (chart, "height"))   # one-way: slider -> chart
# jslink((a, "value"), (b, "value"))             # two-way
```

### Binder (transforms & nested paths)

Use when jslink can't express the link: a linear transform, or writing a
dotted-path target. `Binder` computes `target = source*multiplier + offset`.

```python
from manywidgets import Binder

Binder(source=slider, source_field="value",
       target=chart, target_field="height",
       multiplier=100, offset=200)               # height = value*100 + 200

# nested / dotted-path target (e.g. a lonboard map's view state):
Binder(source=zoom_slider, target=some_map, target_field="view_state.zoom")
```

`Binder` accepts widget instances (it reads their `widget_id`) or explicit id
strings.

| Need | Use |
|---|---|
| Same value, A → B | `jsdlink` |
| Same value, A ↔ B | `jslink` |
| Scaled / offset value | `Binder` (`multiplier`/`offset`) |
| Write a nested dict key | `Binder` (dotted `target_field`) |

## Charts

`Chart` holds series; manage them with methods rather than setting `series_data`
directly:

```python
import numpy as np
from manywidgets import Chart

chart = Chart(title="Demo", x_label="x", y_label="y", height=320)
x = np.linspace(0, 10, 100)
chart.add_series(x=x, y=np.sin(x), name="sin")           # line by default
chart.add_series(x=x, y=np.cos(x), name="cos", series_type="scatter")
# chart.update_series(0, x=x, y=np.sin(2*x))
# chart.clear_series()
# chart.set_options(...)                                  # extra Chart.js options
chart
```

`chart.clicked_point` / `chart.hover_point` are written from JS on interaction —
read them or `observe` them; don't pass them to the constructor.

## Events (need a live kernel)

Python-side callbacks only run with a live kernel (they're inert in static
export, though browser links still respond).

```python
from manywidgets import Button, NumberDisplay

btn = Button(label="+1")
count = NumberDisplay(value=0)

def on_click(widget):
    count.value = widget.clicks      # widget.clicks auto-increments per click

btn.on_click(on_click)
Row(btn, count)
```

Any synced trait can be watched with traitlets `observe`:

```python
slider.observe(lambda change: print(change["new"]), names="value")
```

## Lonboard interop

Optional (`pip install "manywidgets[lonboard]"`). Control a lonboard map's layers:

- `LayerToggle(layer=..., label=...)` — show/hide a layer.
- `LayerFilter(layer=..., categories=[...])` — filter a layer by category.
- `FilterBinder(source=range_slider, layer=...)` — drive a layer's `filter_range`
  from a `RangeSlider`'s low/high.

See `widgets-api.md` for their traits.
