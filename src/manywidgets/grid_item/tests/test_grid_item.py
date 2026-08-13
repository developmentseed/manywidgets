from manywidgets import Grid, GridItem, Stat


def test_positional_child_and_defaults():
    chart = Stat()
    item = GridItem(chart)
    assert item.child is chart
    assert item.col_span == 1
    assert item.row_span == 1
    assert item.area == ""


def test_span_kwargs():
    item = GridItem(Stat(), col_span=2, row_span=3)
    assert item.col_span == 2
    assert item.row_span == 3


def test_area_kwarg():
    item = GridItem(Stat(), area="header")
    assert item.area == "header"


def test_marker_and_sync():
    item = GridItem()
    assert item._myst_child_traits == ["child"]
    for name in ("child", "col_span", "row_span", "area", "widget_id"):
        assert item.trait_metadata(name, "sync") is True
    assert item.trait_metadata("child", "to_json") is not None


def test_auto_widget_id_prefix():
    assert GridItem().widget_id.startswith("griditem_")


def test_composes_inside_grid():
    g = Grid(GridItem(Stat(), col_span=2), Stat(), columns=3)
    assert len(g.children) == 2
    assert isinstance(g.children[0], GridItem)
    assert g.children[0].col_span == 2
