"""Shared base class and small helpers for every manywidgets widget.

``BaseWidget`` is a thin ``anywidget.AnyWidget`` subclass — no magic; widgets
remain plain anywidgets. Its one job is to give every widget a stable, unique
``widget_id`` trait, which is the handle that ``Binder`` and the shared
``@manywidgets/core`` registry use to find a widget across the live-kernel /
static-export boundary.
"""

from __future__ import annotations

import pathlib
import threading
from collections import defaultdict

import anywidget
import traitlets

# Per-class monotonic counters so auto-generated ids are stable and readable
# (``chart_1``, ``chart_2``, ``slider_1``, …) within a kernel session.
_id_counters: dict[str, int] = defaultdict(int)
_id_lock = threading.Lock()


def _next_id(prefix: str) -> str:
    with _id_lock:
        _id_counters[prefix] += 1
        return f"{prefix}_{_id_counters[prefix]}"


def asset(module_file: str, *parts: str) -> pathlib.Path:
    """Resolve a path next to a widget's ``widget.py``.

    Usage inside a widget module::

        _esm = asset(__file__, "dist", "widget.js")
        _css = asset(__file__, "style.css")
    """
    return pathlib.Path(module_file).parent.joinpath(*parts)


class BaseWidget(anywidget.AnyWidget):
    """Base class for all manywidgets widgets.

    Adds an auto-populated ``widget_id`` (``f"{classname_lower}_{n}"``) used for
    cross-widget linking. Subclasses set their own ``_esm`` / ``_css`` (relative
    to their own file, via :func:`asset`) exactly like the golden-example
    structure.

    Every widget accepts ``theme`` and ``style`` keyword arguments for custom
    styling. Both resolve to a flat ``{"--mw-*": value}`` dict synced to the
    front-end as ``theme_vars`` and applied as inline CSS custom properties (see
    ``applyThemeVars`` in ``@manywidgets/core``). ``style`` overrides ``theme``::

        Slider(theme=dark, style={"--mw-color-accent": "#7c3aed"})
    """

    widget_id = traitlets.Unicode(
        help="Stable unique id used for cross-widget linking (auto-assigned)."
    ).tag(sync=True)

    # Flat {"--mw-*": value} dict applied as inline CSS custom properties on the
    # widget's root element. Merged on the Python side from ``theme`` / ``style``;
    # the front-end just sets each property (one trait, one listener).
    #
    # NOTE: this trait deliberately has NO leading underscore. The static-export
    # plugin builds the *directly displayed* (root) widget's front-end proxy from
    # public traits only — underscore-prefixed traits (``_model_name``, ``_esm``,
    # …) are dropped from it. A ``_theme_vars`` name would therefore never reach a
    # root widget (e.g. a themed layout), so themes would silently not apply.
    theme_vars = traitlets.Dict(
        help="Resolved CSS custom properties (set via the theme / style kwargs)."
    ).tag(sync=True)

    def __init__(self, **kwargs):
        theme = kwargs.pop("theme", None)
        style = kwargs.pop("style", None)
        super().__init__(**kwargs)
        if not self.widget_id:
            self.widget_id = _next_id(type(self).__name__.lower())

        resolved = dict(self.theme_vars)
        if theme is not None:
            resolved.update(theme.to_vars())  # theme: any object exposing to_vars()
        if style:
            resolved.update(style)  # per-widget overrides win over the theme
        if resolved:
            self.theme_vars = resolved
