# Binder

Link a source widget's trait into a target's, with an optional linear transform
(`multiplier`/`offset`) or a nested dotted-path target.

## Import

```python
from manywidgets import Binder
```

## Example

Drag the slider — the chart's `width` follows `value × 100`:

```{code-cell} python
import numpy as np
from manywidgets import Slider, Chart, Binder

x = np.linspace(0, 10, 100)
chart = Chart(title="sin")
chart.add_series(x=x, y=np.sin(x), name="sin")

width = Slider(label="Width", min=4, max=12, value=8)
binder = Binder(source=width, source_field="value",
                target=chart, target_field="width", multiplier=100)

display(width, chart, binder)
```

## API

{api-table}

`Binder` covers what `jslink`/`jsdlink` can't: a linear transform on the value, or
writing a nested **dotted-path** target (e.g. `target_field="view_state.zoom"`),
merged into the parent dict. For plain pass-through links, prefer `jslink` — see the
[linking guide](../guides/linking.md).
