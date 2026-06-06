"""RangeSlider — a labelled low/high numeric range selector.

Two coordinated handles producing a ``[low, high]`` window. Pairs naturally with
the future lonboard ``FilterBinder`` (slider window → layer ``filter_range``) and
links like any widget via ``jslink`` / :class:`~manywidgets.Binder`.
"""

from __future__ import annotations

import traitlets

from .._base import BaseWidget, asset


class RangeSlider(BaseWidget):
    """A dual-handle numeric range slider."""

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    low = traitlets.Float(0.0, help="Lower handle (kept <= high).").tag(sync=True)
    high = traitlets.Float(100.0, help="Upper handle (kept >= low).").tag(sync=True)
    min = traitlets.Float(0.0, help="Minimum value.").tag(sync=True)
    max = traitlets.Float(100.0, help="Maximum value.").tag(sync=True)
    step = traitlets.Float(1.0, help="Step size.").tag(sync=True)
    label = traitlets.Unicode("", help="Label shown above the slider.").tag(sync=True)
