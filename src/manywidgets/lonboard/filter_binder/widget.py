"""FilterBinder — drive a lonboard layer's ``filter_range`` from a slider.

Reads ``[low, high]`` from a source widget (a :class:`~manywidgets.RangeSlider`, or
a :class:`~manywidgets.Slider` with ``low_field == high_field == "value"``) and
writes it to a layer's ``filter_range`` (from ``DataFilterExtension``). Works live
and in static export.
"""

from __future__ import annotations

import traitlets
from ipywidgets import Widget, widget_serialization

from ..._base import BaseWidget, asset


class FilterBinder(BaseWidget):
    """Bind a (Range)Slider to a lonboard layer's ``filter_range``."""

    _esm = asset(__file__, "dist", "widget.js")

    source = traitlets.Instance(
        Widget, allow_none=True, help="The slider providing low/high values."
    ).tag(sync=True, **widget_serialization)
    layer = traitlets.Instance(
        Widget, allow_none=True, help="The lonboard layer to filter."
    ).tag(sync=True, **widget_serialization)
    low_field = traitlets.Unicode("low", help="Source trait for the low bound.").tag(sync=True)
    high_field = traitlets.Unicode("high", help="Source trait for the high bound.").tag(sync=True)
    filter_field = traitlets.Unicode(
        "filter_range", help="Layer trait to write [low, high] to."
    ).tag(sync=True)
    label = traitlets.Unicode("", help="Optional status label.").tag(sync=True)

    def __init__(self, source=None, layer=None, **kwargs):
        if source is not None:
            kwargs.setdefault("source", source)
        if layer is not None:
            kwargs.setdefault("layer", layer)
        super().__init__(**kwargs)
