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
    """

    widget_id = traitlets.Unicode(
        help="Stable unique id used for cross-widget linking (auto-assigned)."
    ).tag(sync=True)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.widget_id:
            self.widget_id = _next_id(type(self).__name__.lower())
