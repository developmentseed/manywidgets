# NumberDisplay

A large animated number readout that counts to its `value`.

## Import

```python
from manywidgets import NumberDisplay
```

## Example

Read-only — drive it from another widget (see the
[linking guide](../guides/linking.md)). Drag the slider to watch it count:

```{code-cell} python
from ipywidgets import jsdlink
from manywidgets import Slider, NumberDisplay

s = Slider(label="Drag me", min=0, max=1000, value=250)
nd = NumberDisplay(label="Selected", format="{:,.0f}", duration=400)
jsdlink((s, "value"), (nd, "value"))
display(s, nd)
```

## API

{api-table}
