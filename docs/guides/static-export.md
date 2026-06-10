---
title: Static export (no kernel)
---

# Static export (no kernel)

manywidgets widgets are ordinary anywidgets in a live Jupyter kernel, but they
are authored so they also render in a **static MyST site with no kernel** —
using the [`myst-anywidget-static-export`](https://github.com/developmentseed/myst-anywidget-static-export)
plugin. manywidgets has **no code dependency** on the plugin; it just follows the
rules the plugin needs.

## How it works

1. Execute your notebook (live kernel) so widget state — including each widget's
   `_esm` JS — is captured into the notebook's `metadata.widgets`:

   ```bash
   jupyter nbconvert --to notebook --execute --inplace your_notebook.ipynb
   ```

2. Reference the plugin by release URL in `myst.yml`:

   ```yaml
   project:
     plugins:
       - https://github.com/developmentseed/myst-anywidget-static-export/releases/download/v0.3.0/plugin.mjs
   ```

3. Build the site: `myst build --html`. The plugin rewrites each widget output
   into a self-contained anywidget that hydrates in the browser, and lifts
   `jslink`/`jsdlink` links into a page-level registry so links work with no
   kernel.

The [demo notebook](../examples/demo.ipynb) and every page under **Widgets** are
built exactly this way — each widget page is a pre-executed notebook, so its
example renders a real widget with no kernel.

```{important}
**Serve the built site over HTTP — don't open it via `file://`.** The site's asset
URLs are absolute (`/build/...`), and widgets load their JS via dynamic `import()`,
which browsers block on `file://` origins. After `myst build --html`, serve it:

​    npm run serve        # python -m http.server -d docs/_build/html 8000

then open `http://localhost:8000`. If you deploy under a sub-path (e.g. GitHub
Pages project sites), build with a matching `BASE_URL` (see `deploy.yml`).
```

### Making a page render widgets

A page only shows live widgets if it is a **pre-executed notebook**. A plain
Markdown page with a ```python fence shows the code but renders no widget — MyST
does not execute Markdown code into widget outputs. So put runnable examples in
`.ipynb` pages (the Widgets pages do this) and pre-execute them before building.

## What works statically

- Widgets render and are interactive (sliders drag, dropdowns select, charts draw).
- `jslink` / `jsdlink` between manywidgets (both endpoints are anywidgets).
- `Binder` (transforms and nested-path targets), via core's `resolveModel`.

## What needs a live kernel

- Python-side callbacks (e.g. `Button.on_click`) and any `observe` handlers —
  there is no kernel to run them. The browser-side state still updates, so
  `jslink`/`Binder` targets respond; only Python callbacks are inert.
- Binary-buffer traits: mystmd's executor drops buffers, so a widget carrying
  binary traits needs an `nbclient` pre-execute step. The v1 widgets are all
  buffer-free (JSON traits), so this does not apply here.

## The "one listener per trait" rule

The static-export models do **not** support space-separated event names:
`model.on("change:a change:b", fn)` silently never fires. Every manywidgets
widget therefore uses `onChanges(model, ["a","b"], fn)` from `@manywidgets/core`,
which registers one listener per trait. If you build your own widget, follow the
same rule — see [Create your own widget](create-your-own-widget.md).

> This is a workaround for a plugin limitation. See
> [`docs/upstream/static-export-plugin-notes.md`](https://github.com/developmentseed/manywidgets/blob/main/docs/upstream/static-export-plugin-notes.md)
> for the upstream fix that would make space-separated names work.
