from manywidgets import Text


def test_defaults_and_sync():
    t = Text()
    assert t.value == "" and t.markdown is False
    for name in ("value", "markdown", "widget_id"):
        assert t.trait_metadata(name, "sync") is True


def test_construct():
    t = Text(value="**hi**", markdown=True)
    assert t.value == "**hi**" and t.markdown is True


def test_auto_widget_id_prefix():
    assert Text().widget_id.startswith("text_")
