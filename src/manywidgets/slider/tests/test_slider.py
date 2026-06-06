from manywidgets import Slider


def test_defaults_and_sync():
    s = Slider()
    assert s.value == 0.0 and s.min == 0.0 and s.max == 100.0 and s.step == 1.0
    for name in ("value", "min", "max", "step", "label", "widget_id"):
        assert s.trait_metadata(name, "sync") is True


def test_construct_with_values():
    s = Slider(label="Amp", min=0, max=5, value=2, step=0.5)
    assert (s.label, s.min, s.max, s.value, s.step) == ("Amp", 0, 5, 2, 0.5)


def test_auto_widget_id_prefix():
    assert Slider().widget_id.startswith("slider_")
