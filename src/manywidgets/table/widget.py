"""Table — a sortable, selectable table of records.

A read-mostly display for lists of dicts (search results, granules, rows of a
DataFrame). Clicking a row writes its id to ``selected``; link that trait to a
map or chart with ``jslink`` so the two stay in sync, live or static. Every
trait is plain JSON so the widget state round-trips through both nbconvert and
JupyterLab's "Save Widget State".
"""

from __future__ import annotations

import math

import traitlets

from .._base import BaseWidget, asset


def _json_safe(value):
    """Coerce numpy/pandas scalars, timestamps and NaN into JSON-safe values."""
    if value is None or isinstance(value, (bool, int, str)):
        return value
    if isinstance(value, float):
        return None if math.isnan(value) or math.isinf(value) else value
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_safe(v) for v in value]
    if hasattr(value, "isoformat"):  # datetime / date / pandas Timestamp
        try:
            return value.isoformat()
        except (TypeError, ValueError):  # NaT
            return None
    if getattr(value, "ndim", 0) > 0 and hasattr(value, "tolist"):  # numpy array
        return _json_safe(value.tolist())
    if hasattr(value, "item"):  # numpy scalar
        return _json_safe(value.item())
    return str(value)


def _norm_rows(rows):
    return [{str(k): _json_safe(v) for k, v in dict(row).items()} for row in rows]


def _norm_columns(columns):
    out = []
    for col in columns or []:
        if isinstance(col, str):
            out.append({"key": col})
        else:
            out.append({str(k): _json_safe(v) for k, v in dict(col).items()})
    return out


class Table(BaseWidget):
    """A sortable table with a single selectable row."""

    _esm = asset(__file__, "dist", "widget.js")
    _css = asset(__file__, "style.css")

    rows = traitlets.List(
        traitlets.Dict(),
        [],
        help="Records to display, one dict per row (JSON-safe values).",
    ).tag(sync=True)
    columns = traitlets.List(
        traitlets.Dict(),
        [],
        help=(
            "Column specs: {key, label?, format?: text|number|bytes|datetime, "
            "align?: left|right, digits?}. Empty: derived from the first row."
        ),
    ).tag(sync=True)
    id_key = traitlets.Unicode(
        "", help="Row key used as the row id. Empty: the row index."
    ).tag(sync=True)
    selected = traitlets.Unicode(
        "", help="Id of the selected row (two-way; set by row click)."
    ).tag(sync=True)
    hovered = traitlets.Unicode(
        "", help="Id of the row under the pointer, or empty."
    ).tag(sync=True)
    max_height = traitlets.Unicode(
        "320px", help="CSS max-height of the scrolling body."
    ).tag(sync=True)
    sortable = traitlets.Bool(True, help="Allow sorting by clicking a header.").tag(sync=True)
    title = traitlets.Unicode("", help="Optional table title.").tag(sync=True)
    empty_text = traitlets.Unicode("No rows", help="Shown when there are no rows.").tag(
        sync=True
    )

    def __init__(self, rows=None, columns=None, *, id_key="", selected="", **kwargs):
        if rows is not None:
            kwargs.setdefault("rows", _norm_rows(rows))
        if columns is not None:
            kwargs.setdefault("columns", _norm_columns(columns))
        if id_key:
            kwargs.setdefault("id_key", id_key)
        if selected:
            kwargs.setdefault("selected", str(selected))
        super().__init__(**kwargs)

    @classmethod
    def from_records(cls, records, columns=None, id_key="", **kwargs):
        """Build a table from an iterable of dicts."""
        return cls(list(records), columns, id_key=id_key, **kwargs)

    @classmethod
    def from_dataframe(cls, df, id_key=None, columns=None, **kwargs):
        """Build a table from a pandas DataFrame.

        With ``id_key=None`` the index becomes an ``id`` column used as the row
        id; otherwise ``id_key`` names an existing column.
        """
        import pandas as pd  # noqa: F401 — optional dependency, imported lazily

        frame = df
        if id_key is None:
            frame = df.reset_index()
            index_col = frame.columns[0]
            if index_col != "id":
                frame = frame.rename(columns={index_col: "id"})
            id_key = "id"
        records = frame.to_dict("records")
        return cls(records, columns, id_key=id_key, **kwargs)
