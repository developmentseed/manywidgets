"""Notebook wrapper for the ECMWF ensemble forecast example."""

from copy import deepcopy
import json
import math
from pathlib import Path
import re
from urllib.parse import urlsplit

import traitlets
from manywidgets._base import BaseWidget

_ASSETS = Path(__file__).parent
_DEFAULTS = json.loads((_ASSETS / "defaults.json").read_text())


def _numbers(value, length, name):
    if not isinstance(value, (list, tuple)) or len(value) != length:
        raise ValueError(f"{name} must contain {length} numbers")
    if any(
        isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v)
        for v in value
    ):
        raise ValueError(f"{name} must contain finite numbers")
    return list(value)


def _store_url(value):
    message = "store_url must be an absolute HTTP(S) store URL without credentials, query or fragment"
    if not isinstance(value, str) or not value or any(c.isspace() for c in value):
        raise ValueError(message)
    try:
        parsed = urlsplit(value)
        valid = (
            parsed.scheme in {"http", "https"}
            and parsed.hostname
            and not parsed.username
            and not parsed.password
            and not parsed.query
            and not parsed.fragment
        )
        parsed.port
    except ValueError:
        raise ValueError(message) from None
    if not valid:
        raise ValueError(message)
    return value.rstrip("/")


def _colors(value, name):
    message = f"{name} needs at least two #RRGGBB colors"
    if not isinstance(value, (list, tuple)) or len(value) < 2:
        raise ValueError(message)
    if any(not isinstance(c, str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", c) for c in value):
        raise ValueError(message)
    return list(value)


def _config(**options):
    config = deepcopy(_DEFAULTS)
    config.update({key: value for key, value in options.items() if value is not None})
    config["store_url"] = _store_url(config["store_url"])
    name = config["region_name"]
    if not isinstance(name, str) or not name.strip():
        raise ValueError("region_name must be a nonempty string")
    west, south, east, north = _numbers(config["bounds"], 4, "bounds")
    if not (-180 <= west < east <= 180 and -85 <= south < north <= 85):
        raise ValueError(
            "bounds must be west, south, east, north within ±180° longitude "
            "and ±85° latitude, without crossing the antimeridian"
        )
    config["bounds"] = [west, south, east, north]
    if options.get("locations") is None:
        config["locations"] = [
            p for p in config["locations"]
            if west <= p["lon"] <= east and south <= p["lat"] <= north
        ]
    locations = config["locations"]
    if not isinstance(locations, (list, tuple)) or not locations:
        raise ValueError("locations must contain at least one place inside bounds")
    names = set()
    places = []
    for place in locations:
        if not isinstance(place, dict) or set(place) != {"name", "lon", "lat"}:
            raise ValueError("Each location must have name, lon and lat")
        name = place["name"]
        if not isinstance(name, str) or not name.strip() or name in names:
            raise ValueError("Location names must be nonempty and unique")
        lon, lat = _numbers([place["lon"], place["lat"]], 2, "Location coordinates")
        if not (west <= lon <= east and south <= lat <= north):
            raise ValueError(f"Location {name!r} must be inside bounds")
        names.add(name)
        places.append(dict(name=name, lon=lon, lat=lat))
    config["locations"] = places
    if options.get("initial_location") is None:
        config["initial_location"] = places[0]["name"]
    if not isinstance(config["initial_location"], str) or config["initial_location"] not in names:
        raise ValueError("initial_location must match a location name")
    days = config["forecast_days"]
    if isinstance(days, bool) or not isinstance(days, int) or not 1 <= days <= 14:
        raise ValueError("forecast_days must be an integer from 1 to 14")
    for key in ("temperature_range", "spread_range"):
        low, high = _numbers(config[key], 2, key)
        if low >= high or (key == "spread_range" and low < 0):
            raise ValueError(f"{key} must be increasing; spread cannot be negative")
        config[key] = [low, high]
    for key in ("temperature_colors", "spread_colors"):
        config[key] = _colors(config[key], key)
    return config


class EuropeForecast(BaseWidget):
    """Show the latest ECMWF temperature ensemble for a configured region.

    Bounds, locations, forecast length and color scales are constructor options.
    Create another widget to change them. ``day_index`` (zero-based), ``metric``
    and ``playing`` are live traits. A day index of -1 opens about a week ahead.
    ``store_url`` can point to a compatible copy of the dynamical.org ECMWF
    archive. Other variables, grids and ensemble layouts need a different adapter.
    """

    _esm = (_ASSETS / "dist/widget.js").read_text()
    _css = (_ASSETS / "style.css").read_text()
    config = traitlets.Dict(read_only=True).tag(sync=True)
    day_index = traitlets.Int(-1, min=-1, max=13).tag(sync=True)
    metric = traitlets.Enum(["mean", "spread"], default_value="mean").tag(sync=True)
    playing = traitlets.Bool(False).tag(sync=True)

    @traitlets.default("config")
    def _default_config(self):
        return self._forecast_config

    def __init__(
        self, *, store_url=None, region_name=None, bounds=None, locations=None,
        initial_location=None, forecast_days=None, temperature_range=None,
        spread_range=None, temperature_colors=None, spread_colors=None, **kwargs,
    ):
        config = _config(
            store_url=store_url,
            region_name=region_name, bounds=bounds, locations=locations,
            initial_location=initial_location, forecast_days=forecast_days,
            temperature_range=temperature_range, spread_range=spread_range,
            temperature_colors=temperature_colors, spread_colors=spread_colors,
        )
        if "config" in kwargs:
            raise TypeError("Pass configuration options directly, not config")
        self._forecast_config = config
        super().__init__(**kwargs)
