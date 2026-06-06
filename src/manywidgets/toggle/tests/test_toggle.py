from manywidgets import Toggle


def test_defaults_and_sync():
    t = Toggle()
    assert t.value is False
    for name in ("value", "label", "widget_id"):
        assert t.trait_metadata(name, "sync") is True


def test_construct():
    t = Toggle(label="Show", value=True)
    assert t.value is True and t.label == "Show"


def test_auto_widget_id_prefix():
    assert Toggle().widget_id.startswith("toggle_")
