import pytest

pytest.importorskip("lonboard")

from manywidgets import RangeSlider, Slider  # noqa: E402
from manywidgets.lonboard import FilterBinder  # noqa: E402


def test_source_layer_and_defaults():
    src = RangeSlider()
    layer = Slider()  # stand-in Widget for the layer
    fb = FilterBinder(src, layer)
    assert fb.source is src and fb.layer is layer
    assert fb.low_field == "low" and fb.high_field == "high"
    assert fb.filter_field == "filter_range"


def test_accepts_list_of_layers():
    src = RangeSlider()
    layers = [Slider(), Slider()]  # stand-in Widgets for layers
    fb = FilterBinder(src, layers)
    assert fb.layer == layers


def test_traits_synced():
    for name in ("source", "layer", "low_field", "high_field", "filter_field"):
        assert FilterBinder.class_traits()[name].metadata.get("sync") is True


def test_auto_widget_id_prefix():
    assert FilterBinder().widget_id.startswith("filterbinder_")
