"""LayerToggle — a switch that shows/hides a lonboard layer.

Writes the layer's ``visible`` trait. Works live and in static export; the JS
resolves the layer through ``@manywidgets/core``'s ``resolveModel`` and fans the
write out to every proxy of the layer (the Map keeps its own).
"""

from __future__ import annotations

import traitlets
from ipywidgets import Widget, widget_serialization

from ..._base import BaseWidget, asset


class LayerToggle(BaseWidget):
    """Toggle a lonboard layer's visibility."""

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    layer = traitlets.Instance(
        Widget, allow_none=True, help="The lonboard layer to show/hide."
    ).tag(sync=True, **widget_serialization)
    value = traitlets.Bool(True, help="Desired layer visibility.").tag(sync=True)
    label = traitlets.Unicode("Layer", help="Label next to the switch.").tag(sync=True)

    def __init__(self, layer=None, **kwargs):
        if layer is not None:
            kwargs.setdefault("layer", layer)
        super().__init__(**kwargs)
