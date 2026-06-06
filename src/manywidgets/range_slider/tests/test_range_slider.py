from manywidgets import RangeSlider


def test_defaults_and_sync():
    r = RangeSlider()
    assert r.low == 0.0 and r.high == 100.0
    for name in ("low", "high", "min", "max", "step", "label", "widget_id"):
        assert r.trait_metadata(name, "sync") is True


def test_construct_with_values():
    r = RangeSlider(label="Window", min=0, max=10, low=2, high=8, step=0.5)
    assert (r.low, r.high, r.min, r.max, r.step) == (2, 8, 0, 10, 0.5)


def test_auto_widget_id_prefix():
    assert RangeSlider().widget_id.startswith("rangeslider_")
