"""Grid — lay out child widgets in a CSS grid with a fixed column count.

Children flow left-to-right, top-to-bottom into ``columns`` equal columns. Like
:class:`~manywidgets.Row`/:class:`~manywidgets.Column`, children stay interactive
and linked, live and in static export.
"""

from __future__ import annotations

import traitlets
from ipywidgets import Widget, widget_serialization

from .._base import BaseWidget, asset


class Grid(BaseWidget):
    """Arrange child widgets in an N-column grid."""

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    children = traitlets.List(
        trait=traitlets.Instance(Widget), help="Child widgets, in row-major order."
    ).tag(sync=True, **widget_serialization)
    columns = traitlets.Int(2, help="Number of equal-width columns.").tag(sync=True)
    gap = traitlets.Unicode("8px", help="CSS gap between cells.").tag(sync=True)

    _myst_child_traits = traitlets.List(["children"]).tag(sync=True)

    def __init__(self, *children, **kwargs):
        if children:
            kwargs.setdefault("children", list(children))
        super().__init__(**kwargs)
