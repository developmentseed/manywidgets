"""GeoMap — a lightweight MapLibre GL map with GeoJSON, XYZ-tile and "grid" layers.

Layers are plain JSON specs (see :meth:`GeoMap.add_geojson`, :meth:`GeoMap.add_xyz`
and :class:`GridLayer`), so a map renders identically in a live kernel and on a
static page: every trait is JSON-only (no binary buffers), which also means
JupyterLab's "Save Widget State" captures it completely.

A *grid* layer is a quantized scalar raster (uint8 per band, 0 = nodata) placed
by its four corner coordinates. Colouring — band/composite choice, stretch,
colormap, opacity — happens in the browser, so readers can explore the data
with no kernel. Build one with :meth:`GridLayer.from_arrays`.

``selected`` / ``hovered`` carry the id of the current GeoJSON feature and are
two-way, so they can be ``jslink``-ed to a :class:`~manywidgets.Table`.
"""

from __future__ import annotations

import base64
import math

import traitlets

from .._base import BaseWidget, asset

__all__ = ["GeoMap", "GridLayer", "corners_from_bounds", "corners_from_coords"]


def _json_safe(value):
    """Recursively coerce numpy scalars/arrays, tuples and NaN into JSON values."""
    if hasattr(value, "tolist"):
        value = value.tolist()
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def _to_geojson(data) -> dict:
    """Accept a GeoJSON dict (FeatureCollection/Feature/Geometry) or anything
    with ``__geo_interface__`` (geopandas, shapely)."""
    if hasattr(data, "__geo_interface__"):
        data = data.__geo_interface__
    if not isinstance(data, dict) or "type" not in data:
        raise TypeError("data must be GeoJSON (dict) or expose __geo_interface__")
    return _json_safe(data)


def _geojson_bounds(gj: dict):
    w = s = math.inf
    e = n = -math.inf

    def visit(c):
        nonlocal w, s, e, n
        if not isinstance(c, (list, tuple)) or not c:
            return
        if isinstance(c[0], (int, float)):
            x, y = c[0], c[1]
            w, e, s, n = min(w, x), max(e, x), min(s, y), max(n, y)
        else:
            for cc in c:
                visit(cc)

    def geom(g):
        if not g:
            return
        if g["type"] == "GeometryCollection":
            for gg in g["geometries"]:
                geom(gg)
        else:
            visit(g.get("coordinates"))

    t = gj["type"]
    if t == "FeatureCollection":
        for f in gj["features"]:
            geom(f.get("geometry"))
    elif t == "Feature":
        geom(gj.get("geometry"))
    else:
        geom(gj)
    return None if w == math.inf else [w, s, e, n]


class GridLayer:
    """Builder for a ``grid`` layer spec (a quantized scalar raster).

    Use :meth:`from_arrays`. The resulting :attr:`spec` dict is what goes into
    ``GeoMap.layers``; :meth:`GeoMap.add_grid` accepts either.
    """

    def __init__(self, spec: dict):
        self.spec = spec

    @classmethod
    def from_arrays(
        cls,
        bands: dict,
        corners,
        *,
        id: str = "grid",
        label: str | None = None,
        quantize=None,
        units=None,
        default_ranges=None,
        composites: dict | None = None,
        active: str | None = None,
        colormap: str = "gray",
        opacity: float = 1.0,
        visible: bool = True,
    ) -> "GridLayer":
        """Quantize 2-D float arrays to uint8 and build the layer spec.

        Parameters
        ----------
        bands
            ``{name: 2-D array}`` — all the same shape, row 0 = the top row of
            the image (north-most for a north-up window).
        corners
            Four ``[lon, lat]`` pairs in TL, TR, BR, BL order (the image's
            *outer* corners). See :func:`corners_from_bounds` /
            :func:`corners_from_coords`.
        quantize
            ``(lo, hi)`` applied to every band, or ``{name: (lo, hi)}``; values
            are clipped to this span then mapped to bytes 1..255 (0 = NaN). The
            default is each band's finite min/max.
        units
            A unit string for all bands or ``{name: unit}``; shown in readouts.
        default_ranges
            Initial stretch per band, ``{name: (lo, hi)}`` (e.g. 2–98 percentiles).
            Defaults to the quantize span.
        composites
            ``{name: [r_band, g_band, b_band]}`` RGB composites (each channel is
            stretched by that band's default range).
        active
            Band or composite shown first (default: the first band).
        """
        import numpy as np

        names = list(bands)
        if not names:
            raise ValueError("bands must not be empty")
        shape = None
        out_bands = {}
        for name in names:
            arr = np.asarray(bands[name], dtype="float64")
            if arr.ndim != 2:
                raise ValueError(f"band {name!r} must be 2-D, got shape {arr.shape}")
            if shape is None:
                shape = arr.shape
            elif arr.shape != shape:
                raise ValueError("all bands must share one shape")
            lo, hi = _per_band(quantize, name) or _finite_minmax(arr)
            if not (hi > lo):
                hi = lo + 1.0
            scale = (hi - lo) / 254.0
            offset = lo - scale  # byte q -> lo + (q - 1) * scale
            finite = np.isfinite(arr)
            q = np.zeros(shape, dtype="uint8")
            scaled = np.clip((arr[finite] - lo) / scale, 0, 254)
            q[finite] = np.rint(scaled).astype("uint8") + 1
            band = {
                "data": base64.b64encode(q.tobytes(order="C")).decode("ascii"),
                "scale": float(scale),
                "offset": float(offset),
            }
            unit = _per_band(units, name)
            if unit:
                band["unit"] = str(unit)
            dr = _per_band(default_ranges, name)
            band["default_range"] = [float(dr[0]), float(dr[1])] if dr else [float(lo), float(hi)]
            out_bands[name] = band
        if composites:
            for cname, chans in composites.items():
                if len(chans) != 3 or any(c not in out_bands for c in chans):
                    raise ValueError(f"composite {cname!r} must list 3 band names")
        spec = {
            "id": id,
            "type": "grid",
            "label": label or id,
            "corners": [[float(c[0]), float(c[1])] for c in corners],
            "width": int(shape[1]),
            "height": int(shape[0]),
            "bands": out_bands,
            "band_names": names,
            "composites": {k: list(v) for k, v in (composites or {}).items()},
            "active": active or names[0],
            "colormap": colormap,
            "opacity": float(opacity),
            "visible": bool(visible),
        }
        if len(spec["corners"]) != 4:
            raise ValueError("corners must be four [lon, lat] pairs (TL, TR, BR, BL)")
        return cls(spec)

    @property
    def nbytes(self) -> int:
        """Approximate size of the encoded band data (what the page will carry)."""
        return sum(len(b["data"]) for b in self.spec["bands"].values())


def _per_band(value, name):
    if value is None:
        return None
    if isinstance(value, dict):
        return value.get(name)
    return value


def _finite_minmax(arr):
    import numpy as np

    finite = arr[np.isfinite(arr)]
    if finite.size == 0:
        return (0.0, 1.0)
    return (float(finite.min()), float(finite.max()))


def corners_from_bounds(left, bottom, right, top, crs=None):
    """Outer corners (TL, TR, BR, BL) in lon/lat from axis-aligned bounds.

    ``crs`` is any pyproj-understood CRS of the bounds (e.g. ``32610`` or
    ``"EPSG:32610"``); ``None`` means the bounds are already lon/lat. Requires
    ``pyproj`` when ``crs`` is given (``pip install "manywidgets[geo]"``).
    """
    pts = [(left, top), (right, top), (right, bottom), (left, bottom)]
    if crs is None:
        return [[float(x), float(y)] for x, y in pts]
    from pyproj import Transformer

    tr = Transformer.from_crs(crs, 4326, always_xy=True)
    return [[float(lon), float(lat)] for lon, lat in (tr.transform(x, y) for x, y in pts)]


def corners_from_coords(x, y, crs=None, *, centers=True):
    """Outer corners from 1-D x/y coordinate arrays of a regular grid.

    With ``centers=True`` (xarray convention) the half-pixel margin is added so
    the corners are the image's outer edges. ``y`` may run either direction;
    the first y value is taken as the top row (so pass arrays in image order).
    """
    import numpy as np

    x = np.asarray(x, dtype="float64")
    y = np.asarray(y, dtype="float64")
    dx = (x[-1] - x[0]) / max(len(x) - 1, 1)
    dy = (y[-1] - y[0]) / max(len(y) - 1, 1)
    hx = dx / 2 if centers else 0.0
    hy = dy / 2 if centers else 0.0
    left, right = x[0] - hx, x[-1] + hx
    top, bottom = y[0] - hy, y[-1] + hy
    return corners_from_bounds(left, bottom, right, top, crs)


class GeoMap(BaseWidget):
    """A MapLibre GL map with GeoJSON, XYZ-tile and quantized-grid layers."""

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    basemap = traitlets.Unicode(
        "positron",
        help='"positron" | "dark-matter" | "voyager" | "satellite" | "osm" | "none" | "auto" (follows light/dark) | a style URL.',
    ).tag(sync=True)
    height = traitlets.Unicode("480px", help="CSS height of the map.").tag(sync=True)
    view_state = traitlets.Dict(
        {"longitude": 0.0, "latitude": 0.0, "zoom": 1.0},
        help="Camera as {longitude, latitude, zoom}; updated from the map on move.",
    ).tag(sync=True)
    fit_bounds = traitlets.List(
        default_value=None, allow_none=True, help="[west, south, east, north] to fit on load; None = fit all layers."
    ).tag(sync=True)
    layers = traitlets.List([], help="Layer specs (geojson | xyz | grid), drawn in list order.").tag(sync=True)
    layer_state = traitlets.Dict(
        {},
        help="Reader-adjustable per-layer state {id: {visible, opacity, active, range, colormap}} written by the panel.",
    ).tag(sync=True)
    selected = traitlets.Unicode("", help="Id of the selected GeoJSON feature (two-way).").tag(sync=True)
    hovered = traitlets.Unicode("", help="Id of the hovered GeoJSON feature (two-way).").tag(sync=True)
    controls = traitlets.Bool(True, help="Show the built-in layer panel.").tag(sync=True)
    zoom_to_selected = traitlets.Bool(True, help="Fit the map to a feature when `selected` changes.").tag(sync=True)

    def __init__(self, layers=None, *, basemap="positron", height="480px", **kwargs):
        kwargs.setdefault("basemap", basemap)
        kwargs.setdefault("height", height)
        if layers is not None:
            kwargs["layers"] = [self._spec(layer) for layer in layers]
        super().__init__(**kwargs)

    @staticmethod
    def _spec(layer) -> dict:
        if isinstance(layer, GridLayer):
            return layer.spec
        if isinstance(layer, dict) and layer.get("type") in ("geojson", "xyz", "grid"):
            return _json_safe(layer)
        raise TypeError("layers must be GridLayer instances or geojson/xyz/grid spec dicts")

    def _add(self, spec: dict) -> dict:
        self.layers = [l for l in self.layers if l.get("id") != spec["id"]] + [spec]
        return spec

    def add_geojson(
        self,
        data,
        *,
        id: str = "features",
        id_property: str | None = None,
        label: str | None = None,
        fill: str | None = None,
        line: str | None = None,
        fill_opacity: float | None = None,
        line_width: float | None = None,
        selected_fill: str | None = None,
        selected_line: str | None = None,
        tooltip: list | None = None,
        visible: bool = True,
    ) -> dict:
        """Add a GeoJSON layer (FeatureCollection / Feature / Geometry dict, or a
        geopandas GeoDataFrame / shapely geometry via ``__geo_interface__``).

        ``id_property`` names the feature property used as the feature id for
        ``selected`` / ``hovered`` (defaults to the feature's own ``id``, else its
        index). ``tooltip`` lists the properties shown on hover.
        """
        style = {
            k: v
            for k, v in {
                "fill": fill,
                "line": line,
                "fill_opacity": fill_opacity,
                "line_width": line_width,
                "selected_fill": selected_fill,
                "selected_line": selected_line,
            }.items()
            if v is not None
        }
        spec = {
            "id": id,
            "type": "geojson",
            "label": label or id,
            "data": _to_geojson(data),
            "visible": bool(visible),
        }
        if id_property:
            spec["id_property"] = id_property
        if style:
            spec["style"] = style
        if tooltip:
            spec["tooltip"] = list(tooltip)
        return self._add(spec)

    def add_xyz(
        self,
        url: str,
        *,
        id: str = "tiles",
        label: str | None = None,
        attribution: str = "",
        tile_size: int = 256,
        min_zoom: int = 0,
        max_zoom: int = 22,
        opacity: float = 1.0,
        visible: bool = True,
    ) -> dict:
        """Add an XYZ raster tile layer (``{z}/{x}/{y}`` template, e.g. a TiTiler
        tilejson ``tiles[0]`` URL or NASA GIBS). Tiles are fetched by the viewer's
        browser, so the URL must be reachable without credentials."""
        return self._add(
            {
                "id": id,
                "type": "xyz",
                "label": label or id,
                "url": url,
                "attribution": attribution,
                "tile_size": int(tile_size),
                "min_zoom": int(min_zoom),
                "max_zoom": int(max_zoom),
                "opacity": float(opacity),
                "visible": bool(visible),
            }
        )

    def add_grid(self, grid) -> dict:
        """Add a :class:`GridLayer` (or a ready grid spec dict)."""
        return self._add(self._spec(grid))

    def remove_layer(self, id: str) -> None:
        self.layers = [l for l in self.layers if l.get("id") != id]

    def bounds(self):
        """[west, south, east, north] covering every geojson/grid layer, or None."""
        out = None
        for layer in self.layers:
            b = None
            if layer["type"] == "geojson":
                b = _geojson_bounds(layer["data"])
            elif layer["type"] == "grid":
                xs = [c[0] for c in layer["corners"]]
                ys = [c[1] for c in layer["corners"]]
                b = [min(xs), min(ys), max(xs), max(ys)]
            if b is None:
                continue
            out = b if out is None else [min(out[0], b[0]), min(out[1], b[1]), max(out[2], b[2]), max(out[3], b[3])]
        return out
