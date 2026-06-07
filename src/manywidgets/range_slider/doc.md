# RangeSlider

A dual-handle slider producing a `[low, high]` window.

## Import

```python
from manywidgets import RangeSlider
```

## Example

```{code-cell} python
from manywidgets import RangeSlider

RangeSlider(label="Magnitude", min=0, max=10, low=2, high=8, step=0.5)
```

## API

{api-table}

## Linking

Link `low`/`high` like any trait (see the [linking guide](../guides/linking.md)).
Pairs with the lonboard [`FilterBinder`](filter_binder.ipynb) (window → layer
`filter_range`):

```python
from ipywidgets import jsdlink
from manywidgets import RangeSlider, NumberDisplay

r = RangeSlider(min=0, max=100, low=10, high=90)
hi = NumberDisplay(label="High", duration=0)
jsdlink((r, "high"), (hi, "value"))
```
