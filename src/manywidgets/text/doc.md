# Text

A text readout, optionally rendered as Markdown.

## Import

```python
from manywidgets import Text
```

## Minimal example

```{code-cell} python
from manywidgets import Text

Text(value="**Status:** ready", markdown=True)
```

## API

{api-table}

## Interactive (linked)

Echo a dropdown selection into the text readout:

```{code-cell} python
from ipywidgets import jsdlink
from manywidgets import Dropdown, Text

pick = Dropdown(options=["alpha", "beta", "gamma"], value="alpha")
echo = Text()
jsdlink((pick, "value"), (echo, "value"))
display(pick, echo)
```

## Linking

```python
from ipywidgets import jsdlink
from manywidgets import Dropdown, Text

pick = Dropdown(options=["a", "b", "c"], value="a")
echo = Text()
jsdlink((pick, "value"), (echo, "value"))
```

See the [linking guide](../guides/linking.md).

## Caveats (static export)

Renders with no kernel. With `markdown=True`, `value` is parsed to HTML and set as
`innerHTML` — treat it as any notebook-authored content.
