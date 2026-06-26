"""MapCompare — swipe comparison of two lonboard ``Map`` widgets.

Stacks two maps (e.g. satellite imagery 2010 vs 2026, or before/after a disaster)
and reveals one over the other with a draggable swipe divider — the
mapbox-gl-compare / leaflet-side-by-side experience. The two cameras are locked
together so panning/zooming either map moves both.

It needs no lonboard change: the JS mounts each map via ``@manywidgets/core``'s
``renderChild`` (static: the plugin's ``host.renderChild``; live: the widget
manager), clips the top map with CSS, and mirrors ``view_state`` between the two
map proxies entirely in the browser (lonboard already writes ``view_state`` back
to the model on every pan/zoom). Works live and in static export.
"""

from __future__ import annotations

import traitlets
from ipywidgets import Widget, widget_serialization

from ..._base import BaseWidget, asset


class MapCompare(BaseWidget):
    """Swipe-compare two lonboard ``Map`` widgets with synchronized cameras.

    Pass the two maps positionally::

        MapCompare(before_map, after_map)

    The ``before`` map is shown on the leading side of the divider (left for a
    vertical split, top for a horizontal one) and ``after`` on the other side.
    """

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    before = traitlets.Instance(
        Widget, allow_none=True, help="Lonboard Map shown on the leading side of the swipe."
    ).tag(sync=True, **widget_serialization)
    after = traitlets.Instance(
        Widget, allow_none=True, help="Lonboard Map shown on the trailing side of the swipe."
    ).tag(sync=True, **widget_serialization)
    position = traitlets.Float(
        0.5, help="Swipe divider position from 0 (start) to 1 (end)."
    ).tag(sync=True)
    orientation = traitlets.Unicode(
        "vertical",
        help='Split direction: "vertical" (left/right) or "horizontal" (top/bottom).',
    ).tag(sync=True)
    sync_views = traitlets.Bool(
        True, help="Keep the two maps' cameras locked together."
    ).tag(sync=True)
    height = traitlets.Unicode(
        "500px", help="CSS height of the compare container."
    ).tag(sync=True)
    initial_view = traitlets.Unicode(
        "before",
        help='Which map\'s view_state to align to on load ("before" or "after").',
    ).tag(sync=True)

    # Marker for the static-export container hook: recurse into these child maps.
    _myst_child_traits = traitlets.List(["before", "after"]).tag(sync=True)

    @traitlets.validate("orientation")
    def _validate_orientation(self, proposal):
        if proposal["value"] not in ("vertical", "horizontal"):
            raise traitlets.TraitError(
                "orientation must be 'vertical' or 'horizontal', "
                f"got {proposal['value']!r}"
            )
        return proposal["value"]

    @traitlets.validate("initial_view")
    def _validate_initial_view(self, proposal):
        if proposal["value"] not in ("before", "after"):
            raise traitlets.TraitError(
                "initial_view must be 'before' or 'after', "
                f"got {proposal['value']!r}"
            )
        return proposal["value"]

    @traitlets.validate("position")
    def _clamp_position(self, proposal):
        return max(0.0, min(1.0, proposal["value"]))

    def __init__(self, before=None, after=None, **kwargs):
        if before is not None:
            kwargs.setdefault("before", before)
        if after is not None:
            kwargs.setdefault("after", after)
        super().__init__(**kwargs)
        # Live-kernel convenience: align the two cameras once on creation so the
        # maps look matched even before display. The JS view-sync (and its poll)
        # handles everything after that; we deliberately do NOT add a continuous
        # Python observer (it would fight the JS path and incur lonboard's 300ms
        # save_changes debounce). Inert if either map or its view_state is unset.
        self._align_once()

    def _align_once(self):
        """Copy the ``initial_view`` map's ``view_state`` onto the other, once."""
        src = self.before if self.initial_view == "before" else self.after
        dst = self.after if self.initial_view == "before" else self.before
        if src is None or dst is None:
            return
        view_state = getattr(src, "view_state", None)
        if view_state is None:
            return
        try:
            dst.view_state = view_state
        except Exception:  # pragma: no cover - best-effort alignment
            pass
