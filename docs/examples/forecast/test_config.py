"""Checks for notebook configuration and serialized widget state."""

import pytest
import traitlets
from . import EuropeForecast


def test_defaults_and_independent_instances():
    first = EuropeForecast()
    second = EuropeForecast()
    assert first.config["forecast_days"] == 14
    assert first.config["initial_location"] == "Berlin"
    assert first.config["store_url"].startswith("https://s3.us-west-2.amazonaws.com/")
    assert first.day_index == -1
    first.config["locations"][0]["name"] = "Changed"
    assert second.config["locations"][0]["name"] == "Berlin"
    first.close()
    second.close()


def test_regional_config_is_in_initial_state():
    widget = EuropeForecast(
        region_name="Switzerland", bounds=(5.9, 45.8, 10.6, 47.9),
        forecast_days=7, day_index=2, metric="spread", temperature_range=(-5, 25),
    )
    config = widget.get_state()["config"]
    assert config["bounds"] == [5.9, 45.8, 10.6, 47.9]
    assert config["locations"] == [dict(name="Zurich", lon=8.542, lat=47.377)]
    assert config["initial_location"] == "Zurich"
    assert config["temperature_range"] == [-5, 25]
    assert widget.day_index == 2
    with pytest.raises(traitlets.TraitError):
        widget.config = {}
    widget.close()


@pytest.mark.parametrize("options", [
    {"bounds": [170, -10, -170, 10]},
    {"bounds": [-10, -90, 10, 90]},
    {"bounds": [0, 0, float("nan"), 10]},
    {"locations": []},
    {"locations": [{"name": "Outside", "lon": 120, "lat": 45}]},
    {"locations": [{"name": "Berlin", "lon": 13, "lat": 52}] * 2},
    {"initial_location": "Unknown"},
    {"forecast_days": 0}, {"forecast_days": 15}, {"forecast_days": True},
    {"temperature_range": [20, 10]}, {"spread_range": [-1, 10]},
    {"temperature_colors": ["red", "blue"]}, {"spread_colors": ["#ffffff"]},
    {"region_name": ""},
])
def test_invalid_config_fails_before_widget_creation(options):
    with pytest.raises(ValueError):
        EuropeForecast(**options)


@pytest.mark.parametrize("options", [{"metric": "rain"}, {"day_index": 14}])
def test_invalid_live_traits(options):
    with pytest.raises(traitlets.TraitError):
        EuropeForecast(**options)


def test_custom_store_is_serialized():
    widget = EuropeForecast(store_url="https://weather.example/ecmwf.zarr/")
    assert widget.get_state()["config"]["store_url"] == "https://weather.example/ecmwf.zarr"
    widget.close()


@pytest.mark.parametrize("url", [
    "", "relative.zarr", "s3://bucket/ecmwf.zarr", "https:///missing-host",
    "https://example.org/store?token=abc", "https://example.org/store#group",
    "https://user:password@example.org/store", "https://example.org/bad port",
    "https://example.org:invalid/store", 123,
])
def test_invalid_store_urls(url):
    with pytest.raises(ValueError, match="store_url"):
        EuropeForecast(store_url=url)
