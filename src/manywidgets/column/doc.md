# Column

Lay out child widgets in a vertical column (the vertical sibling of
[`Row`](row.ipynb)).

## Import

```python
from manywidgets import Column
```

## Example

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

See [Layout](../examples/layout.ipynb) for how `Row`, `Column`, and `Grid`
compose into a full screen.
