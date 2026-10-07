# GeoMap

A lightweight [MapLibre GL](https://maplibre.org) map with three layer kinds —
GeoJSON features, XYZ raster tiles and quantized **grid** rasters — and a built-in
layer panel. Every trait is plain JSON, so the map renders the same in a live
kernel and on a static page, and the reader can switch bands, stretch and
colormaps with no kernel at all.

## Import

```python
from manywidgets import GeoMap, GridLayer
from manywidgets.geo_map import corners_from_bounds, corners_from_coords
```

## Example

```{code-cell} python
import numpy as np
from manywidgets import GeoMap, GridLayer

# A synthetic "backscatter" window in dB, placed by its outer corners (TL, TR, BR, BL).
y, x = np.mgrid[0:200, 0:300]
hh = -18 + 6 * np.sin(x / 25) * np.cos(y / 20) + np.random.normal(0, 1.5, x.shape)
hv = hh - 7 + np.random.normal(0, 1, x.shape)
hh[20:40, 20:60] = np.nan  # a nodata hole
corners = [[-116.75, 36.05], [-116.55, 36.05], [-116.55, 35.90], [-116.75, 35.90]]

grid = GridLayer.from_arrays(
    {"HH": hh, "HV": hv, "HH/HV": hh - hv},
    corners,
    id="window",
    label="Backscatter window",
    quantize={"HH": (-30, 5), "HV": (-35, 0), "HH/HV": (0, 15)},
    units="dB",
    default_ranges={"HH": (-25, -10), "HV": (-32, -17), "HH/HV": (3, 11)},
    composites={"Dual-pol RGB": ["HH", "HV", "HH/HV"]},
    colormap="gray",
)

m = GeoMap(basemap="satellite", height="420px")
m.add_grid(grid)
m.add_geojson(
    {"type": "Feature", "properties": {"name": "footprint"},
     "geometry": {"type": "Polygon", "coordinates": [[[-116.8, 36.1], [-116.5, 36.1], [-116.5, 35.85], [-116.8, 35.85], [-116.8, 36.1]]]}},
    id="footprint", id_property="name", fill_opacity=0.0, line="#ffd166",
)
m
```

## API

{api-table}

### Layers

- **`add_geojson(data, id=..., id_property=..., tooltip=[...], fill=, line=, ...)`** —
  a FeatureCollection / Feature / Geometry dict, or anything with
  `__geo_interface__` (a GeoDataFrame, a shapely geometry). Clicking a feature
  sets `selected` to its id (`id_property`, else the feature `id`, else its
  index); hovering sets `hovered` and shows the `tooltip` properties.
- **`add_xyz(url, ...)`** — a `{z}/{x}/{y}` tile template (TiTiler `tilejson`
  `tiles[0]`, NASA GIBS, OSM …). Tiles are fetched by the viewer's browser, so
  the URL must work without credentials.
- **`add_grid(GridLayer.from_arrays({...}, corners, ...))`** — 2-D arrays
  quantized to one byte per pixel per band (0 = nodata), with optional RGB
  `composites`. `corners` are the image's outer corners as `[lon, lat]` in TL,
  TR, BR, BL order; use `corners_from_bounds(left, bottom, right, top, crs)` or
  `corners_from_coords(x, y, crs)` (`pip install "manywidgets[geo]"` for the
  `crs` reprojection via pyproj). The quad is placed on the map without
  resampling, so a projected (e.g. UTM) window keeps its pixels.

Each layer's reader-adjustable state (visibility, opacity, active band,
stretch range, colormap) lives in `layer_state`, keyed by layer id — it is what
the panel writes, and what you set from Python to choose the initial look.

### Linking

`selected` / `hovered` are two-way strings, so a map and a
[Table](table.ipynb) stay in sync with a kernel-free link:

```python
from ipywidgets import jslink
jslink((table, "selected"), (m, "selected"))
```

### Size

The data of a grid layer is carried as base64 inside the widget state (≈1.33 ×
the raw bytes): an 800 × 800 band is ≈ 0.85 MB. `GridLayer.nbytes` reports it.
The MapLibre bundle itself (≈ 0.8 MB) is stored once per `GeoMap` instance in an
executed notebook's widget state.
