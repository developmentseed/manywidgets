"""Tests for the manywidgets vertical slice (Chart, Slider, Binder).

These exercise the Python surface: imports, trait defaults/sync, the Chart data
API (incl. numpy coercion), auto widget_id assignment, jslink construction, and
Binder's instance -> widget_id extraction. The JS side is covered by the build
(`npm run build` + `tsc --noEmit`) and the docs static-export check.
"""

import pytest

import manywidgets
from manywidgets import BaseWidget, Binder, Chart, Slider


def test_top_level_exports():
    assert manywidgets.__version__
    for cls in (Chart, Slider, Binder, BaseWidget):
        assert isinstance(cls, type)


def test_widget_id_auto_and_unique():
    a = Slider()
    b = Slider()
    assert a.widget_id and b.widget_id
    assert a.widget_id != b.widget_id
    assert a.widget_id.startswith("slider_")
    # explicit ids are respected
    c = Slider(widget_id="my_slider")
    assert c.widget_id == "my_slider"


def test_slider_traits_sync():
    s = Slider(label="Amp", min=0, max=5, value=2, step=0.5)
    synced = s.trait_names()
    for name in ("value", "min", "max", "step", "label", "widget_id"):
        assert name in synced
        assert s.trait_metadata(name, "sync") is True
    assert s.value == 2


def test_chart_add_series_with_xy():
    chart = Chart()
    chart.add_series(x=[0, 1, 2], y=[10, 20, 30], name="s1")
    assert len(chart.series_data) == 1
    assert chart.series_data[0]["name"] == "s1"
    assert chart.series_data[0]["data"] == [[0, 10], [1, 20], [2, 30]]


def test_chart_add_series_with_data_pairs():
    chart = Chart()
    chart.add_series(data=[[0, 1], [1, 2]], name="pairs")
    assert chart.series_data[0]["data"] == [[0, 1], [1, 2]]


def test_chart_numpy_coercion():
    np = pytest.importorskip("numpy")
    chart = Chart()
    chart.add_series(x=np.arange(3), y=np.array([1.0, 2.0, 3.0]), name="np")
    data = chart.series_data[0]["data"]
    # values must be plain Python numbers (JSON-serialisable), not numpy scalars
    assert data == [[0, 1.0], [1, 2.0], [2, 3.0]]
    for pair in data:
        for v in pair:
            assert type(v).__module__ == "builtins"


def test_chart_update_and_clear():
    chart = Chart()
    chart.add_series(x=[0, 1], y=[0, 1], name="s")
    chart.update_series(0, x=[0, 1], y=[5, 6])
    assert chart.series_data[0]["data"] == [[0, 5], [1, 6]]
    chart.clear_series()
    assert chart.series_data == []


def test_chart_add_series_requires_data():
    with pytest.raises(ValueError):
        Chart().add_series(name="missing")


def test_chart_set_options_merges():
    chart = Chart()
    chart.set_options(responsive=False)
    chart.set_options(foo="bar")
    assert chart.chart_options == {"responsive": False, "foo": "bar"}


def test_jslink_builds_link_widget():
    from ipywidgets import jsdlink, jslink

    a = Slider(value=1)
    b = Slider(value=2)
    link = jslink((a, "value"), (b, "value"))
    assert link is not None
    dlink = jsdlink((a, "value"), (b, "value"))
    assert dlink is not None


def test_binder_extracts_ids_from_instances():
    src = Slider()
    dst = Chart()
    binder = Binder(
        source=src, source_field="value",
        target=dst, target_field="height",
        multiplier=100, offset=200,
    )
    assert binder.source_widget_id == src.widget_id
    assert binder.target_widget_id == dst.widget_id
    assert binder.source_field == "value"
    assert binder.target_field == "height"
    assert binder.multiplier == 100
    assert binder.offset == 200


def test_binder_accepts_id_strings():
    binder = Binder(
        source="slider_99", target="chart_99", target_field="title",
    )
    assert binder.source_widget_id == "slider_99"
    assert binder.target_widget_id == "chart_99"


def test_binder_requires_target_field():
    with pytest.raises(ValueError):
        Binder(source=Slider(), target=Chart())
