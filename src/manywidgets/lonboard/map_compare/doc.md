# MapCompare

Swipe-compare two [lonboard](https://developmentseed.org/lonboard/) `Map`s with a
draggable divider — drag it across the viewport to reveal one map over the other.
Ideal for before/after imagery: satellite scenes from two dates, or pre- and
post-event views of the same area.

```{note}
`manywidgets.lonboard` is optional — install it with
`pip install "manywidgets[lonboard]"`. See the [lonboard guide](../guides/lonboard.md).
This page is reference only; the [interop example](../examples/lonboard-map.ipynb)
shows live maps with these controls.
```

The two maps are stacked, and the `before` map is clipped to one side of the
divider (left for a vertical split, top for a horizontal one). Their cameras are
locked together, so panning or zooming either map moves both — no kernel required,
so it behaves the same live and in static export.

## Import

```python
from manywidgets.lonboard import MapCompare
```

## Example

```python
from lonboard import Map, BitmapTileLayer
from manywidgets.lonboard import MapCompare

# Two raster sources to compare. Swap these for two dated satellite layers
# (e.g. NASA GIBS MODIS imagery for two dates) to build a true before/after.
imagery = BitmapTileLayer(
    data="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    tile_size=256, max_requests=-1, min_zoom=0, max_zoom=19,
)
streets = BitmapTileLayer(
    data="https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    tile_size=256, max_requests=-1, min_zoom=0, max_zoom=19,
)

view = {"longitude": -122.45, "latitude": 37.78, "zoom": 11}
before = Map(imagery, basemap=None, view_state=view)
after = Map(streets, basemap=None, view_state=view)

MapCompare(before, after)
```

Drive the divider from a `Slider` — `position` runs 0–1, the same range as the
slider's `value`, so a plain `jslink` keeps them in sync (both live and static):

```python
from ipywidgets import jslink
from manywidgets import Column, Slider

swipe = Slider(value=0.5, min=0.0, max=1.0, step=0.01, label="Swipe")
compare = MapCompare(before, after)
jslink((swipe, "value"), (compare, "position"))  # bidirectional: drag either one
Column(swipe, compare)
```

## API

{api-table}
