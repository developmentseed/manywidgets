import pytest

pytest.importorskip("lonboard")

from manywidgets import Slider  # noqa: E402  (a stand-in Widget for `map`)
from manywidgets.lonboard import MapFlyer  # noqa: E402

NYC = {"label": "NYC", "longitude": -74, "latitude": 40.7, "zoom": 10}


def test_map_positional_and_defaults():
    dummy = Slider()  # any ipywidgets Widget satisfies the Instance(Widget) trait
    f = MapFlyer(dummy, locations=[NYC], duration=2000)
    assert f.map is dummy
    assert f.locations == [NYC]
    assert f.duration == 2000


def test_traits_synced():
    for name in ("map", "locations", "duration", "label", "widget_id"):
        assert MapFlyer.class_traits()[name].metadata.get("sync") is True


def test_auto_widget_id_prefix():
    assert MapFlyer().widget_id.startswith("mapflyer_")
