# Fullscreen

Wrap a widget with an expand button that opens a viewport-covering overlay —
either the same widget expanded, or a different layout (e.g. inline a single
chart, fullscreen a whole dashboard). Close with the ✕ button or `Esc`.

## Import

```python
from manywidgets import Fullscreen
```

## Example

Expand a chart to fill the screen:

```{code-cell} python
import numpy as np
from manywidgets import Chart, Fullscreen

x = np.linspace(0, 10, 200)
chart = Chart(title="NDVI over time", x_label="week", height=320)
chart.add_series(x=x, y=0.4 + 0.2 * np.sin(x), name="NDVI")
Fullscreen(chart)
```

Show a different layout in fullscreen — inline a single stat, fullscreen a
dashboard:

```{code-cell} python
from manywidgets import Fullscreen, Grid, Stat

stat = Stat(label="Uptime", value=99, unit="%")
Fullscreen(
    stat,
    fullscreen=Grid(
        stat,
        Stat(label="Revenue", value=1234, unit="USD", delta=12),
        Stat(label="Users", value=987, delta=-3),
        Stat(label="Latency", value=42, unit="ms"),
        columns=2,
    ),
)
```

Open and close it from Python:

```{code-cell} python
f = Fullscreen(Stat(label="Latency", value=42, unit="ms"))
f.is_open = True   # opens the overlay
f.is_open = False  # closes it again
f
```

## API

{api-table}

## Sharing a fullscreen link

On a statically exported page, the overlay state is mirrored into the URL:
opening fullscreen adds `?fullscreen=<widget_id>` to the address bar, so you can
copy the URL to share a link that opens the page directly in that fullscreen
view. A bare `?fullscreen=true` opens the page's first `Fullscreen` widget.

Auto-assigned ids (`fullscreen_1`, …) depend on widget creation order, so pass
an explicit id for links that should survive notebook edits:

```python
Fullscreen(chart, fullscreen=dashboard, widget_id="ndvi-dashboard")
# share as: https://example.org/report.html?fullscreen=ndvi-dashboard
```

## Notes

- The overlay is a CSS layer covering the viewport (not the browser's
  fullscreen mode), so it works in static export and can be driven from Python.
- A directly-expanded child (no `fullscreen=` layout) stretches to fill the
  overlay. Inside a `fullscreen=` layout, children keep their own sizing and
  the panel scrolls — give that layout its own heights (e.g. a map's `height`
  trait) rather than expecting it to stretch.
- The same widget instance can appear both inline and in the `fullscreen=`
  layout — the inline view is hidden while the overlay is open, and trait
  changes stay in sync between the two.

See the [fullscreen dashboard example](../examples/fullscreen-dashboard.ipynb)
for a lonboard map + chart + controls layout behind a single inline chart.
