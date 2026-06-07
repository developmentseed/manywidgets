# Stat

A compact metric card: label, value, unit, and an optional signed delta.

## Import

```python
from manywidgets import Stat
```

## Example

Read-only — drive it from another widget (see the
[linking guide](../guides/linking.md)). Click the button:

```{code-cell} python
from ipywidgets import jsdlink
from manywidgets import Button, Stat

btn = Button(label="+1")
clicks = Stat(label="Clicks", value=0)
jsdlink((btn, "clicks"), (clicks, "value"))
display(btn, clicks)
```

## API

{api-table}

## Styling

Themed via the [styling guide](../guides/styling.md). Widget-specific token:

- `--mw-stat-value-size` (default `30px`) — the metric value's font size.
