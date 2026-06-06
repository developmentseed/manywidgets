"""Text — a label / readout, optionally rendered as Markdown.

With ``markdown=True`` the ``value`` is rendered as Markdown (via a bundled
parser). Bind ``value`` from other widgets via ``jslink`` / Binder for a live
text readout.
"""

from __future__ import annotations

import traitlets

from .._base import BaseWidget, asset


class Text(BaseWidget):
    """A text readout, optionally Markdown."""

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    value = traitlets.Unicode("").tag(sync=True)
    markdown = traitlets.Bool(False).tag(sync=True)
