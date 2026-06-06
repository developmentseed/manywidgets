"""Dropdown — a labelled select control.

``options`` is a list of either scalars (``["a", "b"]``) or ``[label, value]``
pairs (``[["One", 1], ["Two", 2]]``). ``value`` holds the selected value and
links like any widget.
"""

from __future__ import annotations

import traitlets

from .._base import BaseWidget, asset


class Dropdown(BaseWidget):
    """A ``<select>`` dropdown."""

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    options = traitlets.List(
        [], help="Scalars (['a', 'b']) or [label, value] pairs."
    ).tag(sync=True)
    value = traitlets.Any(
        None, allow_none=True, help="The selected value."
    ).tag(sync=True)
    label = traitlets.Unicode("", help="Label shown above the dropdown.").tag(sync=True)

    def __init__(self, options=None, value=None, **kwargs):
        if options is not None:
            kwargs["options"] = list(options)
        super().__init__(**kwargs)
        # Default the value to the first option if not explicitly provided.
        if value is not None:
            self.value = value
        elif self.value is None and self.options:
            self.value = self._option_value(self.options[0])

    @staticmethod
    def _option_value(opt):
        return opt[1] if isinstance(opt, (list, tuple)) else opt
