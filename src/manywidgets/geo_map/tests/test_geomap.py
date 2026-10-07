import base64
import json

import pytest

from manywidgets.geo_map import GeoMap, GridLayer, corners_from_bounds, corners_from_coords

np = pytest.importorskip("numpy")

SYNC_TRAITS = ("basemap", "height", "view_state", "fit_bounds", "layers", "layer_state", "selected", "hovered", "controls", "zoom_to_selected")


def test_defaults_and_sync():
    m = GeoMap()
    assert m.basemap == "positron" and m.height == "480px" and m.layers == []
    assert m.fit_bounds is None  # not [] — the JS treats only a 4-list as bounds
    for name in SYNC_TRAITS + ("widget_id",):
        assert m.trait_metadata(name, "sync") is True
    assert m.widget_id.startswith("geomap_")


def test_state_is_json_only():
    m = GeoMap(basemap="satellite")
    m.add_geojson({"type": "Point", "coordinates": [1.0, 2.0]}, id="p")
    m.add_xyz("https://t/{z}/{x}/{y}.png", id="x", attribution="a")
    m.add_grid(GridLayer.from_arrays({"v": np.arange(6.0).reshape(2, 3)}, [[0, 1], [3, 1], [3, 0], [0, 0]]))
    state = {k: getattr(m, k) for k in SYNC_TRAITS}
    json.dumps(state)  # must not raise
    assert [l["id"] for l in m.layers] == ["p", "x", "grid"]


def test_add_replaces_same_id_and_remove():
    m = GeoMap()
    m.add_geojson({"type": "Point", "coordinates": [0, 0]}, id="a")
    m.add_geojson({"type": "Point", "coordinates": [1, 1]}, id="a", fill="#f00", tooltip=["x"])
    assert len(m.layers) == 1
    assert m.layers[0]["style"] == {"fill": "#f00"} and m.layers[0]["tooltip"] == ["x"]
    m.remove_layer("a")
    assert m.layers == []


def test_geo_interface_and_bounds():
    class Geo:
        __geo_interface__ = {
            "type": "FeatureCollection",
            "features": [
                {"type": "Feature", "properties": {"n": "a"}, "geometry": {"type": "Polygon", "coordinates": [[[0, 0], [2, 0], [2, 3], [0, 0]]]}},
            ],
        }

    m = GeoMap()
    m.add_geojson(Geo(), id_property="n")
    assert m.layers[0]["id_property"] == "n"
    assert m.bounds() == [0, 0, 2, 3]
    m.add_grid(GridLayer.from_arrays({"v": np.ones((2, 2))}, [[-1, 5], [1, 5], [1, 4], [-1, 4]]))
    assert m.bounds() == [-1, 0, 2, 5]


def test_grid_quantization_round_trip():
    arr = np.array([[0.0, 5.0], [10.0, np.nan]])
    g = GridLayer.from_arrays({"v": arr}, [[0, 1], [1, 1], [1, 0], [0, 0]], quantize=(0, 10), units="dB", default_ranges={"v": (2, 8)})
    band = g.spec["bands"]["v"]
    q = np.frombuffer(base64.b64decode(band["data"]), dtype="uint8").reshape(2, 2)
    assert q.tolist() == [[1, 128], [255, 0]]  # 0 → 1, 5 → 128, 10 → 255, NaN → 0
    back = q.astype("float64") * band["scale"] + band["offset"]
    assert np.allclose(back[q > 0], arr[np.isfinite(arr)], atol=band["scale"])
    assert band["unit"] == "dB" and band["default_range"] == [2.0, 8.0]
    assert g.spec["width"] == 2 and g.spec["height"] == 2 and g.spec["active"] == "v"
    assert g.nbytes == len(band["data"])


def test_grid_clips_outside_quantize_span_and_validates():
    arr = np.array([[-100.0, 100.0]])
    g = GridLayer.from_arrays({"v": arr}, [[0, 1], [1, 1], [1, 0], [0, 0]], quantize={"v": (0, 1)})
    q = np.frombuffer(base64.b64decode(g.spec["bands"]["v"]["data"]), dtype="uint8")
    assert q.tolist() == [1, 255]
    with pytest.raises(ValueError):
        GridLayer.from_arrays({"a": np.ones((2, 2)), "b": np.ones((3, 3))}, [[0, 0]] * 4)
    with pytest.raises(ValueError):
        GridLayer.from_arrays({"a": np.ones((2, 2))}, [[0, 0]] * 4, composites={"c": ["a", "zzz", "a"]})
    with pytest.raises(ValueError):
        GridLayer.from_arrays({"a": np.ones((2, 2))}, [[0, 0]] * 3)


def test_composites_and_numpy_inputs_are_json_safe():
    bands = {"hh": np.random.rand(4, 5).astype("float32"), "hv": np.random.rand(4, 5)}
    g = GridLayer.from_arrays(bands, np.array([[0, 1], [1, 1], [1, 0], [0, 0]]), composites={"rgb": ["hh", "hv", "hh"]}, active="rgb")
    json.dumps(g.spec)
    assert g.spec["composites"] == {"rgb": ["hh", "hv", "hh"]} and g.spec["active"] == "rgb"
    assert g.spec["band_names"] == ["hh", "hv"]


def test_corners_lonlat_without_crs():
    assert corners_from_bounds(0, 0, 2, 1) == [[0, 1], [2, 1], [2, 0], [0, 0]]
    # pixel centers 0.5, 1.5 with 1-unit spacing → outer edges 0..2; y given top-first
    assert corners_from_coords([0.5, 1.5], [1.5, 0.5]) == [[0, 2], [2, 2], [2, 0], [0, 0]]


def test_corners_with_crs_needs_pyproj():
    pyproj = pytest.importorskip("pyproj")
    assert pyproj
    c = corners_from_bounds(500000, 4000000, 510000, 4010000, crs=32610)
    assert len(c) == 4 and -130 < c[0][0] < -110 and 30 < c[0][1] < 40
    assert c[0][1] > c[3][1]  # TL north of BL
