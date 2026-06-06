---
title: Linking widgets
---

# Linking widgets

manywidgets are plain anywidgets, so they link like any anywidget — and they're
authored so those links also work in a **static export with no kernel**. There
are two complementary tools.

## 1. `jslink` / `jsdlink` (canonical)

For a plain pass-through link — "when A's trait changes, set B's trait to the
same value" — use `ipywidgets`'s browser-side links. They run entirely in the
browser (no kernel round-trip), so they work both live and statically. The
static-export plugin lifts these links into its host registry automatically.

```python
from ipywidgets import jslink, jsdlink
from manywidgets import Chart, Slider

slider = Slider(label="Height", min=200, max=600, value=320)
chart = Chart(title="Linked chart", height=320)

# one-directional: slider.value -> chart.height
jsdlink((slider, "value"), (chart, "height"))

# bidirectional: jslink((a, "value"), (b, "value"))
```

- `jsdlink(source, target)` — one-directional.
- `jslink(a, b)` — bidirectional.

Use this whenever the two traits should hold the **same value**.

## 2. `Binder` (transforms & nested paths)

When the link needs a **transform** or has to write a **nested / dotted-path**
target, jslink can't express it. `Binder` covers those cases. It computes
`target = source * multiplier + offset` and writes the result to the target
field — including a dotted path like `"view_state.zoom"`, which is merged into
the parent dict.

```python
from manywidgets import Binder, Chart, Slider

slider = Slider(label="Scale", min=1, max=10, value=3)
chart = Chart(title="Bound chart")

Binder(
    source=slider, source_field="value",
    target=chart, target_field="height",
    multiplier=100, offset=100,   # height = value*100 + 100
)
```

`Binder` accepts widget **instances** (it reads their `widget_id`) or explicit
id strings. Traits: `source_widget_id`, `source_field`, `target_widget_id`,
`target_field`, `multiplier`, `offset`, `label`.

### Dotted-path targets

```python
# write into a nested dict key (e.g. a lonboard map's view state)
Binder(source=zoom_slider, target=some_map, target_field="view_state.zoom")
```

The binder reads the current `view_state`, merges the new `zoom`, and writes the
whole object back so listeners see a single coherent update.

## Which one?

| Need | Use |
|---|---|
| Same value, A → B | `jsdlink` |
| Same value, A ↔ B | `jslink` |
| Scaled / offset value | `Binder` (`multiplier`/`offset`) |
| Write a nested dict key | `Binder` (dotted `target_field`) |

Both approaches work in a live kernel and in static export. Under the hood
`Binder` resolves the other widgets through `@manywidgets/core`'s `resolveModel`,
which handles the static-export hazards (a model id can map to several proxies;
a widget's wrapper may register late).
