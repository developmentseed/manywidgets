# manywidgets upstream suggestions

Findings from using `FilterBinder` with a multi-layer lonboard map (one `PolygonLayer` + one
`ScatterplotLayer`, both driven by the same `RangeSlider`). Three concrete issues with proposed
fixes, ordered by impact.

---

## 1. `FilterBinder` doesn't accept a list of layers

### What happens

```python
binder = FilterBinder(slider, layers)   # layers = [PolygonLayer, ScatterplotLayer]
# TraitError: The 'layer' trait … expected a Widget or None, not the list […]
```

The `layer` trait is `traitlets.Instance(Widget)`, so passing a list raises immediately.

### Why it matters

Multi-layer maps are common — a typical pattern is a `PolygonLayer` for high-intensity events
(ShakeMap footprints) and a `ScatterplotLayer` for everything else. The user naturally wants one
slider to filter both. Today they must create one `FilterBinder` per layer and display every one
of them, or the bindings never activate (see issue 2).

### Suggested fix

Accept either a single layer or a list in both Python and JS.

**`widget.py`** — replace `Instance` with a `Union`:

```python
layer = traitlets.Union(
    [
        traitlets.Instance(Widget),
        traitlets.List(traitlets.Instance(Widget)),
    ],
    allow_none=True,
    help="A single lonboard layer or a list of layers to filter.",
).tag(sync=True, **widget_serialization)
```

**`src/index.ts`** — iterate over whatever was passed:

```ts
// Resolve either a single layer widget-ref or an array of them
const rawLayer = model.get("layer");
const layerRefs: unknown[] = Array.isArray(rawLayer) ? rawLayer : [rawLayer];
const layers = await Promise.all(
  layerRefs.map((ref) => resolveModel(model, idOf(ref)))
);

// apply() fans out to all layers
const apply = (): void => {
  const low  = asNumber(source.get(lowField));
  const high = asNumber(source.get(highField));
  const key = `${low}:${high}:${layers.map(l => l.models.length).join(",")}`;
  if (key === lastKey) return;
  lastKey = key;
  for (const layer of layers) {
    layer.setByPath(filterField, [low, high]);
    layer.save();
  }
  status.textContent = `✅ ${label}: [${low}, ${high}]`;
};
```

With this change the workaround (multiple `FilterBinder`s) becomes unnecessary.

---

## 2. `FilterBinder` silently does nothing unless it is rendered in the DOM

### What happens

```python
binders = [FilterBinder(slider, layer) for layer in layers]
# binders exists in Python — but the slider does nothing
```

No error. The map just never responds to the slider. Moving the slider has no effect.

### Why it happens

All of `FilterBinder`'s logic lives in its `render()` JS function. In anywidget, `render()` only
runs when the widget is mounted in the browser DOM. If you create a `FilterBinder` but never
`display()` it (or place it in a `Column`), the JS never starts, the event listeners are never
registered, and the polling loop never runs.

This is a silent failure. The user gets no traceback, no warning — just a broken UI.

### Suggested fixes

**Option A — add a Python-side observer as a fallback for live kernel mode:**

```python
def __init__(self, source=None, layer=None, **kwargs):
    ...
    super().__init__(**kwargs)
    # Fallback: keep filter_range in sync via Python observe.
    # Works even if this widget is never displayed. JS takes over in static export.
    if self.source is not None:
        self.source.observe(self._sync_filter, names=[self.low_field, self.high_field])

def _sync_filter(self, change=None):
    low  = getattr(self.source, self.low_field)
    high = getattr(self.source, self.high_field)
    targets = self.layer if isinstance(self.layer, list) else [self.layer]
    for layer in targets:
        if layer is not None:
            setattr(layer, self.filter_field, (low, high))
```

This makes `FilterBinder` work in live notebooks without ever calling `display()`. The JS
binding still handles static export, so both paths are covered.

**Option B — warn loudly if not displayed within a short timeout:**

Not easily implementable in anywidget, but worth noting as a DX improvement.

**Minimum viable fix — document it clearly.** The current docs show a single example with a
`Column(slider, binder, map)` but don't explain *why* `binder` has to be in the layout.  
A note like this in the `FilterBinder` docs would prevent a lot of confusion:

> **Important:** `FilterBinder` must be rendered somewhere in the notebook output for its
> JavaScript binding to activate. Call `display(binder)` in a cell, or include it in a
> `Column`/`Row`. Creating it in Python alone is not enough.

---

## 3. `Column` doesn't flatten list arguments

### What happens

```python
binders = [FilterBinder(slider, layer) for layer in layers]
Column(slider, binders, m)
# TraitError: The 'children' trait … contains an Instance of a List
# which expected a Widget, not the list […]
```

`Column.__init__` receives `*children` positional args and wraps them in `list(children)`. If
any arg is itself a list (e.g. `binders`), that list ends up as a child element, and the
`List(Instance(Widget))` trait rejects it.

### Suggested fix

Flatten in `__init__`:

```python
def __init__(self, *children, **kwargs):
    if children:
        flat = []
        for child in children:
            if isinstance(child, (list, tuple)):
                flat.extend(child)
            else:
                flat.append(child)
        kwargs.setdefault("children", flat)
    super().__init__(**kwargs)
```

Same fix applies to `Row` and `Grid`, which have identical `__init__` signatures.

With this, `Column(slider, binders, m)` just works.

---

## Summary table

| Issue | Severity | Workaround today | Fix complexity |
|---|---|---|---|
| `FilterBinder.layer` rejects a list | High — immediate traceback | One `FilterBinder` per layer | Low — Union trait + JS loop |
| `FilterBinder` silently inactive unless displayed | High — silent wrong behavior | `display(*binders)` | Low–Medium — Python observe fallback |
| `Column` rejects list args | Medium — traceback on natural usage | Unpack: `Column(slider, *binders, m)` | Low — flatten in `__init__` |

---

# Suggestions for lonboard itself

Findings from building `MapCompare` — a swipe/split-screen widget that stacks two
lonboard `Map`s, clips one with a draggable divider, and locks the two cameras
together (before/after imagery comparison, like mapbox-gl-compare). The widget
works today by mirroring `view_state` between the two map models in JavaScript,
but it leans on lonboard internals that aren't part of the public contract.
These are suggestions for the **lonboard library**, in priority order.

## L1. Document (or make controlled) the `view_state` → camera contract

`MapCompare` keeps both maps aligned by writing one map's `view_state` onto the
other and relying on the camera to follow. That works, but lonboard renders the
map from `initialViewState` (not a controlled `viewState` prop), and the only
documented ways to move the camera are `set_view_state()` and `fly_to()`. Whether
assigning the `view_state` trait repositions an already-mounted map is undocumented
and depends on deck.gl's `initialViewState`-change behavior, which can shift
between deck.gl versions.

**Ask:** either expose a controlled `viewState` prop, or explicitly document and
guarantee that updating the `view_state` trait moves the camera. Without this,
any view-linking / compare consumer is building on undocumented behavior.

## L2. Native two-way view linking, with an idempotent setter

Every "synchronized maps" use case (DualMap, swipe-compare, locked insets) needs
the same thing: keep map B's camera equal to map A's and vice-versa, without an
infinite echo. We had to reverse-engineer that lonboard's frontend writes
`view_state` back on `onViewStateChange` and debounces `save_changes`, then add
our own re-entrancy + epsilon guards to stop the A→B→A loop.

**Ask:** a first-class `Map.link_view(other)` (or a `lonboard.link_views([m1, m2])`
helper) that syncs cameras with a built-in echo guard. Critically, make the
`view_state` setter **idempotent** — assigning a value equal to the current one
should not re-emit `change:view_state`. An idempotent setter makes *any* external
sync loop self-stabilizing and removes the need for consumer-side guards.

## L3. Configurable `view_state` writeback throttle

The frontend debounces `save_changes()` for `view_state` at a hard-coded 300 ms.
For linked/compare maps that 300 ms is the floor on how stale the Python-side
view is, and consumers can't tune it. (JS-to-JS mirroring sidesteps this, which is
what `MapCompare` does — but anything observing `view_state` from Python inherits
the lag.)

**Ask:** expose the throttle interval (and ideally an option to emit synchronously
or at a higher rate) so latency-sensitive consumers can opt in.

## L4. Native screen-space swipe / compare in a single Map

`MapCompare` stacks **two** `Map` widgets = two WebGL contexts + two MapLibre
instances + JS camera mirroring, and reveals one via CSS `clip-path`. That's the
only path available today, but it's heavy and the clip is DOM-level rather than
render-level.

**Ask:** a single-`Map` primitive for this — either (a) a `SwipeExtension` /
`ClipExtension` that clips a raster layer to one side of a movable screen-space
line, or (b) support for multiple deck.gl `View`s in one `Map` (lonboard currently
exposes a singular `view`). Either removes the need for two contexts entirely and
would make a clean, efficient `compare` view possible natively.

## L5. A public view-change callback

`MapCompare` and `MapFlyer` both need to observe/drive the camera, and today the
only public camera hooks are `on_click` and `fly_to`. There is no
`on_view_state_change`-style callback, so interop widgets either poll the trait or
scrape the minified frontend's `onViewStateChange` path.

**Ask:** a public `Map.on_view_state_change(callback)` so interop widgets can react
to pan/zoom through a supported API.

## Summary table

| Suggestion | Severity | Workaround today | Fix complexity |
|---|---|---|---|
| L1 `view_state`→camera contract undocumented/uncontrolled | High — building on undocumented behavior | Rely on observed `set_view_state` behavior | Low (doc) / Medium (controlled prop) |
| L2 No native two-way view link + non-idempotent setter | High — every consumer re-implements echo guards | JS re-entrancy + epsilon guard (in `MapCompare`) | Medium |
| L3 Hard-coded 300 ms writeback throttle | Medium — caps Python-side view freshness | Mirror in JS, not via Python | Low |
| L4 No native single-Map swipe / multi-view | Medium — two WebGL contexts + CSS clip | Stack two `Map`s (what `MapCompare` does) | High |
| L5 No public view-change callback | Medium — poll or scrape frontend internals | Poll `view_state` | Low–Medium |
