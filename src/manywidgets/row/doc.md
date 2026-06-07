# Row

Lay out child widgets in a horizontal row.

## Import

```python
from manywidgets import Row
```

## Example

A slider beside the `Stat` it drives:

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

See [Layout](../examples/layout.ipynb) for how `Row`, `Column`, and `Grid`
compose into a full screen.
