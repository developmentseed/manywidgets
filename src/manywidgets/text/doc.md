# Text

A text readout, optionally rendered as Markdown.

## Import

```python
from manywidgets import Text
```

## Example

Read-only — drive it from another widget (see the
[linking guide](../guides/linking.md)). Echo a dropdown selection, rendered as Markdown:

```{code-cell} python
from ipywidgets import jsdlink
from manywidgets import Dropdown, Text

pick = Dropdown(options=["**bold**", "_italic_", "`code`"], value="**bold**")
echo = Text(markdown=True)
jsdlink((pick, "value"), (echo, "value"))
display(pick, echo)
```

## API

{api-table}

With `markdown=True`, `value` is parsed to HTML and set as `innerHTML` — treat it
as any notebook-authored content.
