"""Chart — an interactive charting widget powered by Chart.js.

A clean rebuild of the ``chart_widget`` experiment: Chart.js is bundled into the
widget's JS via esbuild (no CDN, so it renders statically), data series are
plain JSON lists (buffer-free, so static export needs no nbclient pre-execute),
and ``model.save_changes()`` is wrapped on the JS side so click/hover events are
safe without a kernel.
"""

from __future__ import annotations

import traitlets

from .._base import BaseWidget, asset


def _to_list(value):
    """Coerce numpy arrays (and array-likes) to plain Python lists.

    numpy is an optional, soft dependency — only imported if the caller actually
    passes an ndarray.
    """
    if value is None:
        return None
    if type(value).__module__ == "numpy" and hasattr(value, "tolist"):
        return value.tolist()
    return value


class Chart(BaseWidget):
    """An interactive Chart.js chart.

    Build series with :meth:`add_series` / :meth:`update_series` /
    :meth:`clear_series`, and tweak presentation with :meth:`set_options`.
    Bind traits like ``title`` to other widgets with ``jslink`` or
    :class:`~manywidgets.Binder`.
    """

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    # Data / type
    chart_type = traitlets.Unicode(
        "line", help="Default series type (line, scatter, bar, …)."
    ).tag(sync=True)
    series_data = traitlets.List(
        [], help="The chart series (use add_series/update_series/clear_series)."
    ).tag(sync=True)
    chart_options = traitlets.Dict(
        {}, help="Extra Chart.js options, deep-merged into the defaults."
    ).tag(sync=True)
    palette = traitlets.List(
        [],
        help=(
            "Ordered series colors. A theme's chart_palette flows here; a "
            "series' own color still wins, and empty falls back to the default."
        ),
    ).tag(sync=True)

    def __init__(self, *, theme=None, palette=None, **kwargs):
        # A canvas can't read CSS variables, so a theme's series colors arrive as
        # a real trait rather than via _theme_vars. An explicit palette= wins.
        if palette is None and theme is not None:
            chart_palette = getattr(theme, "chart_palette", None)
            if chart_palette:
                palette = list(chart_palette)
        if palette is not None:
            kwargs["palette"] = palette
        super().__init__(theme=theme, **kwargs)

    # Layout / labels
    width = traitlets.Int(800, help="Width in pixels.").tag(sync=True)
    height = traitlets.Int(400, help="Height in pixels.").tag(sync=True)
    title = traitlets.Unicode("", help="Chart title.").tag(sync=True)
    x_label = traitlets.Unicode("", help="X-axis title.").tag(sync=True)
    y_label = traitlets.Unicode("", help="Y-axis title.").tag(sync=True)

    # Presentation toggles
    animation_enabled = traitlets.Bool(True, help="Animate chart updates.").tag(sync=True)
    tooltips_enabled = traitlets.Bool(True, help="Show hover tooltips.").tag(sync=True)
    legend_enabled = traitlets.Bool(True, help="Show the legend.").tag(sync=True)

    # Interaction state (written from JS on click/hover)
    clicked_point = traitlets.Dict(
        {}, help="Written from JS on click: {series, index, x, y, label}."
    ).tag(sync=True)
    hover_point = traitlets.Dict(
        {}, help="Written from JS on hover: {series, index, x, y, label}."
    ).tag(sync=True)

    def add_series(
        self,
        x=None,
        y=None,
        data=None,
        series_type=None,
        name=None,
        color=None,
        **options,
    ):
        """Append a data series.

        Provide either ``data`` as a list of ``[x, y]`` pairs, or separate
        ``x`` and ``y`` sequences. numpy arrays are accepted and coerced.
        """
        data = self._coerce_points(x, y, data)
        series = {
            # Only pin a type when the caller asks for one; otherwise leave it
            # unset so the series follows the chart's live ``chart_type`` (lets a
            # control bound to ``chart_type`` re-type the chart).
            "type": series_type,
            "data": data,
            "name": name or f"Series {len(self.series_data) + 1}",
        }
        if color:
            series["color"] = color
        series.update(options)
        self.series_data = [*self.series_data, series]

    def clear_series(self):
        """Remove all data series."""
        self.series_data = []

    def update_series(self, index, x=None, y=None, data=None):
        """Replace the data of an existing series in place."""
        data = self._coerce_points(x, y, data)
        if 0 <= index < len(self.series_data):
            current = [dict(s) for s in self.series_data]
            current[index]["data"] = data
            self.series_data = current

    def set_options(self, **options):
        """Merge extra Chart.js options into ``chart_options``."""
        self.chart_options = {**self.chart_options, **options}

    @staticmethod
    def _coerce_points(x, y, data):
        if data is not None:
            return _to_list(data)
        x = _to_list(x)
        y = _to_list(y)
        if x is not None and y is not None:
            return [[x[i], y[i]] for i in range(len(x))]
        raise ValueError("Must provide either 'data' or both 'x' and 'y'")
