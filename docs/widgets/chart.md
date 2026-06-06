---
title: Chart
---

# Chart

An interactive charting widget powered by [Chart.js](https://www.chartjs.org/)
(bundled into the widget, so it renders without a CDN or a kernel).

## Import

```python
from manywidgets import Chart
```

## Minimal example

```python
import numpy as np
from manywidgets import Chart

x = np.linspace(0, 10, 200)
chart = Chart(title="A sine wave", x_label="x", y_label="y", height=320)
chart.add_series(x=x, y=np.sin(x), name="sin")
chart.add_series(x=x, y=np.cos(x), name="cos")
chart
```

## API

### Traits

| Trait | Type | Default | Description |
|---|---|---|---|
| `chart_type` | str | `"line"` | Default series type (`line`, `scatter`, `bar`, …). |
| `series_data` | list | `[]` | The series (use the methods below rather than setting directly). |
| `chart_options` | dict | `{}` | Extra Chart.js options, deep-merged. |
| `width` | int | `800` | Width in px. |
| `height` | int | `400` | Height in px. |
| `title` | str | `""` | Chart title. |
| `x_label` / `y_label` | str | `""` | Axis titles. |
| `animation_enabled` | bool | `True` | Toggle animations. |
| `tooltips_enabled` | bool | `True` | Toggle tooltips. |
| `legend_enabled` | bool | `True` | Toggle the legend. |
| `clicked_point` | dict | `{}` | Written from JS on click: `{series, index, x, y, label}`. |
| `hover_point` | dict | `{}` | Written from JS on hover. |
| `widget_id` | str | auto | Stable id used for linking (from `BaseWidget`). |

### Methods

| Method | Description |
|---|---|
| `add_series(x=, y=, data=, series_type=, name=, color=, **opts)` | Append a series. Pass `data` as `[[x, y], …]` or separate `x`/`y` sequences (numpy arrays accepted). |
| `update_series(index, x=, y=, data=)` | Replace an existing series' data. |
| `clear_series()` | Remove all series. |
| `set_options(**options)` | Merge extra Chart.js options. |

## Linking

`Chart` traits link like any widget. Pass-through with `jsdlink`:

```python
from ipywidgets import jsdlink
from manywidgets import Chart, Slider

chart = Chart(title="Linked")
title_source = Slider(label="(drives title)", min=0, max=10, value=3)
# (string targets accept any value; numbers stringify)
jsdlink((title_source, "value"), (chart, "title"))
```

Transform a value with `Binder` — e.g. a slider that controls chart height:

```python
from manywidgets import Binder
h = Slider(label="Height", min=1, max=6, value=3)
Binder(source=h, source_field="value", target=chart, target_field="height",
       multiplier=100, offset=100)
```

See the [linking guide](../guides/linking.md) for the full story.

## Caveats (static export)

- Chart data is shipped as plain JSON lists (buffer-free), so static export needs
  no `nbclient` pre-execute step.
- Click/hover write back through `model.save_changes()`, which is a safe no-op
  with no kernel — the chart still renders and is interactive, but those traits
  won't propagate to other cells statically.
