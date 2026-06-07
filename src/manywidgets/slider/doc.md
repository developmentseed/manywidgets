# Slider

A labelled numeric slider whose `value` drives other widgets.

## Import

```python
from manywidgets import Slider
```

## Example

```{code-cell} python
from manywidgets import Slider

Slider(label="Amplitude", min=0, max=10, step=0.5, value=3)
```

## API

{api-table}

## Linking

Link like any widget (see the [linking guide](../guides/linking.md)):

```python
from ipywidgets import jsdlink
from manywidgets import Chart, Slider

slider = Slider(label="Height", min=200, max=600, value=320)
chart = Chart(title="Linked")
jsdlink((slider, "value"), (chart, "height"))
```

## Styling

Themed via the [styling guide](../guides/styling.md). Widget-specific token:

- `--mw-control-max-width` (default `320px`) — the control's max width.
