from manywidgets import Stat


def test_defaults_and_sync():
    s = Stat()
    assert s.value == "" and s.delta is None
    for name in ("label", "value", "unit", "delta", "widget_id"):
        assert s.trait_metadata(name, "sync") is True


def test_construct():
    s = Stat(label="Revenue", value=1234, unit="USD", delta=-5)
    assert (s.label, s.value, s.unit, s.delta) == ("Revenue", 1234, "USD", -5)


def test_auto_widget_id_prefix():
    assert Stat().widget_id.startswith("stat_")
