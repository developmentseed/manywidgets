from manywidgets import NumberInput


def test_defaults_and_sync():
    n = NumberInput()
    assert n.value == 0.0 and n.step == 1.0
    assert n.min is None and n.max is None
    for name in ("value", "min", "max", "step", "label", "widget_id"):
        assert n.trait_metadata(name, "sync") is True


def test_construct():
    n = NumberInput(label="Count", min=0, max=10, value=4, step=2)
    assert (n.value, n.min, n.max, n.step) == (4, 0, 10, 2)


def test_auto_widget_id_prefix():
    assert NumberInput().widget_id.startswith("numberinput_")
