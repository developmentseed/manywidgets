"""Binder — a tiny widget that wires one widget's trait to another's, in JS.

The cleaned-up successor to the ``widget_binder`` experiment. ``jslink`` /
``jsdlink`` is the canonical way to link manywidgets (see the linking guide);
``Binder`` covers the cases jslink can't express:

* a linear transform on the value (``multiplier`` / ``offset``), and
* writing a **nested / dotted-path** target (e.g. lonboard ``view_state.zoom``),
  which is merged into the parent dict so listeners see one coherent update.

For ergonomics it accepts widget **instances** and reads their ``widget_id``::

    Binder(source=slider, source_field="value",
           target=chart, target_field="x_max",
           multiplier=1000)

It works in a live kernel and in static export — the JS side resolves both
widgets through ``@manywidgets/core``'s ``resolveModel`` (which handles the
multi-proxy / late-registration hazards).
"""

from __future__ import annotations

import traitlets

from .._base import BaseWidget, asset


def _id_of(widget_or_id):
    """Accept a widget instance (read its ``widget_id``) or a raw id string."""
    if widget_or_id is None:
        return ""
    if isinstance(widget_or_id, str):
        return widget_or_id
    wid = getattr(widget_or_id, "widget_id", None)
    if not wid:
        raise TypeError(
            f"{widget_or_id!r} has no 'widget_id'; pass a manywidgets widget "
            "instance or an explicit id string."
        )
    return wid


class Binder(BaseWidget):
    """Link a source widget's trait to a target widget's trait, in the browser."""

    _esm = asset(__file__, "dist", "widget.js")

    source_widget_id = traitlets.Unicode("").tag(sync=True)
    source_field = traitlets.Unicode("value").tag(sync=True)
    target_widget_id = traitlets.Unicode("").tag(sync=True)
    target_field = traitlets.Unicode("").tag(sync=True)
    multiplier = traitlets.Float(1.0).tag(sync=True)
    offset = traitlets.Float(0.0).tag(sync=True)
    label = traitlets.Unicode("").tag(sync=True)

    def __init__(
        self,
        source=None,
        target=None,
        *,
        source_field="value",
        target_field=None,
        multiplier=1.0,
        offset=0.0,
        **kwargs,
    ):
        if source is not None and "source_widget_id" not in kwargs:
            kwargs["source_widget_id"] = _id_of(source)
        if target is not None and "target_widget_id" not in kwargs:
            kwargs["target_widget_id"] = _id_of(target)
        kwargs.setdefault("source_field", source_field)
        if target_field is not None:
            kwargs.setdefault("target_field", target_field)
        kwargs.setdefault("multiplier", multiplier)
        kwargs.setdefault("offset", offset)
        super().__init__(**kwargs)
        if not self.target_field:
            raise ValueError("Binder requires a 'target_field'.")
