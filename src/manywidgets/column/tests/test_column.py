from manywidgets import Column, NumberDisplay, Slider


def test_children_positional():
    a, b = Slider(), NumberDisplay()
    c = Column(a, b)
    assert c.children == [a, b]


def test_defaults_and_marker():
    c = Column()
    assert c.gap == "8px" and c.align == "stretch"
    assert c._myst_child_traits == ["children"]
    for name in ("children", "gap", "align", "widget_id"):
        assert c.trait_metadata(name, "sync") is True


def test_auto_widget_id_prefix():
    assert Column().widget_id.startswith("column_")
