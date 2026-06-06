from manywidgets import NumberDisplay


def test_defaults_and_sync():
    n = NumberDisplay()
    assert n.value == 0.0 and n.format == "{}" and n.duration == 600
    for name in ("value", "format", "duration", "label", "widget_id"):
        assert n.trait_metadata(name, "sync") is True


def test_construct():
    n = NumberDisplay(value=42, format="{:,.0f}", duration=0, label="Total")
    assert (n.value, n.format, n.duration, n.label) == (42, "{:,.0f}", 0, "Total")


def test_auto_widget_id_prefix():
    assert NumberDisplay().widget_id.startswith("numberdisplay_")
