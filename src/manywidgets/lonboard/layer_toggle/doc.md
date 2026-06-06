# LayerToggle

A switch that shows/hides a [lonboard](https://developmentseed.org/lonboard/) layer
by writing its `visible` trait. Works live and in static export.

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

## Usage

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

## Caveats (static export)

The toggle writes to every proxy of the layer and re-applies as late-loading map
proxies register (no kernel needed). The lonboard layer's data must be pre-executed
(`nbclient`) so its Arrow buffers embed in the page.
