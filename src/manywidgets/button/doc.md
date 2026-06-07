# Button

A click button with a `clicks` counter and Python `on_click` callbacks.

## Import

```python
from manywidgets import Button
```

## Example

```{code-cell} python
from manywidgets import Button

btn = Button(label="Run")
btn
```

## API

{api-table}

`on_click(callback, remove=False)` registers/removes a `callback(button)` fired
when `clicks` increases (live kernel only).

```python
btn = Button(label="Run")

@btn.on_click
def _(b):
    print("clicked", b.clicks, "times")
```

## Linking

Link `clicks` like any trait (see the [linking guide](../guides/linking.md)):

```python
from ipywidgets import jsdlink
from manywidgets import Button, NumberDisplay

btn = Button(label="+1")
count = NumberDisplay(label="Clicks", duration=0)
jsdlink((btn, "clicks"), (count, "value"))
```
