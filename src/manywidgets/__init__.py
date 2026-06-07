"""manywidgets — a composable set of anywidget-based widgets for notebooks.

Widgets are plain anywidgets: they work in a live Jupyter kernel and are
authored to also render correctly when statically exported (no kernel) via the
``myst-anywidget-static-export`` plugin. Link them with ``ipywidgets.jslink`` /
``jsdlink`` for the simple cases, or the :class:`~manywidgets.Binder` widget for
transforms and nested-path targets that jslink can't express.

The optional ``manywidgets.lonboard`` subpackage adds control widgets for lonboard
maps; install it with ``pip install "manywidgets[lonboard]"``.
"""

from ._base import BaseWidget
from ._version import __version__
from .binder import Binder
from .button import Button
from .chart import Chart
from .column import Column
from .dropdown import Dropdown
from .grid import Grid
from .legend import Legend
from .number_display import NumberDisplay
from .number_input import NumberInput
from .range_slider import RangeSlider
from .row import Row
from .slider import Slider
from . import themes
from .stat import Stat
from .text import Text
from .themes import Theme
from .toggle import Toggle

__all__ = [
    "BaseWidget",
    "Binder",
    "Button",
    "Chart",
    "Column",
    "Dropdown",
    "Grid",
    "Legend",
    "NumberDisplay",
    "NumberInput",
    "RangeSlider",
    "Row",
    "Slider",
    "Stat",
    "Text",
    "Theme",
    "Toggle",
    "__version__",
    "themes",
]
