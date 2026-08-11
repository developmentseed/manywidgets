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

## Spanning and named areas

Wrap a child in [GridItem](./grid_item.md) to span multiple columns/rows, or
to place it into a `template_areas` region; see its docs for both forms.
Unwrapped children keep today's 1x1 behaviour.

## Asymmetric columns and row sizing

`columns` also accepts a raw CSS grid-template-columns track string, for a
sidebar narrower than the main content instead of N equal columns.
`template_rows` is the row equivalent (e.g. `"auto 1fr auto"` for a thin
header/footer and a middle row that grows), but a `1fr` track only has
space to grow into if the `Grid` itself has an explicit `height`; unset,
rows default to auto-sizing (fit content), same as CSS Grid itself:

```{code-cell} python
from manywidgets import GridItem, Stat

Grid(
    GridItem(Stat(label="header"), area="header"),
    GridItem(Stat(label="sidebar"), area="sidebar"),
    GridItem(Stat(label="main"), area="main"),
    GridItem(Stat(label="footer"), area="footer"),
    columns="200px 1fr", gap="12px",
    template_areas='"header header" "sidebar main" "footer footer"',
    template_rows="auto 1fr auto",
    height="300px",
)
```

## API

{api-table}

Pass children positionally (`Grid(a, b, c)`) or as a list (`Grid(children=[a, b, c])`).

See [Layout](../examples/layout.ipynb) for how `Row`, `Column`, and `Grid`
compose into a full screen.
