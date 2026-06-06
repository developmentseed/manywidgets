from manywidgets import Dropdown


def test_defaults_value_first_option():
    d = Dropdown(options=["a", "b", "c"])
    assert d.options == ["a", "b", "c"]
    assert d.value == "a"
    for name in ("options", "value", "label", "widget_id"):
        assert d.trait_metadata(name, "sync") is True


def test_label_value_pairs():
    d = Dropdown(options=[["One", 1], ["Two", 2]])
    assert d.value == 1


def test_explicit_value():
    d = Dropdown(options=["a", "b"], value="b")
    assert d.value == "b"


def test_empty_options_no_value():
    d = Dropdown()
    assert d.value is None


def test_auto_widget_id_prefix():
    assert Dropdown().widget_id.startswith("dropdown_")
