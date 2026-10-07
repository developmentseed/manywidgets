# Table

A sortable table of records with a single selectable row. Click a header to
sort, click a row to select it; `selected` is a plain string trait, so it links
to a map or chart with `jslink`.

## Import

```python
from manywidgets import Table
```

## Example

```{code-cell} python
from manywidgets import Table

granules = [
    {"id": "G-001", "start": "2025-10-29T11:11:30Z", "track": 4, "pol": "DHDH", "size": 5_300_000_000},
    {"id": "G-002", "start": "2025-10-29T11:11:53Z", "track": 4, "pol": "DHDH", "size": 4_900_000_000},
    {"id": "G-003", "start": "2025-10-31T02:40:12Z", "track": 18, "pol": "SHNA", "size": 2_100_000_000},
    {"id": "G-004", "start": "2025-11-02T14:05:00Z", "track": 18, "pol": "DHDH", "size": 5_150_000_000},
    {"id": "G-005", "start": "2025-11-03T09:22:48Z", "track": 31, "pol": "DHDH", "size": 980_000_000},
]

Table(
    granules,
    columns=[
        {"key": "id", "label": "Granule"},
        {"key": "start", "label": "Start (UTC)", "format": "datetime"},
        {"key": "track", "label": "Track", "format": "number"},
        {"key": "pol", "label": "Pol."},
        {"key": "size", "label": "Size", "format": "bytes"},
    ],
    id_key="id",
    selected="G-002",
    title="Granules",
)
```

## API

{api-table}

Rows are plain dicts; `Table.from_records(records, columns, id_key)` and
`Table.from_dataframe(df, id_key)` build one from an iterable of dicts or a
pandas DataFrame (values are coerced to JSON, so the state survives static
export). When `columns` is empty they are derived from the first row; when
`id_key` is empty the row index is the id. Formats: `text` (default), `number`
(`toLocaleString`, optional `digits`), `bytes` (`5.3 GB`), `datetime` (ISO
input → `2025-10-29 11:11:30`, UTC).

## Linking the selection

`selected` is two-way: a row click writes it, and writing it from outside
highlights and scrolls to the row. Link it to another widget's trait with
`jslink` so the two stay in sync without a kernel:

```python
from ipywidgets import jslink

jslink((table, "selected"), (geo_map, "selected"))
```
