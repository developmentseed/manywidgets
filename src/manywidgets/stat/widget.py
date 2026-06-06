"""Stat — a compact metric card (label, value, unit, optional delta).

A read-only display. Drive ``value`` / ``delta`` from other widgets with
``jslink`` / :class:`~manywidgets.Binder` (e.g. a ``Button.clicks`` → a counter
``Stat``).
"""

from __future__ import annotations

import traitlets

from .._base import BaseWidget, asset


class Stat(BaseWidget):
    """A metric card with an optional signed delta."""

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    label = traitlets.Unicode("", help="Metric label.").tag(sync=True)
    value = traitlets.Any("", help="Displayed value.").tag(sync=True)
    unit = traitlets.Unicode("", help="Unit shown after the value.").tag(sync=True)
    delta = traitlets.Any(
        None, allow_none=True, help="Signed change; coloured ▲ green / ▼ red."
    ).tag(sync=True)
