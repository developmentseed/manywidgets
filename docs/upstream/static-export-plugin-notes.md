# Notes for `myst-anywidget-static-export`

Findings from building `manywidgets` against
[developmentseed/myst-anywidget-static-export](https://github.com/developmentseed/myst-anywidget-static-export).

> **Status — addressed in plugin v0.2.0.** §1 (space-separated event names) and §4
> (container renderer hook → `host.renderChild`) both **shipped in v0.2.0**;
> `manywidgets` pins that release. §1's line references below are against the
> original v0.1.0 tree (historical). §4 records the as-built API + deviations. §2/§3
> remain minor/informational.

## 1. Space-separated event names silently never fire ✅ FIXED in v0.2.0

> **Shipped:** v0.2.0 splits whitespace-separated event names in `on`/`off` on
> **both** sub-models and root models, and `off` now actually removes listeners
> (fixing §2 too). `manywidgets` keeps its `onChanges` helper anyway — it's
> harmless and still correct against any plugin version.


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

## 4. Container renderer hook (enables widget layout) ✅ SHIPPED in v0.2.0

> **Shipped (as-built deviations from the spec below):**
> - **Runtime-only.** No transform changes and the plugin does **not** read
>   `_myst_child_traits`. Children render because they're reachable submodels via
>   the container's `widget_serialization` `children` trait (existing
>   `buildSubModels` BFS bundles their `_esm`/`_css` inline). `manywidgets` still
>   sets `_myst_child_traits` as a forward-compatible convention.
> - **API:** `host.renderChild(ref, el): Promise<dispose>` — resolves via
>   `waitForModel` (normalizes `IPY_MODEL_`/`anywidget:`), Blob-imports the child
>   `_esm` (cached), injects child `_css` into the current shadow root, runs
>   `initialize?`/`render`, returns the child's cleanup. Reentrant (nesting works).
>   `host` is on the render args (`render({model, el, host})`).
> - **`host.getWidget` does NOT resolve children** — only `getModel`/`waitForModel`/
>   `renderChild` do. Use `renderChild` for children.
>
> The original contract below is retained for context.

This is the spec for a cross-repo contract: a plugin capability that lets one
anywidget **render other anywidgets inside its own DOM**, so a layout widget
(`Row`/`Column`/`Grid`) can arrange children — side-by-side, still linked, with no
kernel. `manywidgets` ships the layout widgets once the plugin exposes the hook.

### Why it's needed

- ipywidgets `VBox`/`HBox`/`GridBox` are **unwrapped to their first anywidget
  descendant** (Hack #1), so siblings are dropped and layout is lost —
  `HBox([a, b])` renders only `a`.
- A **custom container anywidget can't render its children either**: a child
  referenced only inside a container becomes a *state-only* `SubModel` (via
  `widget_manager.get_model`), never a renderable widget. `getWidget(ref)` only
  resolves widgets that had a wrapper module emitted (i.e. top-level outputs), so a
  container has no way to mount its children.

The design notes already flag the fix ("expose a hook for a container renderer
that mounts each anywidget child individually"). Below is a concrete contract.

### Core reframe: anywidget submodels become *renderable*

Today a referenced model is a state-only proxy. The unlock: a referenced model with
`model_module === "anywidget"` should additionally get its **`_esm` + `_css`
emitted and a render binding registered** (via `registerBinding`), so
`getWidget(id)` resolves it — not just `getModel(id)`. That single change is the
whole mechanism; it is not tied to a magic trait name.

### Opt-in, to avoid page bloat

Making *every* referenced anywidget renderable would emit a wrapper per lonboard
sub-layer, etc. So gate it: a container **declares its child-ref traits** with a
marker trait the plugin reads from widget state:

```python
_myst_child_traits = traitlets.List(["children"]).tag(sync=True)
```

The transform only emits render bindings for anywidgets reachable through the trait
names listed in `_myst_child_traits` of an emitted widget. Lean, explicit, and no
behaviour change for existing widgets (lonboard `Map`, etc.).

### Plugin changes (transform + runtime)

1. **Transform / emission** (`src/transform/widget-state.ts`, `emit.ts`,
   `rewrite.ts`): when an emitted anywidget declares `_myst_child_traits`, walk
   those traits for `IPY_MODEL_` refs; for each referenced model with
   `model_module === "anywidget"`, emit its wrapper module + assets (`_esm`,
   `_myst_css_text`/`_myst_css_key`) and `registerBinding` it. Recurse so a child
   that is itself a container also gets its grandchildren emitted. Don't emit a
   child as its own top-level output (guard against double render).
2. **Runtime API** (`src/runtime/registry.ts` / `index.ts`): add

   ```ts
   host.renderChild(ref: string, el: HTMLElement): Promise<() => void>
   ```

   It must do the *same* setup the top-level path does:
   `setupModel(childModel)` (buffer hydrate, `widget_manager` stub, link
   registration), inject the child's CSS into the current shadow root via
   `ensureShadowCss(el, child._myst_css_text, child._myst_css_key)`, then call the
   child's `render({ model, el, host })` and **return its cleanup function**. Build
   it on the existing `getWidget`/`getModel`. It is the inverse of
   `renderStaticWidget` and must be reentrant (nested containers).

### Contract surface (what manywidgets depends on)

- A container widget sets `_myst_child_traits` (synced) listing its child-ref traits.
- Referenced anywidget children are **renderable** (bindings + `_esm` + per-child
  CSS emitted), recursively.
- `host.renderChild(ref, el): Promise<dispose>` exists, runs full child setup, and
  returns a cleanup.
- Children register in the page registry (so jslinks across them keep working).

### Test fixture for the plugin repo

Add the inverse of the VBox-unwrap test: a notebook whose output is a container
anywidget (with `_myst_child_traits=["children"]`) referencing **two** anywidget
children. Assert (a) wrappers/bindings are emitted for *both* children (siblings
not dropped), (b) per-child CSS is emitted, and (c) a small DOM smoke that
`renderChild` mounts both into the container. Plus a tiny `docs/` demo proving
side-by-side render with no kernel.

### Release coordination

The plugin is pinned by release URL in `manywidgets`'s `docs/myst.yml`
(`…/releases/download/<tag>/plugin.mjs`). Cut a new tagged release after this
lands; `manywidgets` bumps the URL to pick it up.

### What manywidgets ships on top (gated on this hook)

Pure-layout anywidgets — `Row`, `Column`, `Grid` (and a generic `Layout`):

```python
Row(slider, chart)                 # side-by-side, linked, coherent
Grid([[a, b], [c, d]], columns=2, gap="8px")
```

- **Python:** subclass `BaseWidget`;
  `children = traitlets.List(trait=Instance(Widget)).tag(sync=True, **widget_serialization)`,
  `_myst_child_traits = ["children"]`, plus a `gap`/`columns`/`align` spec.
- **JS:** read child refs, make grid/flex cells, mount each child. Crucially the
  live-vs-static branch lives in **`@manywidgets/core`**, not the widget — add a
  `renderChild(model, ref, el)` mirroring `resolveModel`:
  - **static** → `host.renderChild(ref, el)`
  - **live kernel** → `await widget_manager.create_view(await get_model(ref))` then
    mount `view.el`; return `() => view.remove()`
  So the layout widget's `render` is just `for (ref of children) await renderChild(model, ref, cell)`.
- Static-export-safe by construction (vanilla DOM, `onChanges`, no
  `createRoot`). Until the hook lands, layout is page-level only (grouped notebook
  cells + MyST `grid`/`embed`).

---

### How manywidgets works around #1 today

`@manywidgets/core` exports `onChanges(model, names, fn)` which registers one
listener per trait, and every widget uses it instead of space-separated event
names. The strict fake model in `tests/js/index.ts` mirrors the static emitter
(exact-match events only), so any regression to space-separated names fails that
widget's own unit test.
