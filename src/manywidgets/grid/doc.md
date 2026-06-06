# Grid

Lay out child widgets in an N-column CSS grid. Children flow in row-major order
into `columns` equal columns. Interactive and linked — live and in static export.

## Import

```python
from manywidgets import Grid
```

## Minimal example

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

Pass children positionally (`Grid(a, b, c)`) or as a list
(`Grid(children=[a, b, c])`).

## Caveats (static export)

Children render via `host.renderChild` (plugin v0.2.0+); each keeps its own JS,
CSS, and links, with no kernel.
