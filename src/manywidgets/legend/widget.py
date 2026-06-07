"""Legend — a discrete colour-swatch legend (color + label rows).

A read-only display for data-driven styling: pass the same colours you used to
style a layer/chart so the legend stays consistent. Each entry is
``[color, label]`` where ``color`` is an ``[r, g, b]`` / ``[r, g, b, a]`` list
(0–255, deck.gl convention) or a CSS colour string.
"""

from __future__ import annotations

import traitlets

from .._base import BaseWidget, asset


def _norm_entry(entry):
    color, label = entry[0], entry[1]
    if hasattr(color, "tolist"):  # numpy array / scalar
        color = color.tolist()
    elif isinstance(color, tuple):
        color = list(color)
    return [color, label]


class Legend(BaseWidget):
    """A discrete colour legend (swatch + label per entry)."""

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    entries = traitlets.List(
        [],
        help="Rows as [color, label]; color is [r,g,b]/[r,g,b,a] (0–255) or a CSS string.",
    ).tag(sync=True)
    title = traitlets.Unicode("", help="Optional legend title.").tag(sync=True)

    def __init__(self, entries=None, *, title="", **kwargs):
        if entries is not None:
            kwargs.setdefault("entries", [_norm_entry(e) for e in entries])
        if title:
            kwargs.setdefault("title", title)
        super().__init__(**kwargs)
