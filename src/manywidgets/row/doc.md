# Row

Lay out child widgets in a horizontal row. Children stay interactive and linked —
live and in static export.

## Import

```python
from manywidgets import Row
```

## Minimal example

A slider beside the `Stat` it drives — side by side, linked, kernel-free:

```{code-cell} python
from ipywidgets import jsdlink
from manywidgets import Row, Slider, Stat

s = Slider(label="Value", min=0, max=100, value=40)
stat = Stat(label="Selected", value=40)
jsdlink((s, "value"), (stat, "value"))
Row(s, stat, gap="24px")
```

## API

{api-table}

Pass children positionally (`Row(a, b)`) or as a list (`Row(children=[a, b])`).

## Caveats (static export)

Children render via `host.renderChild` (plugin v0.2.0+) — each child loads its own
JS + CSS and keeps its links. Requires a child to be a manywidgets/anywidget
instance (referenced through the `children` trait). No kernel needed.
