"""Row — lay out child widgets in a horizontal flex row.

A container widget: it holds other manywidgets as ``children`` and renders them
side-by-side. Children stay fully interactive and linked (``jslink``/``Binder``),
live and in static export — the JS mounts each child via
``@manywidgets/core``'s ``renderChild`` (static: the plugin's ``host.renderChild``;
live: the widget manager).
"""

from __future__ import annotations

import traitlets
from ipywidgets import Widget, widget_serialization

from .._base import BaseWidget, _flatten, asset


class Row(BaseWidget):
    """Arrange child widgets in a horizontal row."""

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    children = traitlets.List(
        trait=traitlets.Instance(Widget), help="Child widgets, left to right."
    ).tag(sync=True, **widget_serialization)
    gap = traitlets.Unicode("8px", help="CSS gap between children.").tag(sync=True)
    align = traitlets.Unicode(
        "stretch", help="CSS align-items (cross axis)."
    ).tag(sync=True)

    # Forward-compatible marker for the static-export container hook.
    _myst_child_traits = traitlets.List(["children"]).tag(sync=True)

    def __init__(self, *children, **kwargs):
        if children:
            kwargs.setdefault("children", _flatten(children))
        super().__init__(**kwargs)
