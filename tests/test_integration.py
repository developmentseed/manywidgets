"""Cross-widget / package-level tests.

Per-widget behaviour lives in each widget's own tests/ dir
(src/manywidgets/<name>/tests/). These cover shared concerns: the package
surface, BaseWidget's auto id, and widgets linking together.
"""

import manywidgets
from manywidgets import (
    BaseWidget,
    Binder,
    Button,
    Chart,
    Column,
    Dropdown,
    Grid,
    NumberDisplay,
    NumberInput,
    RangeSlider,
    Row,
    Slider,
    Stat,
    Text,
    Toggle,
)

ALL_WIDGETS = [
    Chart,
    Slider,
    RangeSlider,
    Dropdown,
    Toggle,
    Button,
    NumberInput,
    Stat,
    NumberDisplay,
    Text,
    Binder,
    Row,
    Column,
    Grid,
]


def test_version_present():
    assert manywidgets.__version__


def test_all_widgets_exported_and_subclass_base():
    for cls in ALL_WIDGETS:
        assert isinstance(cls, type)
        assert issubclass(cls, BaseWidget)
        assert cls.__name__ in manywidgets.__all__


def test_widget_id_auto_and_unique_across_classes():
    a, b, c = Slider(), Slider(), Chart()
    assert a.widget_id != b.widget_id
    assert a.widget_id.startswith("slider_")
    assert c.widget_id.startswith("chart_")
    # explicit id respected
    assert Slider(widget_id="custom").widget_id == "custom"


def test_jslink_and_jsdlink_build_link_widgets():
    from ipywidgets import jsdlink, jslink

    a, b = Slider(value=1), Slider(value=2)
    assert jslink((a, "value"), (b, "value")) is not None
    assert jsdlink((a, "value"), (b, "value")) is not None


def test_binder_wires_slider_to_chart():
    slider = Slider()
    chart = Chart()
    binder = Binder(
        source=slider, source_field="value",
        target=chart, target_field="height",
        multiplier=100, offset=200,
    )
    assert binder.source_widget_id == slider.widget_id
    assert binder.target_widget_id == chart.widget_id
    assert binder.target_field == "height"
