# FilterBinder

Drive a [lonboard](https://developmentseed.org/lonboard/) layer's `filter_range`
from a `RangeSlider` (uses the layer's `DataFilterExtension`).

```{note}
`manywidgets.lonboard` is optional — install it with
`pip install "manywidgets[lonboard]"`. See the [lonboard guide](../guides/lonboard.md).
This page is reference only; the [interop example](../examples/lonboard-map.ipynb)
shows a **live map** with these controls.
```

## Import

```python
from manywidgets.lonboard import FilterBinder
```

## Example

```python
from lonboard import Map, ScatterplotLayer
from lonboard.layer_extension import DataFilterExtension
from manywidgets import RangeSlider, Column
from manywidgets.lonboard import FilterBinder

layer = ScatterplotLayer.from_geopandas(
    gdf,
    extensions=[DataFilterExtension(filter_size=1)],
    get_filter_value=values,           # one float per row
    filter_range=(lo, hi),
)
m = Map(layer, basemap=None)
slider = RangeSlider(min=lo, max=hi, low=lo, high=hi)
binder = FilterBinder(slider, layer)   # slider.low/high -> layer.filter_range

Column(slider, binder, m)
```

```{note}
For **static export**, include the binder somewhere in your displayed layout (e.g.
`Column(slider, binder, m)`) so its JavaScript activates — an exported page has no
kernel. In a **live kernel** the binding also works without displaying the binder.
```

## API

{api-table}

For single-ended filtering, pass a `Slider` and set `low_field=high_field="value"`.
Use seconds (not milliseconds) for time filters (see the
[lonboard guide](../guides/lonboard.md)).
