---
title: lonboard interop
---

# lonboard interop

`manywidgets.lonboard` ships control widgets for [lonboard](https://developmentseed.org/lonboard/)
maps. They're an **optional** subpackage:

```bash
pip install "manywidgets[lonboard]"
```

These are *control-plane* widgets — they reference a lonboard `Map`/layer and mutate
its traits; they don't render the map. They work in a live kernel **and** in static
export (no kernel), resolving the layer through `@manywidgets/core`'s `resolveModel`
and fanning each write out to every proxy of the layer (the `Map` keeps its own).

## Widgets

- [`LayerToggle`](../widgets/layer_toggle.ipynb) — show/hide a layer (`visible`).
- [`FilterBinder`](../widgets/filter_binder.ipynb) — drive a layer's `filter_range`
  from a `RangeSlider` (`DataFilterExtension`).
- [`LayerFilter`](../widgets/layer_filter.ipynb) — filter a layer by category
  (`filter_categories`) via a checkbox legend.
- [`MapFlyer`](../widgets/map_flyer.ipynb) — buttons that animate the `Map` to
  preset locations (`fly_to`).

Compose them with the [layout widgets](../widgets/row.ipynb) to put a control panel
beside the map:

```python
from manywidgets import Column
from manywidgets.lonboard import LayerToggle, FilterBinder

Column(LayerToggle(layer), FilterBinder(slider, layer), m)
```

## Recipe: a layer switcher

A `Map` can hold several layers; one `LayerToggle` per layer (in a `Column`) is a
layer switcher. Works for any layer type — vector or raster (`BitmapTileLayer`):

```python
from lonboard import Map, BitmapTileLayer
from manywidgets import Column
from manywidgets.lonboard import LayerToggle

osm = BitmapTileLayer(data="https://tile.openstreetmap.org/{z}/{x}/{y}.png", visible=True)
topo = BitmapTileLayer(data="https://a.tile.opentopomap.org/{z}/{x}/{y}.png", visible=False)
m = Map([osm, topo], basemap=None)

Column(
    Column(LayerToggle(osm, label="OpenStreetMap"), LayerToggle(topo, label="OpenTopoMap")),
    m,
)
```

See it live in the [interop example](../examples/lonboard-map.ipynb).

## Recipe: data-driven styling + legend

Colour a layer by a data attribute with a per-row `get_fill_color` array, and pair
it with a [`Legend`](../widgets/legend.ipynb) built from the **same** palette:

```python
import numpy as np
from manywidgets import Legend

palette = np.array([[230, 30, 30], [30, 160, 30], [30, 90, 230]], dtype="uint8")
layer = ScatterplotLayer.from_geopandas(gdf, get_fill_color=palette[categories])  # one colour per row
legend = Legend([[palette[i].tolist(), name] for i, name in enumerate(["A", "B", "C"])], title="Category")
```

(For binned continuous data, bin the values and label the ranges, e.g.
`["0–10", "10–20", …]`.) See the
[interop example](../examples/lonboard-map.ipynb).

## Recipe: fly to preset locations

`MapFlyer` repositions an already-rendered `Map` — something `Map.view_state` can't do
(it's *uncontrolled*: deck.gl reads it once as `initialViewState`). Each preset is a
dict with a `label` and camera keys; clicking a button animates the map there:

```python
from lonboard import Map
from manywidgets import Column
from manywidgets.lonboard import MapFlyer

m = Map(layer)
flyer = MapFlyer(m, locations=[
    {"label": "New York", "longitude": -74.0, "latitude": 40.7, "zoom": 10},
    {"label": "London", "longitude": -0.12, "latitude": 51.5, "zoom": 9},
], duration=3000)

Column(flyer, m)
```

It drives lonboard's existing `fly_to` (a deck.gl `FlyToInterpolator` animation) from the
browser — no kernel needed — so it works the same live and in static export.

## Caveats

- **`MapFlyer` is fire-and-forget.** A fly-to is a one-shot animation command, not stored
  state, so it positions the map on **click**, not on load, and won't replay if the map
  re-renders. Set the starting position via the `Map`'s own `view_state`.
- **Seconds, not milliseconds** for time filters — `DataFilterExtension` compares as
  float32 in the shader, so millisecond timestamps overflow its exact-integer range.
  Use seconds for `get_filter_value` and the slider bounds.
- **Static export needs a pre-execute.** lonboard layers carry binary Arrow buffers;
  execute the notebook (`jupyter nbconvert --execute`) so the buffers embed in the
  page.
- **Basemap.** By default the `Map` uses lonboard's carto basemap, whose tiles are
  fetched from the network when the page is viewed (fine for an online docs site).
  Pass `basemap=None` for a fully-offline page (blank background; the data layer
  still renders).

See the [interop example](../examples/lonboard-map.ipynb) for a working map.
