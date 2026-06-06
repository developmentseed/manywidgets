# Stat

A compact metric card: label, value, unit, and an optional signed delta.

## Import

```python
from manywidgets import Stat
```

## Minimal example

```{code-cell} python
from manywidgets import Stat

Stat(label="Revenue", value=1234, unit="USD", delta=12)
```

## API

{api-table}

## Interactive (linked)

`Stat` is read-only — drive it from another widget. Click the button:

```{code-cell} python
from ipywidgets import jsdlink
from manywidgets import Button, Stat

btn = Button(label="+1")
clicks = Stat(label="Clicks", value=0)
jsdlink((btn, "clicks"), (clicks, "value"))
display(btn, clicks)
```

## Linking

```python
from ipywidgets import jsdlink
from manywidgets import Button, Stat

btn = Button(label="+1")
stat = Stat(label="Clicks")
jsdlink((btn, "clicks"), (stat, "value"))
```

See the [linking guide](../guides/linking.md).

## Caveats (static export)

Renders and updates from `jslink`/`Binder` with no kernel.
