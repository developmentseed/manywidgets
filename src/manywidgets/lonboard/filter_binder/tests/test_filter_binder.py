import pytest
import traitlets
from ipywidgets import Widget

pytest.importorskip("lonboard")

from manywidgets import RangeSlider, Slider  # noqa: E402
from manywidgets.lonboard import FilterBinder  # noqa: E402


class _FakeLayer(Widget):
    """Minimal real Widget standing in for a lonboard layer with filter_range."""

    filter_range = traitlets.Any(allow_none=True).tag(sync=True)


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


def test_python_observer_syncs_without_display():
    # The binder is never rendered; the Python observer should still drive the layer.
    src = RangeSlider(low=0, high=10)
    layer = _FakeLayer()
    FilterBinder(src, layer)
    assert layer.filter_range == [0, 10]  # initial sync
    src.high = 5
    assert layer.filter_range == [0, 5]


def test_python_observer_syncs_multiple_layers():
    src = RangeSlider(low=1, high=9)
    layers = [_FakeLayer(), _FakeLayer()]
    FilterBinder(src, layers)
    src.low = 3
    assert layers[0].filter_range == [3, 9]
    assert layers[1].filter_range == [3, 9]


def test_traits_synced():
    for name in ("source", "layer", "low_field", "high_field", "filter_field"):
        assert FilterBinder.class_traits()[name].metadata.get("sync") is True


def test_auto_widget_id_prefix():
    assert FilterBinder().widget_id.startswith("filterbinder_")
