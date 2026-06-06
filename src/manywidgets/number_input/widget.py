"""NumberInput — a labelled numeric text input (spinner)."""

from __future__ import annotations

import traitlets

from .._base import BaseWidget, asset


class NumberInput(BaseWidget):
    """A ``<input type=number>`` control."""

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    value = traitlets.Float(0.0, help="Current value.").tag(sync=True)
    min = traitlets.Float(
        allow_none=True, default_value=None, help="Optional minimum."
    ).tag(sync=True)
    max = traitlets.Float(
        allow_none=True, default_value=None, help="Optional maximum."
    ).tag(sync=True)
    step = traitlets.Float(1.0, help="Step size.").tag(sync=True)
    label = traitlets.Unicode("", help="Label shown above the input.").tag(sync=True)
