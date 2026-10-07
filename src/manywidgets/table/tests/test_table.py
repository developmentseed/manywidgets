import json
import math
from datetime import datetime, timezone

import pytest

from manywidgets.table import Table
from manywidgets.table.widget import _json_safe

TRAITS = (
    "rows",
    "columns",
    "id_key",
    "selected",
    "hovered",
    "max_height",
    "sortable",
    "title",
    "empty_text",
)


def test_defaults_and_sync():
    t = Table()
    assert t.rows == [] and t.columns == [] and t.id_key == "" and t.selected == ""
    assert t.max_height == "320px" and t.sortable is True and t.empty_text == "No rows"
    for name in TRAITS + ("widget_id",):
        assert t.trait_metadata(name, "sync") is True


def test_rows_columns_and_selected():
    t = Table(
        [{"id": "a", "n": 1}, {"id": "b", "n": 2}],
        ["id", {"key": "n", "format": "number"}],
        id_key="id",
        selected="b",
    )
    assert t.rows == [{"id": "a", "n": 1}, {"id": "b", "n": 2}]
    assert t.columns == [{"key": "id"}, {"key": "n", "format": "number"}]
    assert t.id_key == "id" and t.selected == "b"


def test_from_records():
    t = Table.from_records(({"id": i, "v": i * 2} for i in range(3)), id_key="id")
    assert len(t.rows) == 3 and t.rows[2] == {"id": 2, "v": 4}
    assert t.id_key == "id"


def test_json_safe_coercions():
    np = pytest.importorskip("numpy")
    dt = datetime(2025, 10, 29, 11, 11, 30, tzinfo=timezone.utc)
    t = Table([{"f": np.float32(1.5), "i": np.int64(3), "nan": float("nan"), "dt": dt, "arr": np.arange(2)}])
    row = t.rows[0]
    assert row["f"] == 1.5 and type(row["f"]) is float
    assert row["i"] == 3 and type(row["i"]) is int
    assert row["nan"] is None
    assert row["dt"] == "2025-10-29T11:11:30+00:00"
    assert row["arr"] == [0, 1]
    assert _json_safe(math.inf) is None
    json.dumps({k: getattr(t, k) for k in TRAITS})


def test_from_dataframe_uses_index_as_id():
    pd = pytest.importorskip("pandas")
    df = pd.DataFrame(
        {"size": [1.0, float("nan")], "when": pd.to_datetime(["2025-01-01", "2025-01-02"])},
        index=pd.Index(["g1", "g2"], name="granule"),
    )
    t = Table.from_dataframe(df)
    assert t.id_key == "id"
    assert t.rows[0]["id"] == "g1" and t.rows[1]["size"] is None
    assert t.rows[0]["when"].startswith("2025-01-01")
    json.dumps({k: getattr(t, k) for k in TRAITS})

    t2 = Table.from_dataframe(df.reset_index(), id_key="granule")
    assert t2.id_key == "granule" and t2.rows[0]["granule"] == "g1"


def test_auto_widget_id_prefix():
    assert Table().widget_id.startswith("table_")
