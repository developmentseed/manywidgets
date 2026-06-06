import pytest

from manywidgets import Chart


def test_defaults():
    c = Chart()
    assert c.chart_type == "line"
    assert c.series_data == []
    assert c.width == 800 and c.height == 400
    for name in ("chart_type", "series_data", "title", "width", "height", "widget_id"):
        assert c.trait_metadata(name, "sync") is True


def test_add_series_with_xy():
    c = Chart()
    c.add_series(x=[0, 1, 2], y=[10, 20, 30], name="s1")
    assert len(c.series_data) == 1
    assert c.series_data[0]["name"] == "s1"
    assert c.series_data[0]["data"] == [[0, 10], [1, 20], [2, 30]]


def test_add_series_with_data_pairs_and_color():
    c = Chart()
    c.add_series(data=[[0, 1], [1, 2]], name="pairs", color="#abc")
    assert c.series_data[0]["data"] == [[0, 1], [1, 2]]
    assert c.series_data[0]["color"] == "#abc"


def test_numpy_coercion_to_plain_python():
    np = pytest.importorskip("numpy")
    c = Chart()
    c.add_series(x=np.arange(3), y=np.array([1.0, 2.0, 3.0]), name="np")
    data = c.series_data[0]["data"]
    assert data == [[0, 1.0], [1, 2.0], [2, 3.0]]
    for pair in data:
        for v in pair:
            assert type(v).__module__ == "builtins"


def test_update_and_clear():
    c = Chart()
    c.add_series(x=[0, 1], y=[0, 1], name="s")
    c.update_series(0, x=[0, 1], y=[5, 6])
    assert c.series_data[0]["data"] == [[0, 5], [1, 6]]
    c.clear_series()
    assert c.series_data == []


def test_add_series_requires_data():
    with pytest.raises(ValueError):
        Chart().add_series(name="missing")


def test_set_options_merges():
    c = Chart()
    c.set_options(responsive=False)
    c.set_options(foo="bar")
    assert c.chart_options == {"responsive": False, "foo": "bar"}
