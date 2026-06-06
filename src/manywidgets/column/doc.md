# Column

Lay out child widgets in a vertical column (the vertical sibling of
[`Row`](row.ipynb)). Children stay interactive and linked — live and in static
export.

## Import

```python
from manywidgets import Column
```

## Minimal example

```{code-cell} python
from ipywidgets import jsdlink
from manywidgets import Column, Slider, NumberDisplay

s = Slider(label="Value", min=0, max=1000, value=250)
nd = NumberDisplay(label="Selected", format="{:,.0f}", duration=300)
jsdlink((s, "value"), (nd, "value"))
Column(s, nd, gap="12px")
```

## API

{api-table}

Pass children positionally (`Column(a, b)`) or as a list (`Column(children=[a, b])`).

## Caveats (static export)

Children render via `host.renderChild` (plugin v0.2.0+); each child keeps its own
JS, CSS, and links, with no kernel.
