# RangeSlider

A dual-handle slider producing a `[low, high]` window. Pairs naturally with the
planned lonboard `FilterBinder` (window → layer `filter_range`).

## Import

```python
from manywidgets import RangeSlider
```

## Minimal example

```{code-cell} python
from manywidgets import RangeSlider

RangeSlider(label="Magnitude", min=0, max=10, low=2, high=8, step=0.5)
```

## API

{api-table}

## Linking

Link `low`/`high` like any trait (see the [linking guide](../guides/linking.md)):

```python
from ipywidgets import jsdlink
from manywidgets import RangeSlider, NumberDisplay

r = RangeSlider(min=0, max=100, low=10, high=90)
hi = NumberDisplay(label="High", duration=0)
jsdlink((r, "high"), (hi, "value"))
```

## Caveats (static export)

Kernel-free; the handles update and propagate through `jslink`/`Binder` in the
browser.
