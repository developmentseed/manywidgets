# GridItem

Wrap a `Grid` child to control how many columns/rows its cell spans, or to
place it into a named `template_areas` region. A bare (unwrapped) child stays
a plain 1x1 cell, exactly like before; `GridItem` is opt-in.

## Import

```python
from manywidgets import Grid, GridItem
```

## Example

One cell spanning 2 columns and 2 rows, in a 4-column grid. Every cell here
is a plain bordered `Stat` card labeled with its own span, so the grid lines
are visible directly from the cell borders:

```{code-cell} python
from manywidgets import Grid, GridItem, Stat

Grid(
    GridItem(Stat(label="col_span=2, row_span=2"), col_span=2, row_span=2),
    Stat(label="1x1"),
    Stat(label="1x1"),
    Stat(label="1x1"),
    Stat(label="1x1"),
    columns=4, gap="12px",
)
```

Named areas (set `template_areas` on the `Grid`, and `area=` on each item)
place a cell by name instead of row-major flow. Combine with `template_rows`
and an explicit `height` on the `Grid` to give a middle row (here `1fr`) more
space than the thin header/footer bars; see
[Grid's asymmetric-columns section](./grid.md) for why `height` matters:

```{code-cell} python
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

`area` takes precedence over `col_span`/`row_span` when the parent `Grid` has
`template_areas` set.
