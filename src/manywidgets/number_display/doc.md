# NumberDisplay

A large animated number readout that counts to its `value`.

## Import

```python
from manywidgets import NumberDisplay
```

## Minimal example

```{code-cell} python
from manywidgets import NumberDisplay

NumberDisplay(label="Total", value=125000, format="{:,.0f}", duration=800)
```

## API

{api-table}

## Interactive (linked)

Drive it from a slider — drag to watch it count:

```{code-cell} python
from ipywidgets import jsdlink
from manywidgets import Slider, NumberDisplay

s = Slider(label="Drag me", min=0, max=1000, value=250)
nd = NumberDisplay(label="Selected", format="{:,.0f}", duration=400)
jsdlink((s, "value"), (nd, "value"))
display(s, nd)
```

## Linking

```python
from ipywidgets import jsdlink
from manywidgets import NumberDisplay, Slider

s = Slider(min=0, max=1000, value=250)
nd = NumberDisplay(label="Selected", format="{:,.0f}", duration=400)
jsdlink((s, "value"), (nd, "value"))
```

See the [linking guide](../guides/linking.md).

## Caveats (static export)

Read-only; animates and updates from linked sources with no kernel.
