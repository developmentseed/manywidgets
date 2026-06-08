---
name: manywidgets
description: >-
  Build, lay out, and link manywidgets widgets in Jupyter notebooks — charts
  (Chart), input controls (Slider, RangeSlider, Dropdown, Toggle, Button,
  NumberInput), value displays (Stat, NumberDisplay, Text, Legend), layout
  containers (Row, Column, Grid), the Binder linking primitive, and lonboard map
  interop (LayerToggle, LayerFilter, FilterBinder). Use when constructing notebook
  widgets or dashboards with manywidgets, composing layouts, linking widgets'
  values, or authoring a new manywidgets widget.
---

# manywidgets

`manywidgets` is a set of [anywidget](https://anywidget.dev)-based widgets for
data analysis and geospatial work in notebooks. Widgets are self-contained,
compose, link to each other, and render both in a live Jupyter kernel and
statically (no kernel) via the `myst-anywidget-static-export` MyST plugin.

## Install

```bash
pip install manywidgets
pip install "manywidgets[lonboard]"   # optional lonboard map interop
```

## The import surface

```python
from manywidgets import (
    Chart,                                                       # Chart.js charts
    Slider, RangeSlider, Dropdown, Toggle, Button, NumberInput,  # input controls
    Stat, NumberDisplay, Text, Legend,                           # value displays
    Row, Column, Grid,                                           # layout containers
    Binder,                                                      # linking w/ transforms
)
from manywidgets.lonboard import LayerToggle, LayerFilter, FilterBinder  # optional
```

Construct a widget with its traits as keyword arguments and display it by leaving
it as the last expression in a cell:

```python
Slider(label="Amplitude", min=0, max=5, value=1)
```

## Linking (two tools)

- **`ipywidgets.jslink` / `jsdlink`** — pass-through link, "A's trait = B's trait".
  The canonical, kernel-free choice; works live and statically.
- **`Binder`** — when you need a transform (`target = source*multiplier + offset`)
  or a nested/dotted-path target (e.g. `view_state.zoom`) that jslink can't express.

## Where to read more

- **`references/widgets-api.md`** — every widget, its traits, defaults, and a
  constructor signature. Auto-generated from the code, so it's authoritative.
  Read this first when you need exact trait names or defaults.
- **`references/usage.md`** — how to display widgets, compose `Row`/`Column`/`Grid`
  layouts, link widgets (`jslink`/`jsdlink`/`Binder`), drive charts, and handle
  events (`Button.on_click`, `observe`).
- **`references/authoring.md`** — how to author a new manywidgets widget, including
  the static-export safety rules you must follow.

## Key facts

- Every widget has an auto-assigned `widget_id`; `Binder` and cross-widget links
  use it. You normally don't set it.
- Widgets are authored to survive **static export** (no kernel). Python-side
  callbacks (`Button.on_click`, `observe`) only run with a live kernel; browser
  links (`jslink`/`Binder`) keep working statically.
