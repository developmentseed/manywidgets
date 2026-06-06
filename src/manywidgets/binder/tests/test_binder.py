import pytest

from manywidgets import Binder, Chart, Slider


def test_extracts_ids_from_instances():
    src, dst = Slider(), Chart()
    b = Binder(
        source=src, source_field="value",
        target=dst, target_field="height",
        multiplier=100, offset=200,
    )
    assert b.source_widget_id == src.widget_id
    assert b.target_widget_id == dst.widget_id
    assert b.source_field == "value"
    assert b.target_field == "height"
    assert b.multiplier == 100 and b.offset == 200


def test_accepts_id_strings():
    b = Binder(source="slider_99", target="chart_99", target_field="title")
    assert b.source_widget_id == "slider_99"
    assert b.target_widget_id == "chart_99"


def test_requires_target_field():
    with pytest.raises(ValueError):
        Binder(source=Slider(), target=Chart())


def test_rejects_object_without_widget_id():
    with pytest.raises(TypeError):
        Binder(source=object(), target=Chart(), target_field="height")
