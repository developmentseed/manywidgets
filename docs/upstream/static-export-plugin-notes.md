# Notes for `myst-anywidget-static-export`

Findings from building `manywidgets` against the released plugin
([developmentseed/myst-anywidget-static-export](https://github.com/developmentseed/myst-anywidget-static-export),
v0.1.0). These are suggestions for the **plugin** repo — `manywidgets` already
works around #1 internally, so nothing here blocks using the current release.
Line references are against the v0.1.0 source tree.

## 1. Space-separated event names silently never fire (the real bug)

Backbone / ipywidgets models accept space-separated event names:
`model.on("change:a change:b", fn)` registers `fn` for both `change:a` and
`change:b`. This is idiomatic and appears throughout existing widget code
(including the original `chart_widget` this package is based on).

On the static-export models it **silently does nothing** — `fn` is registered
for the single literal event name `"change:a change:b"`, which is never emitted
(`set` emits `change:a` and `change:b` separately). No error; the listener just
never runs. This is invisible in a live kernel and only surfaces in static
export, so every widget author can hit it independently. We verified it with a
headless-browser test: `model.on("change:height", fn)` fires; `model.on("change:width change:height", fn)` does not.

A complete fix needs **two** spots, because root models and sub-models use
different machinery:

- **Sub-models** — `src/runtime/emitter.ts`. `Emitter.on` (lines 27–39) and
  `Emitter.off` (lines 41–50) take a single `event` string and call
  `addEventListener(event, …)` once. Split `event` on whitespace and
  register/unregister per name. (`SubModel.on/off` in `src/runtime/submodel.ts`
  delegate straight to `Emitter`, so fixing `Emitter` covers them.)
- **Root models** — `src/runtime/registry.ts`, `setupModel` (~lines 223–231).
  The root model passed to `render()` is an external `MystAnyModel` from
  `@myst-theme/anywidget`, not a `SubModel`, so the `Emitter` fix does not reach
  it. `setupModel` already shadows instance methods there:

  ```js
  model.save_changes = function () {};
  model.send = function () {};
  model.off = function () {};
  ```

  Add a wrapper for `model.on` (and a real `model.off`) that splits
  space-separated names before delegating to the original:

  ```js
  const _on = model.on.bind(model);
  model.on = (event, fn) => {
    for (const e of String(event).split(/\s+/).filter(Boolean)) _on(e, fn);
    return model;
  };
  ```

This would let existing/idiomatic widget JS work unchanged under static export.

## 2. `setupModel` stubs `model.off` to a no-op

In the same block, `model.off = function () {};` means listener removal on root
models does nothing. Harmless for static pages that never unmount, but if the
runtime ever supports re-render / teardown it would leak listeners. Worth a real
implementation (paired with the `on` wrapper above).

## 3. Minor: document cross-widget resolution keys (not a bug)

The registry keys root models by `widget_id` / UUID / `_anywidget_id` (see
`keysForState` in `src/runtime/refs.ts`); their `model_id` is unset. Only
sub-models (e.g. lonboard layers) carry `model_id`, and one id can map to
several proxies. So cross-widget lookups should use `registry.get(ref)` /
`host.waitForModel(ref)` for root widgets and `filter(m => m.model_id === id)`
only to fan out over sub-model proxies. (We initially matched only `model_id`,
which silently found nothing for root widgets.) A short note in the plugin's
"cross-widget interop" docs would save others the same debugging. `manywidgets`'
`resolveModel` (`packages/core/src/index.ts`) does both and can serve as a
reference.

## 4. Container renderer hook (enables widget layout) — feature request

Today there is no way to lay out multiple widgets in static export:

- ipywidgets `VBox`/`HBox`/`GridBox` are **unwrapped to their first anywidget
  descendant** (Hack #1), so siblings are dropped and layout is lost — `HBox([a, b])`
  renders only `a`.
- A **custom container anywidget can't render its children either**: a child
  referenced only inside a container is registered as a *state-only* `SubModel`
  (via `widget_manager.get_model`), not as a renderable widget. `getWidget(ref)`
  only resolves widgets that had a wrapper module emitted (i.e. top-level outputs),
  so a container has no way to mount its children.

The design notes already flag the fix ("expose a hook for a container renderer
that mounts each anywidget child individually"). Concretely, two changes would
unlock generic layout:

1. **Emit render bindings for referenced anywidget children.** When a top-level
   output is an anywidget whose state references other anywidget models (e.g. via a
   `children` trait or any `IPY_MODEL_` ref), emit a wrapper module + register a
   binding (`registerBinding`, so `getWidget` resolves them) for each referenced
   anywidget — not just a state proxy. Guard against double-rendering them as their
   own top-level outputs.
2. **Expose a child-render API on `host`.** Add e.g.
   `host.renderChild(ref, el): Promise<void>` that resolves the child's binding and
   model and renders it into `el` (the inverse of the current top-level
   `renderStaticWidget`). It builds directly on the existing `getWidget` / `getModel`
   registry methods (`src/runtime/registry.ts`).

With those, a container widget's `render({ model, el, host })` can do:

```js
const ids = model.get("children");           // ["IPY_MODEL_…", …]
el.style.display = "grid";                    // or flex
for (const id of ids) {
  const cell = el.appendChild(document.createElement("div"));
  await host.renderChild(id, cell);           // mounts the child anywidget here
}
```

This keeps each child a normal anywidget (so its own JS, CSS, and jslinks work)
while letting a parent arrange them.

### What manywidgets would ship on top (gated on this hook)

A small family of pure-layout anywidgets — `Row`, `Column`, `Grid` (and a generic
`Layout`) — each holding child widget refs and a layout spec:

```python
Row(slider, chart)                       # side-by-side, linked, coherent
Grid([[a, b], [c, d]], gap="8px")
```

Python side: `children = traitlets.List(trait=Instance(Widget)).tag(sync=True, **widget_serialization)`
plus a `layout`/`gap`/`columns` spec. JS side: render each child via
`host.renderChild`, arranged with CSS grid/flex (static-export-safe by
construction, following our existing rules). Until the hook lands, manywidgets does
page-level layout only (grouped notebook cells + MyST `grid`/`embed`).

---

### How manywidgets works around #1 today

`@manywidgets/core` exports `onChanges(model, names, fn)` which registers one
listener per trait, and every widget uses it instead of space-separated event
names. The strict fake model in `tests/js/index.ts` mirrors the static emitter
(exact-match events only), so any regression to space-separated names fails that
widget's own unit test.
