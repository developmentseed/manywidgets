# MapFlyer

Buttons that animate a [lonboard](https://developmentseed.org/lonboard/) `Map` to
preset locations, driving lonboard's `fly_to` from the browser.

```{note}
`manywidgets.lonboard` is optional — install it with
`pip install "manywidgets[lonboard]"`. See the [lonboard guide](../guides/lonboard.md).
This page is reference only; the [interop example](../examples/lonboard-map.ipynb)
shows a **live map** with these controls.
```

Each preset is a dict with a `label` and deck.gl camera keys (`longitude`, `latitude`,
`zoom`, and optionally `pitch` / `bearing`). Clicking a button flies the map there —
no kernel required, so it behaves the same live and in static export.

## Import

```python
from manywidgets.lonboard import MapFlyer
```

## Example

```python
from lonboard import Map, ScatterplotLayer
from manywidgets.lonboard import MapFlyer

layer = ScatterplotLayer.from_geopandas(gdf)
m = Map(layer, basemap=None)
flyer = MapFlyer(m, locations=[
    {"label": "New York", "longitude": -74.0, "latitude": 40.7, "zoom": 10},
    {"label": "London", "longitude": -0.12, "latitude": 51.5, "zoom": 9},
], duration=3000)

# show the control and the map together (see the Layout widgets)
from manywidgets import Column
Column(flyer, m)
```

## API

{api-table}
