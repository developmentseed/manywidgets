"""NumberDisplay — a large animated number readout.

Counts up/down to ``value`` over ``duration`` ms. ``format`` is a small
Python-style spec applied to the number:

* ``"{}"`` — the number as-is
* ``"{:.1f}"`` — fixed decimals
* ``"{:,}"`` / ``"{:,.0f}"`` — thousands grouping (optionally with decimals)

Bind ``value`` from other widgets via ``jslink`` / :class:`~manywidgets.Binder`.
"""

from __future__ import annotations

import traitlets

from .._base import BaseWidget, asset


class NumberDisplay(BaseWidget):
    """An animated numeric readout."""

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    value = traitlets.Float(0.0, help="Target value (animates to it).").tag(sync=True)
    format = traitlets.Unicode(
        "{}", help='Format spec: "{}", "{:.1f}", "{:,}", "{:,.0f}".'
    ).tag(sync=True)
    duration = traitlets.Int(600, help="Animation duration in ms (0 = instant).").tag(sync=True)
    label = traitlets.Unicode("", help="Label shown above the number.").tag(sync=True)
