import pytest

pytest.importorskip("lonboard")

import ipywidgets  # noqa: E402
import traitlets  # noqa: E402

from manywidgets.lonboard import MapCompare  # noqa: E402


class DummyMap(ipywidgets.Widget):
    """A minimal stand-in for a lonboard Map (satisfies Instance(Widget) and
    carries a ``view_state`` attribute for the alignment test)."""

    view_state = traitlets.Any(default_value=None)


VIEW = {"longitude": -74.0, "latitude": 40.7, "zoom": 10}


def test_positional_and_defaults():
    before, after = DummyMap(), DummyMap()
    mc = MapCompare(before, after)
    assert mc.before is before
    assert mc.after is after
    assert mc.position == 0.5
    assert mc.orientation == "vertical"
    assert mc.sync_views is True
    assert mc.height == "500px"
    assert mc.initial_view == "before"


def test_traits_synced():
    for name in (
        "before",
        "after",
        "position",
        "orientation",
        "sync_views",
        "height",
        "initial_view",
        "widget_id",
    ):
        assert MapCompare.class_traits()[name].metadata.get("sync") is True


def test_myst_child_traits():
    assert MapCompare()._myst_child_traits == ["before", "after"]


def test_auto_widget_id_prefix():
    assert MapCompare().widget_id.startswith("mapcompare_")


def test_orientation_validation():
    with pytest.raises(traitlets.TraitError):
        MapCompare(orientation="diagonal")


def test_initial_view_validation():
    with pytest.raises(traitlets.TraitError):
        MapCompare(initial_view="middle")


def test_position_clamped():
    assert MapCompare(position=2.0).position == 1.0
    assert MapCompare(position=-3.0).position == 0.0
    assert MapCompare(position=0.25).position == 0.25


def test_align_once_copies_view_state():
    before = DummyMap(view_state=VIEW)
    after = DummyMap()
    MapCompare(before, after)
    assert after.view_state == VIEW


def test_align_once_respects_initial_view_after():
    before = DummyMap()
    after = DummyMap(view_state=VIEW)
    MapCompare(before, after, initial_view="after")
    assert before.view_state == VIEW


def test_align_once_noop_when_source_unset():
    before = DummyMap()  # view_state is None
    after = DummyMap(view_state=VIEW)
    MapCompare(before, after)  # initial_view="before" → source has no view_state
    # after keeps its own; nothing raised
    assert after.view_state == VIEW
