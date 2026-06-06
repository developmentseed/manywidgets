"""manywidgets — a composable set of anywidget-based widgets for notebooks.

Widgets are plain anywidgets: they work in a live Jupyter kernel and are
authored to also render correctly when statically exported (no kernel) via the
``myst-anywidget-static-export`` plugin. Link them with ``ipywidgets.jslink`` /
``jsdlink`` for the simple cases, or the :class:`~manywidgets.Binder` widget for
transforms and nested-path targets that jslink can't express.

The optional ``manywidgets.lonboard`` subpackage ships first-class lonboard
interop widgets and is import-guarded (``pip install manywidgets[lonboard]``).
"""

from ._base import BaseWidget
from ._version import __version__
from .binder import Binder
from .chart import Chart
from .slider import Slider

__all__ = [
    "BaseWidget",
    "Binder",
    "Chart",
    "Slider",
    "__version__",
]
