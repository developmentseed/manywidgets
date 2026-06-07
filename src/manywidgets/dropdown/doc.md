# Dropdown

A labelled `<select>` control.

## Import

```python
from manywidgets import Dropdown
```

## Example

```{code-cell} python
from manywidgets import Dropdown

Dropdown(label="Chart type", options=["line", "bar", "scatter"], value="line")
```

## API

{api-table}

`options` is a list of scalars or `[label, value]` pairs.

## Linking

Link like any widget (see the [linking guide](../guides/linking.md)):

```python
from ipywidgets import jsdlink
from manywidgets import Chart, Dropdown

chart = Chart()
kind = Dropdown(options=["line", "bar", "scatter"], value="line")
jsdlink((kind, "value"), (chart, "chart_type"))
```
