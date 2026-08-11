"""Grid — lay out child widgets in a CSS grid with a fixed column count.

Children flow left-to-right, top-to-bottom into ``columns`` equal columns. Like
:class:`~manywidgets.Row`/:class:`~manywidgets.Column`, children stay interactive
and linked, live and in static export.

Wrap a child in :class:`~manywidgets.GridItem` to control how many
columns/rows its cell spans, or to place it into a named
``template_areas`` region. Bare (unwrapped) children default to 1x1 cells,
exactly as before.
"""

from __future__ import annotations

import traitlets
from ipywidgets import Widget, widget_serialization

from .._base import BaseWidget, _flatten, asset


class Grid(BaseWidget):
    """Arrange child widgets in an N-column grid."""

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    children = traitlets.List(
        trait=traitlets.Instance(Widget), help="Child widgets, in row-major order."
    ).tag(sync=True, **widget_serialization)
    columns = traitlets.Union(
        [traitlets.Int(), traitlets.Unicode()],
        default_value=2,
        help=(
            "Either an int (N equal-width columns) or a raw CSS "
            "grid-template-columns track string (e.g. \"200px 1fr\") for "
            "asymmetric columns, e.g. a narrower sidebar beside a wider main."
        ),
    ).tag(sync=True)
    gap = traitlets.Unicode("8px", help="CSS gap between cells.").tag(sync=True)
    template_areas = traitlets.Unicode(
        "",
        help=(
            "Optional CSS grid-template-areas string (e.g. "
            '\'"header header" "sidebar main"\'). When set, GridItem children '
            "place by their area name instead of row-major flow."
        ),
    ).tag(sync=True)

    _myst_child_traits = traitlets.List(["children"]).tag(sync=True)

    def __init__(self, *children, **kwargs):
        if children:
            kwargs.setdefault("children", _flatten(children))
        super().__init__(**kwargs)
