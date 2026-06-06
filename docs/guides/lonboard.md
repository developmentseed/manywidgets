---
title: lonboard interop
---

# lonboard interop

`manywidgets.lonboard` ships control widgets for [lonboard](https://developmentseed.org/lonboard/)
maps. They're an **optional** subpackage:

```bash
pip install "manywidgets[lonboard]"
```

These are *control-plane* widgets — they reference a lonboard `Map`/layer and mutate
its traits; they don't render the map. They work in a live kernel **and** in static
export (no kernel), resolving the layer through `@manywidgets/core`'s `resolveModel`
and fanning each write out to every proxy of the layer (the `Map` keeps its own).

## Widgets

- [`LayerToggle`](../widgets/layer_toggle.ipynb) — show/hide a layer (`visible`).
- [`FilterBinder`](../widgets/filter_binder.ipynb) — drive a layer's `filter_range`
  from a `RangeSlider` (`DataFilterExtension`).
- [`LayerFilter`](../widgets/layer_filter.ipynb) — filter a layer by category
  (`filter_categories`) via a checkbox legend.

Compose them with the [layout widgets](../widgets/row.ipynb) to put a control panel
beside the map:

```python
from manywidgets import Column
from manywidgets.lonboard import LayerToggle, FilterBinder

Column(LayerToggle(layer), FilterBinder(slider, layer), m)
```

## Caveats

- **No `MapFlyer` / live view control.** lonboard's `Map.view_state` is *uncontrolled*
  (deck.gl `initialViewState`): writing it does **not** re-position an already-rendered
  map. Set the initial `view_state` on the `Map` itself; there's no widget to fly it.
- **Seconds, not milliseconds** for time filters — `DataFilterExtension` compares as
  float32 in the shader, so millisecond timestamps overflow its exact-integer range.
  Use seconds for `get_filter_value` and the slider bounds.
- **Static export needs a pre-execute.** lonboard layers carry binary Arrow buffers;
  execute the notebook (`jupyter nbconvert --execute`) so the buffers embed in the
  page.
- **Basemap.** By default the `Map` uses lonboard's carto basemap, whose tiles are
  fetched from the network when the page is viewed (fine for an online docs site).
  Pass `basemap=None` for a fully-offline page (blank background; the data layer
  still renders).

See the [interop example](../examples/lonboard-map.ipynb) for a working map.
