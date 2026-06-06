from manywidgets import Grid, Stat


def test_children_positional_and_defaults():
    cards = [Stat(), Stat(), Stat()]
    g = Grid(*cards)
    assert g.children == cards
    assert g.columns == 2 and g.gap == "8px"


def test_columns_kwarg():
    g = Grid(Stat(), Stat(), columns=3)
    assert g.columns == 3


def test_marker_and_sync():
    g = Grid()
    assert g._myst_child_traits == ["children"]
    for name in ("children", "columns", "gap", "widget_id"):
        assert g.trait_metadata(name, "sync") is True


def test_auto_widget_id_prefix():
    assert Grid().widget_id.startswith("grid_")
