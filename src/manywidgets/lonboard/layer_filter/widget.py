"""LayerFilter — a checkbox legend that filters a lonboard layer by category.

Writes the layer's ``filter_categories`` (from ``DataFilterExtension`` with
``category_size``). ``categories`` is a list of scalars or ``[value, label]`` pairs;
``value`` holds the currently-enabled values (defaults to all). Works live and in
static export.
"""

from __future__ import annotations

import traitlets
from ipywidgets import Widget, widget_serialization

from ..._base import BaseWidget, asset


class LayerFilter(BaseWidget):
    """Filter a lonboard layer by categorical value via checkboxes."""

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    layer = traitlets.Instance(
        Widget, allow_none=True, help="The lonboard layer to filter."
    ).tag(sync=True, **widget_serialization)
    categories = traitlets.List(
        [], help="Scalars or [value, label] pairs, one per category."
    ).tag(sync=True)
    value = traitlets.List([], help="Currently-enabled category values.").tag(sync=True)
    label = traitlets.Unicode("Filter", help="Legend heading.").tag(sync=True)

    def __init__(self, layer=None, categories=None, **kwargs):
        if layer is not None:
            kwargs.setdefault("layer", layer)
        if categories is not None:
            kwargs.setdefault("categories", list(categories))
        super().__init__(**kwargs)
        if not self.value and self.categories:
            self.value = [self._category_value(c) for c in self.categories]

    @staticmethod
    def _category_value(category):
        return category[0] if isinstance(category, (list, tuple)) else category
