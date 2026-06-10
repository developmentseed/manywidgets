"""manywidgets.lonboard — interop widgets for lonboard maps.

Optional subpackage: install with ``pip install "manywidgets[lonboard]"``. These are
control-plane widgets — they reference a lonboard ``Map``/layer and mutate its traits
(``visible``, ``filter_range``, ``filter_categories``); they don't render the map
themselves. They work live and in static export (no kernel) via
``@manywidgets/core``'s ``resolveModel`` (which fans writes out to every layer proxy).
"""

try:
    import lonboard as _lonboard  # noqa: F401
except ImportError as exc:  # pragma: no cover - exercised via the friendly-error test
    raise ImportError(
        "manywidgets.lonboard requires lonboard. Install it with:\n"
        '    pip install "manywidgets[lonboard]"'
    ) from exc

from .filter_binder import FilterBinder
from .layer_filter import LayerFilter
from .layer_toggle import LayerToggle
from .map_flyer import MapFlyer

__all__ = ["LayerToggle", "FilterBinder", "LayerFilter", "MapFlyer"]
