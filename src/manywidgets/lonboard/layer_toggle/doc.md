# LayerToggle

A switch that shows/hides a [lonboard](https://developmentseed.org/lonboard/) layer
by writing its `visible` trait.

```{note}
`manywidgets.lonboard` is optional — install it with
`pip install "manywidgets[lonboard]"`. See the [lonboard guide](../guides/lonboard.md).
This page is reference only; the [interop example](../examples/lonboard-map.ipynb)
shows a **live map** with these controls.
```

## Import

```python
from manywidgets.lonboard import LayerToggle
```

## Example

```python
from lonboard import Map, ScatterplotLayer
from manywidgets.lonboard import LayerToggle

layer = ScatterplotLayer.from_geopandas(gdf)
m = Map(layer, basemap=None)
toggle = LayerToggle(layer, label="Points")

# show the control and the map together (see the Layout widgets)
from manywidgets import Column
Column(toggle, m)
```

## API

{api-table}
