from manywidgets import Fullscreen, Row, Stat


def test_positional_child():
    chart = Stat()
    f = Fullscreen(chart)
    assert f.child is chart
    assert f.fullscreen is None


def test_alternate_layout_kwarg():
    chart = Stat()
    dashboard = Row(chart, Stat())
    f = Fullscreen(chart, fullscreen=dashboard)
    assert f.child is chart
    assert f.fullscreen is dashboard


def test_defaults():
    f = Fullscreen()
    assert f.child is None
    assert f.fullscreen is None
    assert f.is_open is False


def test_marker_and_sync():
    f = Fullscreen()
    assert f._myst_child_traits == ["child", "fullscreen"]
    for name in ("child", "fullscreen", "is_open", "widget_id"):
        assert f.trait_metadata(name, "sync") is True
    # child traits must carry widget_serialization so refs serialize as IPY_MODEL_<id>
    assert f.trait_metadata("child", "to_json") is not None
    assert f.trait_metadata("fullscreen", "to_json") is not None


def test_programmatic_open():
    f = Fullscreen()
    f.is_open = True
    assert f.is_open is True
    f.is_open = False
    assert f.is_open is False


def test_auto_widget_id_prefix():
    assert Fullscreen().widget_id.startswith("fullscreen_")


def test_explicit_widget_id():
    assert Fullscreen(widget_id="my-dashboard").widget_id == "my-dashboard"
