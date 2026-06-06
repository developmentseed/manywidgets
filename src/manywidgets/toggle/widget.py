"""Toggle — a labelled boolean switch."""

from __future__ import annotations

import traitlets

from .._base import BaseWidget, asset


class Toggle(BaseWidget):
    """A boolean on/off switch."""

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    value = traitlets.Bool(False, help="On/off state.").tag(sync=True)
    label = traitlets.Unicode("", help="Label shown next to the switch.").tag(sync=True)
