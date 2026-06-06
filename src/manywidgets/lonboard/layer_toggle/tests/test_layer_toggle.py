import pytest

pytest.importorskip("lonboard")

from manywidgets import Slider  # noqa: E402  (a stand-in Widget for `layer`)
from manywidgets.lonboard import LayerToggle  # noqa: E402


def test_layer_positional_and_defaults():
    dummy = Slider()  # any ipywidgets Widget satisfies the Instance(Widget) trait
    t = LayerToggle(dummy, label="Buildings")
    assert t.layer is dummy
    assert t.value is True
    assert t.label == "Buildings"


def test_traits_synced():
    for name in ("layer", "value", "label", "widget_id"):
        assert LayerToggle.class_traits()[name].metadata.get("sync") is True


def test_auto_widget_id_prefix():
    assert LayerToggle().widget_id.startswith("layertoggle_")
