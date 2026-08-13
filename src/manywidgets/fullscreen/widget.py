"""Fullscreen — expand a widget (or an alternate layout) into a page-covering overlay.

A wrapper container: it renders its ``child`` inline with a small expand button
overlaid in the corner. Clicking the button (or setting ``is_open = True`` from
Python) shows a viewport-covering overlay. By default the overlay shows the same
child expanded; pass ``fullscreen=`` to show a different layout instead — e.g.
inline a single chart, fullscreen a whole dashboard with the chart plus a map.

The overlay is a CSS ``position: fixed`` layer, not the browser Fullscreen API,
so it works in static export and can be driven from Python. In exported pages
the overlay state is mirrored into the URL (``?fullscreen=<widget_id>``), so a
link can open a page directly in a widget's fullscreen view.
"""

from __future__ import annotations

import traitlets
from ipywidgets import Widget, widget_serialization

from .._base import BaseWidget, asset


class Fullscreen(BaseWidget):
    """Wrap a widget with an expand button that opens a viewport-covering overlay.

    Pass the inline widget positionally; optionally pass ``fullscreen=`` to show
    a different layout in the overlay::

        Fullscreen(chart)
        Fullscreen(chart, fullscreen=Row(chart, m))
    """

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    child = traitlets.Instance(
        Widget, allow_none=True, help="Widget rendered inline (with the expand button)."
    ).tag(sync=True, **widget_serialization)
    fullscreen = traitlets.Instance(
        Widget,
        allow_none=True,
        help="Optional alternate widget shown in the overlay instead of the child.",
    ).tag(sync=True, **widget_serialization)
    # Named is_open (not open): ipywidgets.Widget.open() is the comm-opening
    # method and a Bool trait of that name breaks widget construction.
    is_open = traitlets.Bool(
        False, help="Whether the fullscreen overlay is open (settable from Python)."
    ).tag(sync=True)

    # Marker for the static-export container hook: recurse into these children.
    _myst_child_traits = traitlets.List(["child", "fullscreen"]).tag(sync=True)

    def __init__(self, child=None, fullscreen=None, **kwargs):
        if child is not None:
            kwargs.setdefault("child", child)
        if fullscreen is not None:
            kwargs.setdefault("fullscreen", fullscreen)
        super().__init__(**kwargs)
