"""MapFlyer — buttons that fly a lonboard ``Map`` to preset locations.

Each preset is a small dict (``label`` plus camera keys like ``longitude`` /
``latitude`` / ``zoom``); clicking a button animates the target map there.

It works live and in static export (no kernel) without any lonboard change. The
JS resolves the ``Map`` through ``@manywidgets/core``'s ``resolveModel`` and
delivers lonboard's existing ``"fly-to"`` custom message with ``sendCustom`` —
which fires the map's ``msg:custom`` listener locally (via the Backbone model
live, or the static-export comm mock), the same path a real kernel comm takes.
"""

from __future__ import annotations

import traitlets
from ipywidgets import Widget, widget_serialization

from ..._base import BaseWidget, asset


class MapFlyer(BaseWidget):
    """Fly a lonboard ``Map`` to preset locations."""

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    map = traitlets.Instance(
        Widget, allow_none=True, help="The lonboard Map to reposition."
    ).tag(sync=True, **widget_serialization)
    locations = traitlets.List(
        traitlets.Dict(),
        help="Presets; each a dict with 'label' plus camera keys "
        "(longitude, latitude, zoom, optionally pitch/bearing).",
    ).tag(sync=True)
    duration = traitlets.Int(
        4000, help="Fly-to animation duration in milliseconds."
    ).tag(sync=True)
    label = traitlets.Unicode("", help="Optional heading above the buttons.").tag(
        sync=True
    )

    def __init__(self, map=None, locations=None, **kwargs):
        if map is not None:
            kwargs.setdefault("map", map)
        if locations is not None:
            kwargs.setdefault("locations", locations)
        super().__init__(**kwargs)
