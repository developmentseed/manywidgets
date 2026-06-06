import pytest

pytest.importorskip("lonboard")

from manywidgets import Slider  # noqa: E402  (stand-in Widget for `layer`)
from manywidgets.lonboard import LayerFilter  # noqa: E402


def test_defaults_value_all_categories():
    f = LayerFilter(Slider(), categories=[[0, "Shallow"], [1, "Deep"], [2, "Very deep"]])
    assert f.value == [0, 1, 2]  # all enabled by default


def test_scalar_categories():
    f = LayerFilter(categories=["a", "b"])
    assert f.value == ["a", "b"]


def test_explicit_value():
    f = LayerFilter(categories=[1, 2, 3], value=[2])
    assert f.value == [2]


def test_traits_synced():
    for name in ("layer", "categories", "value", "label", "widget_id"):
        assert LayerFilter.class_traits()[name].metadata.get("sync") is True


def test_auto_widget_id_prefix():
    assert LayerFilter().widget_id.startswith("layerfilter_")
