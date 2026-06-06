"""Button — a click button.

The JS increments a ``clicks`` counter (kernel-free; safe statically). On a live
kernel, register Python callbacks with :meth:`on_click`; they fire whenever
``clicks`` increases. ``clicks`` also links like any trait (e.g. drive a ``Stat``
with ``jslink``).
"""

from __future__ import annotations

import traitlets

from .._base import BaseWidget, asset


class Button(BaseWidget):
    """A click button with a ``clicks`` counter and ``on_click`` callbacks."""

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    clicks = traitlets.Int(0, help="Number of clicks (increments on each click).").tag(sync=True)
    label = traitlets.Unicode("Button", help="Button text.").tag(sync=True)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._click_callbacks = []
        self.observe(self._fire_click_callbacks, names=["clicks"])

    def on_click(self, callback, remove=False):
        """Register (or remove) a callback fired on each click.

        The callback is invoked as ``callback(self)`` whenever ``clicks``
        increases (live kernel only — there's no kernel in static export).
        """
        if remove:
            if callback in self._click_callbacks:
                self._click_callbacks.remove(callback)
        elif callback not in self._click_callbacks:
            self._click_callbacks.append(callback)

    def _fire_click_callbacks(self, change):
        if change["new"] <= change["old"]:
            return
        for cb in list(self._click_callbacks):
            cb(self)
