"""Theming for manywidgets — the :class:`Theme` object and built-in themes."""

from ._theme import Theme
from .builtin import brand_example, dark, light, minimal

__all__ = ["Theme", "brand_example", "dark", "light", "minimal"]
