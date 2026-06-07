# Grid

Lay out child widgets in an N-column CSS grid; children flow row-major into
`columns` equal columns.

## Import

```python
from manywidgets import Grid
```

## Example

A 2-column grid of metric cards:

```{code-cell} python
from manywidgets import Grid, Stat

Grid(
    Stat(label="Revenue", value=1234, unit="USD", delta=12),
    Stat(label="Users", value=987, delta=-3),
    Stat(label="Latency", value=42, unit="ms"),
    Stat(label="Uptime", value=99, unit="%", delta=1),
    columns=2, gap="12px",
)
```

## API

{api-table}

Pass children positionally (`Grid(a, b, c)`) or as a list (`Grid(children=[a, b, c])`).

See [Layout](../examples/layout.ipynb) for how `Row`, `Column`, and `Grid`
compose into a full screen.
