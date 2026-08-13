from manywidgets import Grid, Stat


def test_children_positional_and_defaults():
    cards = [Stat(), Stat(), Stat()]
    g = Grid(*cards)
    assert g.children == cards
    assert g.columns == 2 and g.gap == "8px"


def test_flattens_list_args():
    cards = [Stat(), Stat()]
    g = Grid(Stat(), cards)  # second arg is itself a list
    assert len(g.children) == 3


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


def test_template_rows_and_height_kwargs():
    g = Grid(Stat(), template_rows="auto 1fr auto", height="500px")
    assert g.template_rows == "auto 1fr auto"
    assert g.height == "500px"


def test_template_rows_and_height_default_empty():
    g = Grid()
    assert g.template_rows == ""
    assert g.height == ""
