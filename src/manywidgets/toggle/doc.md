# Toggle

A labelled boolean switch.

## Import

```python
from manywidgets import Toggle
```

## Example

```{code-cell} python
from manywidgets import Toggle

Toggle(label="Show legend", value=True)
```

## API

{api-table}

## Linking

Link like any widget (see the [linking guide](../guides/linking.md)):

```python
from ipywidgets import jsdlink
from manywidgets import Chart, Toggle

chart = Chart()
legend = Toggle(label="Legend", value=True)
jsdlink((legend, "value"), (chart, "legend_enabled"))
```
