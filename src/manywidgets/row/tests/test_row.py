from manywidgets import Row, Slider, Stat


def test_children_positional():
    a, b = Slider(), Stat()
    r = Row(a, b)
    assert r.children == [a, b]


def test_children_kwarg_and_defaults():
    a = Slider()
    r = Row(children=[a])
    assert r.children == [a]
    assert r.gap == "8px" and r.align == "stretch"


def test_marker_and_sync():
    r = Row()
    assert r._myst_child_traits == ["children"]
    for name in ("children", "gap", "align", "widget_id"):
        assert r.trait_metadata(name, "sync") is True


def test_auto_widget_id_prefix():
    assert Row().widget_id.startswith("row_")
