"""Slider — a labelled numeric range slider.

A small vanilla-TS input control. Its ``value`` trait drives other widgets
through ``jslink`` / ``jsdlink`` (for plain pass-through) or
:class:`~manywidgets.Binder` (for scaled / transformed / nested-path targets).
"""

from __future__ import annotations

import traitlets

from .._base import BaseWidget, asset


class Slider(BaseWidget):
    """A numeric slider with a value readout."""

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    value = traitlets.Float(0.0, help="Current value.").tag(sync=True)
    min = traitlets.Float(0.0, help="Minimum value.").tag(sync=True)
    max = traitlets.Float(100.0, help="Maximum value.").tag(sync=True)
    step = traitlets.Float(1.0, help="Step size.").tag(sync=True)
    label = traitlets.Unicode("", help="Label shown above the slider.").tag(sync=True)
