# Dropdown

A labelled `<select>` control. `options` is a list of scalars or `[label, value]`
pairs.

## Import

```python
from manywidgets import Dropdown
```

## Minimal example

```{code-cell} python
from manywidgets import Dropdown

Dropdown(label="Chart type", options=["line", "bar", "scatter"], value="line")
```

## API

{api-table}

## Linking

Link like any widget (see the [linking guide](../guides/linking.md)):

```python
from ipywidgets import jsdlink
from manywidgets import Chart, Dropdown

chart = Chart()
kind = Dropdown(options=["line", "bar", "scatter"], value="line")
jsdlink((kind, "value"), (chart, "chart_type"))
```

## Caveats (static export)

Selection writes are kernel-free no-ops for `save_changes`; the value still
propagates to `jslink`/`Binder` targets in the browser.
