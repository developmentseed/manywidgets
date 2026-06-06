# LayerFilter

A checkbox legend that filters a [lonboard](https://developmentseed.org/lonboard/)
layer by category (writes `filter_categories` from the layer's
`DataFilterExtension`). Works live and in static export.

```{note}
`manywidgets.lonboard` is optional — install it with
`pip install "manywidgets[lonboard]"`. See the [lonboard guide](../guides/lonboard.md).
This page is reference only; the [interop example](../examples/lonboard-map.ipynb)
shows a **live map** with these controls.
```

## Import

```python
from manywidgets.lonboard import LayerFilter
```

## Usage

```python
from lonboard import Map, ScatterplotLayer
from lonboard.layer_extension import DataFilterExtension
from manywidgets import Column
from manywidgets.lonboard import LayerFilter

layer = ScatterplotLayer.from_geopandas(
    gdf,
    extensions=[DataFilterExtension(category_size=1)],
    get_filter_category=bands,          # one category per row
    filter_categories=[0, 1, 2, 3],
)
m = Map(layer, basemap=None)
legend = LayerFilter(layer, categories=[[0, "Shallow"], [1, "Mid"], [2, "Deep"], [3, "Very deep"]], label="Depth")

Column(legend, m)
```

## API

{api-table}

## Caveats (static export)

The write fans out to every layer proxy and re-applies for late-loading proxies.
The layer's data must be pre-executed (`nbclient`) so its Arrow buffers embed.
