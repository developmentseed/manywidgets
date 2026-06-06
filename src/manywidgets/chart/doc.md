# Chart

An interactive charting widget powered by [Chart.js](https://www.chartjs.org/)
(bundled into the widget, so it renders without a CDN or a kernel).

## Import

```python
from manywidgets import Chart
```

## Minimal example

```{code-cell} python
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

{api-table}

### Methods

| Method | Description |
|---|---|
| `add_series(x=, y=, data=, series_type=, name=, color=, **opts)` | Append a series (`[[x, y], …]` or separate `x`/`y`; numpy ok). |
| `update_series(index, x=, y=, data=)` | Replace a series' data. |
| `clear_series()` | Remove all series. |
| `set_options(**options)` | Merge extra Chart.js options. |

## Linking

Link like any widget (see the [linking guide](../guides/linking.md)):

```python
from ipywidgets import jsdlink
from manywidgets import Chart, Dropdown

chart = Chart()
kind = Dropdown(options=["line", "bar", "scatter"], value="line")
jsdlink((kind, "value"), (chart, "chart_type"))
```

## Caveats (static export)

- Data is plain JSON lists (buffer-free), so static export needs no `nbclient`
  pre-execute step.
- Click/hover write through `model.save_changes()`, a safe no-op with no kernel —
  the chart still renders and is interactive.
