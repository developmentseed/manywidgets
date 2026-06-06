---
title: Create your own widget
---

# Create your own widget

Every manywidgets widget follows the same self-contained structure, so the
fastest way to make a new one is to **copy an existing widget directory** and
rename it. A widget is a complete unit: Python class, TypeScript source, built
bundle, styles, and its own tests.

## 1. Copy a widget directory

```bash
cp -r src/manywidgets/slider src/manywidgets/my_widget
```

You get:

```
src/manywidgets/my_widget/
├── __init__.py        # re-export the class
├── widget.py          # the BaseWidget subclass (traits + methods)
├── doc.md             # the widget's docs (auto-assembled into the docs site)
├── src/index.ts       # the render() function
├── style.css          # styling via the _css trait
├── dist/widget.js     # built by esbuild (gitignored)
└── tests/
    ├── test_my_widget.py    # pytest
    └── my_widget.test.ts    # vitest + jsdom
```

Rename the class in `widget.py` and `__init__.py`, update `tests/` and `doc.md`,
then add the class to `src/manywidgets/__init__.py` and to the `ensured-targets` /
`skip-if-exists` lists in `pyproject.toml`. The build (`scripts/build.mjs`)
auto-discovers any widget dir with a `src/index.ts`.

## Docs (`doc.md`) — co-located and auto-assembled

A widget owns its docs. `scripts/build_widget_docs.py` turns each
`doc.md` into `docs/widgets/<name>.ipynb` (a gitignored build artifact) and the
MyST site picks it up. In `doc.md`:

- Write prose as Markdown.
- Write a runnable example as a ` ```{code-cell} python ` fence — it becomes an
  executed cell, so a **live widget** renders on the page. (Plain ` ```python `
  fences stay illustrative.)
- Put `{api-table}` where the trait table should go — it's generated from the
  class's traits, so give each trait a `help="…"` and the table stays correct.

Add the new page to the `widgets:` toc in `docs/myst.yml`. Regenerate with
`npm run docs:gen`.

## 2. The golden-example pattern

- **`widget.py`** subclasses `BaseWidget` (which auto-assigns `widget_id`) and
  points `_esm` / `_css` at its own files via `asset(__file__, ...)`:

  ```python
  from .._base import BaseWidget, asset

  class MyWidget(BaseWidget):
      _esm = asset(__file__, "dist", "widget.js")
      _css = asset(__file__, "style.css")
      value = traitlets.Float(0.0).tag(sync=True)
  ```

- **`src/index.ts`** exports `{ render }`, builds plain DOM (no frameworks), and
  imports shared helpers from `@manywidgets/core`.

## 3. The static-export safety rules

manywidgets widgets render both in a live kernel **and** statically (no kernel)
via the `myst-anywidget-static-export` plugin. To stay compatible:

1. **Wrap every `model.save_changes()`** — use `safeSaveChanges(model)` from
   core (there is no kernel statically).
2. **One listener per trait.** Use `onChanges(model, ["a", "b"], fn)` — never
   `model.on("change:a change:b", fn)`. The static model emitter does not split
   space-separated event names, so the combined form silently never fires. (This
   is the single most common static-export bug; see
   [static export](static-export.md).)
3. **Style via the `_css` trait** (or `ensureShadowCss` from core for libraries
   that inject CSS at runtime) — never append a `<link>` into the mount `el`.
4. **Vanilla DOM only** — no `createRoot(el)` that wipes shadow children.
5. **Stay buffer-free** for core widgets (JSON-serialisable traits). Binary
   traits need an `nbclient` pre-execute step on export.
6. **Cross-widget access via `resolveModel`** from core — it resolves root
   widgets by `widget_id` and fans writes out to sub-model proxies, handling the
   live-kernel and static-export cases.

## 3b. Container widgets (laying out children)

A widget can render *other* widgets inside its own DOM — that's how `Row`,
`Column`, and `Grid` work. Two pieces:

- **Python:** hold children as widget references and mark the trait:

  ```python
  from ipywidgets import Widget, widget_serialization

  children = traitlets.List(trait=traitlets.Instance(Widget)).tag(sync=True, **widget_serialization)
  _myst_child_traits = traitlets.List(["children"]).tag(sync=True)
  ```

  `widget_serialization` serialises each child to an `IPY_MODEL_<id>` ref, so the
  static export bundles it as a renderable submodel.

- **JS:** mount each child with `renderChild` from core (it picks the static
  `host.renderChild` path or the live `widget_manager` path for you):

  ```js
  import { renderChild } from "@manywidgets/core";
  const cleanups = [];
  for (const ref of model.get("children") || []) {
    const cell = container.appendChild(document.createElement("div"));
    cleanups.push(await renderChild(args, ref, cell)); // pass the whole render args
  }
  return () => cleanups.forEach((d) => d());
  ```

Children keep their own JS, CSS, and links. Requires plugin v0.2.0+ for static
export. Test with the `fakeHost()` helper from `@manywidgets/test-utils`.

## 4. Tests

Write both:

- `tests/test_<name>.py` — traits, defaults, methods (pytest).
- `tests/<name>.test.ts` — `render()` behaviour with the shared
  `fakeModel` from `@manywidgets/test-utils`. The fake model mimics the **strict
  static emitter** (exact event names only), so a regression to space-separated
  `on(...)` fails the test automatically.

Run them: `pytest` and `npm test`.
