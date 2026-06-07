from manywidgets import Legend


def test_defaults_and_sync():
    leg = Legend()
    assert leg.entries == [] and leg.title == ""
    for name in ("entries", "title", "widget_id"):
        assert leg.trait_metadata(name, "sync") is True


def test_entries_and_title():
    leg = Legend([[[230, 30, 30], "High"], ["#0a0", "Low"]], title="Cat")
    assert leg.entries == [[[230, 30, 30], "High"], ["#0a0", "Low"]]
    assert leg.title == "Cat"


def test_numpy_color_coerced_to_list():
    np = __import__("pytest").importorskip("numpy")
    leg = Legend([[np.array([1, 2, 3], dtype="uint8"), "A"]])
    color = leg.entries[0][0]
    assert color == [1, 2, 3]
    assert type(color).__module__ == "builtins"


def test_auto_widget_id_prefix():
    assert Legend().widget_id.startswith("legend_")
