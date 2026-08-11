"""GridItem: placement metadata for a widget inside a :class:`~manywidgets.Grid`.

A transparent wrapper: it renders its ``child`` with no visible markup of its
own, so wrapping a widget never changes how it looks, only where/how big its
cell is when the wrapper sits directly inside a ``Grid``. Children not wrapped
in a ``GridItem`` default to a single 1x1 cell, exactly like today.
"""

from __future__ import annotations

import traitlets
from ipywidgets import Widget, widget_serialization

from .._base import BaseWidget, asset


class GridItem(BaseWidget):
    """Wrap a widget with grid placement (span or named area).

    Pass the wrapped widget positionally::

        GridItem(chart, col_span=2, row_span=2)
        GridItem(header, area="header")

    ``area`` takes precedence over ``col_span``/``row_span`` when the parent
    ``Grid`` has ``template_areas`` set; otherwise spans apply against the
    grid's row-major auto-placement.
    """

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    child = traitlets.Instance(
        Widget, allow_none=True, help="The wrapped widget."
    ).tag(sync=True, **widget_serialization)
    col_span = traitlets.Int(1, help="Number of grid columns this cell spans.").tag(sync=True)
    row_span = traitlets.Int(1, help="Number of grid rows this cell spans.").tag(sync=True)
    area = traitlets.Unicode(
        "", help="Named grid-template-area; requires the parent Grid's template_areas."
    ).tag(sync=True)

    _myst_child_traits = traitlets.List(["child"]).tag(sync=True)

    def __init__(self, child=None, **kwargs):
        if child is not None:
            kwargs.setdefault("child", child)
        super().__init__(**kwargs)
