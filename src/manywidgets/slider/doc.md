# Slider

A labelled numeric range slider whose `value` drives other widgets.

## Import

```python
from manywidgets import Slider
```

## Minimal example

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

## Caveats (static export)

Writes go through `model.save_changes()`, a safe no-op with no kernel — the slider
stays interactive and drives `jslink`/`Binder` targets in the browser.
