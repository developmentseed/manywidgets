# Legend

A discrete colour legend — a swatch + label per entry, with an optional title. Use
it alongside data-driven styling (pass the same colours you styled with so the
legend stays consistent).

## Import

```python
from manywidgets import Legend
```

## Minimal example

```{code-cell} python
from manywidgets import Legend

Legend(
    [
        [[230, 30, 30], "High"],
        [[30, 160, 30], "Medium"],
        [[30, 90, 230], "Low"],
    ],
    title="Category",
)
```

## API

{api-table}

Each entry is `[color, label]`. `color` is an `[r, g, b]` / `[r, g, b, a]` list
(0–255, deck.gl convention) or a CSS colour string (e.g. `"#e11"`).

## Caveats (static export)

Read-only display — renders with no kernel. Pair it with a styled
[lonboard](lonboard.ipynb) layer (see the [interop example](../examples/lonboard-map.ipynb)).
