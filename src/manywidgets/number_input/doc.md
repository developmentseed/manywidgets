# NumberInput

A labelled numeric input (spinner).

## Import

```python
from manywidgets import NumberInput
```

## Example

```{code-cell} python
from manywidgets import NumberInput

NumberInput(label="Count", min=0, max=100, step=5, value=10)
```

## API

{api-table}

## Linking

Link like any widget (see the [linking guide](../guides/linking.md)):

```python
from ipywidgets import jsdlink
from manywidgets import Chart, NumberInput

chart = Chart()
w = NumberInput(label="Width", min=200, max=1200, value=800)
jsdlink((w, "value"), (chart, "width"))
```

## Styling

Themed via the [styling guide](../guides/styling.md). Widget-specific token:

- `--mw-control-max-width` (default `320px`) — the control's max width.
