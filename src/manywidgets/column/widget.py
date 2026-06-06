"""Column — lay out child widgets in a vertical flex column.

The vertical sibling of :class:`~manywidgets.Row`. Children stay interactive and
linked, live and in static export; the JS mounts each child via
``@manywidgets/core``'s ``renderChild``.
"""

from __future__ import annotations

import traitlets
from ipywidgets import Widget, widget_serialization

from .._base import BaseWidget, asset


class Column(BaseWidget):
    """Arrange child widgets in a vertical column."""

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    children = traitlets.List(
        trait=traitlets.Instance(Widget), help="Child widgets, top to bottom."
    ).tag(sync=True, **widget_serialization)
    gap = traitlets.Unicode("8px", help="CSS gap between children.").tag(sync=True)
    align = traitlets.Unicode(
        "stretch", help="CSS align-items (cross axis)."
    ).tag(sync=True)

    _myst_child_traits = traitlets.List(["children"]).tag(sync=True)

    def __init__(self, *children, **kwargs):
        if children:
            kwargs.setdefault("children", list(children))
        super().__init__(**kwargs)
