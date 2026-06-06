# Plan: Extract `widgets/` into a standalone `manywidgets` Python package

## Context

`anywidget-experiments` accumulated ~12 widgets under `widgets/` that were built ad-hoc to
support tests, demos, and experiments (counters, linked counters, Chart.js/ChartGPU wrappers,
the Names explorer, and several one-off geospatial dashboards). They share no base class, no
common build, and no consistent linking story; resolution/linking logic is copy-pasted across
the dashboards.

The goal is a clean, **publishable Python package** named `manywidgets`: a thoughtfully
constructed, composable set of anywidget-based widgets focused on data analysis + geospatial
work in notebooks, that **work well with lonboard** but are generally useful. Each widget is
self-contained, follows the structure of the TypeScript "golden example" (`widgets/typed_counter`),
has standardized how-to-use docs, and **composes/links** with the other widgets. The package has
**no dependency on the MyST static-export plugin** — widgets behave as ordinary anywidgets in a
live kernel, but are authored to also render correctly when statically exported via that plugin.

Like the prior `myst-anywidget-static-export` split, this plan is a **self-contained handoff**:
carried into a **fresh empty `manywidgets` repo and a fresh Claude session**, executed there.
The source repo (`/Users/sanjay/seed/anywidget-experiments`) is **left untouched** as a frozen
snapshot; keep it available to copy reference logic from. Reference precedent for the split's
shape, CI, and packaging: `docs/split-anywidget-static-export-plan.md` in the source repo.

### Decisions already made (confirmed with user — do not re-litigate)
- **Package / repo name:** `manywidgets`. Distribute as a **pip-installable wheel on PyPI**.
- **v1 widget set:** Chart (Chart.js wrapper), input controls, value displays, linking
  primitives (Binder), plus lonboard-interop widgets. Details below.
- **JS strategy:** **Vanilla TypeScript + esbuild** (the `typed_counter` golden-example pattern),
  with a shared **`@manywidgets/core`** TS module for cross-widget resolution + static-export
  safety. No Lit, no React/Preact (avoids the documented shadow-DOM `createRoot` CSS pitfall).
- **Linking:** **`ipywidgets.jslink` / `jsdlink`** is the canonical, familiar API (browser-side;
  already lifted into the static host registry by the plugin's `collectJsLinks`). **PLUS** a
  small `Binder` widget — the cleaned-up successor to `widget_binder` — for the cases jslink
  can't express: scaling/transform, value mapping, and writing nested dict keys (e.g. lonboard
  `view_state.zoom`).
- **Lonboard:** **both** a documented interop pattern in the guides AND first-class lonboard
  widgets shipped under `manywidgets.lonboard`, with lonboard as an **optional extra**
  (`pip install manywidgets[lonboard]`), import-guarded so the core package never requires it.

### Source material to mine (reference logic, then rebuild cleanly — do not copy verbatim)
All in `/Users/sanjay/seed/anywidget-experiments/widgets/`:
- `typed_counter/` — the **golden example** structure to replicate (src/index.ts → dist/widget.js,
  esbuild build, `_esm`/`_css` via `pathlib`, vanilla DOM, `model.save_changes()` in try/catch).
- `chart_widget/` — Chart.js wrapper API (`add_series`/`clear_series`/`update_series`/`set_options`,
  numpy→list coercion, click/hover events). Rebuild as the v1 `Chart`.
- `widget_binder/` — transform/dotted-path binding (`multiplier`/`offset`, `setByPath`,
  `resolveModel` + `host.waitForModel`). Rebuild as the v1 `Binder`.
- `eq_dashboard/`, `nyc_dashboard/`, `hurricane_dashboard/`, `date_range_filter_binder/` — mine
  their **registry-resolution + lonboard `visible`/`filter_range` patterns** to inform the
  `manywidgets.lonboard` widgets and the shared `resolveModel` core. These dashboards themselves
  become **examples later**, not core widgets.
- Left out of v1: `chartgpu_widget` (WebGPU, heavy — note as future), `name_explorer`,
  `counter_widget`/`linked_counter` (the counters are demo-only; `Stat`/`NumberDisplay` replace
  the "value display" need).

---

## Target repo structure

```
manywidgets/
├── pyproject.toml                 # hatchling + hatch-jupyter-builder; name "manywidgets"; [lonboard] extra
├── package.json                   # root; esbuild; one build script over all widgets + core
├── tsconfig.base.json             # shared TS config (golden-example settings: strict, ES2020, DOM lib)
├── scripts/build.mjs              # build @manywidgets/core, then bundle each widget src/index.ts → dist/widget.js
├── packages/core/                 # shared @manywidgets/core TS module (not separately published)
│   └── src/index.ts               # resolveModel, safeSaveChanges, ensureShadowCss, onChange, value utils
├── src/manywidgets/               # the importable Python package (src layout)
│   ├── __init__.py                # re-exports all widgets + Binder + BaseWidget; __version__
│   ├── _base.py                   # BaseWidget(anywidget.AnyWidget): auto widget_id, _esm/_css helper
│   ├── chart/{__init__.py, widget.py, src/index.ts, dist/widget.js, style.css}
│   ├── slider/        ...          # Slider
│   ├── range_slider/  ...          # RangeSlider
│   ├── dropdown/      ...          # Dropdown
│   ├── toggle/        ...          # Toggle
│   ├── button/        ...          # Button
│   ├── number/        ...          # NumberInput
│   ├── stat/          ...          # Stat (metric card)
│   ├── number_display/...          # NumberDisplay (animated number)
│   ├── text/          ...          # Text (label/markdown readout)
│   ├── binder/        ...          # Binder (transform/path binding)
│   └── lonboard/                   # optional, import-guarded
│       ├── __init__.py
│       ├── layer_toggle.py         # LayerToggle  — toggle layer.visible
│       ├── map_flyer.py            # MapFlyer     — write view_state (uncontrolled-viewstate workaround)
│       └── filter_binder.py        # FilterBinder — (Range)Slider → layer.filter_range (DataFilterExtension)
├── docs/                          # MyST docs site (standardized per-widget pages)
│   ├── myst.yml                   # references the static-export plugin by release URL
│   ├── index.md
│   ├── widgets/<name>.md          # one standardized page per widget (template below)
│   ├── guides/{linking.md, create-your-own-widget.md, static-export.md}
│   └── examples/                  # ambitious multi-widget notebooks (later milestone)
├── tests/                         # cross-widget integration tests (test_integration.py)
│   └── js/index.ts                # shared JS test helper (strict static-like fakeModel)
│   # Per-widget tests are SELF-CONTAINED inside each widget dir:
│   #   src/manywidgets/<name>/tests/test_<name>.py  (pytest)
│   #   src/manywidgets/<name>/tests/<name>.test.ts  (vitest + jsdom)
├── README.md  LICENSE  .gitignore
└── .github/workflows/{test.yml, release.yml, deploy.yml}
```

Each widget directory mirrors `typed_counter` exactly: `widget.py` (`_esm = parent/"dist"/"widget.js"`,
`_css = parent/"style.css"`), `src/index.ts`, built `dist/widget.js`, `style.css`, `__init__.py` — **plus a
self-contained `tests/` dir** (`test_<name>.py` for pytest, `<name>.test.ts` for vitest) so a widget is a
complete, copyable unit. Cross-widget tests live at the repo-root `tests/`.

> **Progress (this build):** `Chart`, `Slider`, `Binder`, and all v1 controls/displays
> (`RangeSlider`, `Dropdown`, `Toggle`, `Button`, `NumberInput`, `Stat`, `NumberDisplay`, `Text`) are built
> with per-widget Python+JS tests, docs pages, and the three guides. Each widget now also owns its docs
> (`src/manywidgets/<name>/doc.md`), auto-assembled into `docs/widgets/<name>.ipynb` by
> `scripts/build_widget_docs.py` (API table generated from trait `help=`); generated notebooks are
> gitignored build artifacts. **Layout widgets** (`Row`/`Column`/`Grid`) are now built on the static-export
> plugin's `host.renderChild` hook (shipped in plugin **v0.2.0**, pinned in `docs/myst.yml`); children are
> mounted via `@manywidgets/core`'s `renderChild` (static: `host.renderChild`; live:
> `widget_manager.create_view`) and stay linked. **`manywidgets.lonboard`** interop is now built too:
> `LayerToggle` (`visible`), `FilterBinder` ((Range)Slider → `filter_range`), and `LayerFilter`
> (`filter_categories`) — an optional, import-guarded subpackage (`pip install "manywidgets[lonboard]"`)
> that drives a referenced lonboard layer via `core.resolveModel` (multi-proxy fan-out + poll). **MapFlyer
> was dropped** — lonboard's `Map.view_state` is uncontrolled (deck.gl `initialViewState`), so writing it
> can't re-position a rendered map; documented in `docs/guides/lonboard.md`.
>
> **Remaining / optional later:** nested-list `Grid` API; a generic `Layout` widget; richer lonboard
> examples. See `docs/upstream/static-export-plugin-notes.md` (§1 + §4 SHIPPED in v0.2.0) for the plugin
> contract history.

---

## Architecture

### `BaseWidget` (`src/manywidgets/_base.py`)
A thin `anywidget.AnyWidget` subclass every widget extends. Provides:
- `widget_id = traitlets.Unicode().tag(sync=True)`, auto-populated to a stable unique id
  (`f"{classname_lower}_{n}"`) in `__init__` if not supplied — the handle `Binder` and the shared
  registry use to find a widget across the live/static boundary.
- A small `_safe` save convention mirrored in JS (`safeSaveChanges`).
- Keeps the surface minimal — no magic; widgets remain plain anywidgets.

### Shared `@manywidgets/core` (`packages/core/src/index.ts`)
Encapsulates the static-export "hazards" once so no widget reimplements them. esbuild bundles it
into each widget's `dist/widget.js` (resolved via a `@manywidgets/core` tsconfig path alias).
Exports:
- `resolveModel(model, ref, {timeout=5000})` — unified cross-widget lookup: in a **live kernel**
  uses `model.widget_manager.get_model(id)`; in **static export** walks the plugin's host registry
  / `host.waitForModel(ref)`. Handles the known hazards (same id → multiple proxies → write to all;
  async wrapper load → re-resolve). This is the single home for the dashboard copy-paste.
- `safeSaveChanges(model)` — `try { model.save_changes() } catch {}` (no kernel in static export).
- `ensureShadowCss(el, cssText, key)` — shadow-root-safe `<style>` injection for libraries that
  inject CSS at runtime (NOT into `el`, which a destructive mount would wipe). Most widgets just
  use the `_css` trait (the plugin inlines it); this is the escape hatch.
- `onChange(model, name, fn)` + small value-coercion utils.

### Static-export safety rules (baked into every widget — from the upstream/lonboard docs)
1. Wrap every `model.save_changes()` in `safeSaveChanges` (no kernel statically).
2. Style via the `_css` trait or `ensureShadowCss`; **never** append `<link>` into `el`.
3. Vanilla TS only — no `createRoot(el)` that wipes shadow children. (Chosen.)
4. Cross-widget access only through `resolveModel` (handles multi-proxy + async).
5. Keep core widgets **buffer-free** (Chart uses JSON lists). Any widget that carries binary
   traits must document the "pre-execute with nbclient" requirement (mystmd's executor and
   `serialize()` drop buffers). v1 avoids this entirely.
6. Linking via `jslink`/`jsdlink` (already lifted into the registry) or `Binder`.

### Linking
- **Canonical:** `from ipywidgets import jslink, jsdlink` — e.g.
  `jsdlink((slider, "value"), (chart, "x_max"))`. Browser-side, kernel-free, works live and
  statically. Documented as the primary story in `docs/guides/linking.md`.
- **`Binder` widget** (for transforms jslink can't do): accepts widget **instances** for ergonomics
  and reads their `widget_id`:
  `Binder(source=slider, source_field="value", target=chart, target_field="x_max", multiplier=1000, offset=0)`.
  Traits: `source_widget_id`, `source_field`, `target_widget_id`, `target_field`, `multiplier`,
  `offset`, plus dotted-path target support (`"view_state.zoom"` → merge into parent dict). JS uses
  `resolveModel` from core; subscribes to the source field, applies `value*multiplier+offset`,
  writes via `setByPath`. Works live + static.

### v1 widget set
| Widget | Key traits / API | Notes |
|---|---|---|
| `Chart` | `chart_type`, `series_data`, `title`, `x/y_label`, `width/height`, `clicked_point`, `hover_point`; `add_series/clear_series/update_series/set_options` | Chart.js bundled via esbuild; numpy→list coercion; rebuild of `chart_widget` |
| `Slider` | `value`, `min`, `max`, `step`, `label` | drives others via jslink/Binder |
| `RangeSlider` | `low`, `high`, `min`, `max`, `step`, `label` | feeds lonboard `FilterBinder` |
| `Dropdown` | `options`, `value`, `label` | |
| `Toggle` | `value` (bool), `label` | |
| `Button` | `clicks`, `label`, `on_click` | |
| `NumberInput` | `value`, `min`, `max`, `step`, `label` | |
| `Stat` | `label`, `value`, `unit`, `delta` | metric card; bind via jslink/Binder |
| `NumberDisplay` | `value`, `format`, `duration` | animated number readout |
| `Text` | `value`, `markdown` (bool) | label/readout |
| `Binder` | see Linking | transform/path binding |
| `lonboard.LayerToggle` | `layer`, `visible` | toggles lonboard layer `visible` |
| `lonboard.MapFlyer` | `map`, `view_state` | writes `view_state` (uncontrolled-viewstate workaround) |
| `lonboard.FilterBinder` | `slider`, `layer`, `filter_field` | (Range)Slider → `filter_range` |

### Build & packaging
- **One root build** (`scripts/build.mjs` + root `package.json`), not per-widget `package.json`:
  build `@manywidgets/core` first, then esbuild-bundle each `src/manywidgets/*/src/index.ts` →
  that widget's `dist/widget.js` (`--bundle --format=esm --platform=browser --target=es2020`,
  resolving the core alias). Mirrors the golden example's esbuild invocation, iterated.
- **pyproject.toml:** `hatchling` + `hatch-jupyter-builder` build hook runs `npm ci && npm run build`
  so wheels always contain built `dist/widget.js`. `[project.optional-dependencies] lonboard = [...]`.
  Core deps: `anywidget`, `traitlets`, `ipywidgets` (jslink); `numpy` optional/runtime-soft.
  `manywidgets.lonboard` import-guards `import lonboard` with a friendly error pointing at the extra.
- `from manywidgets import Chart, Slider, RangeSlider, Dropdown, Toggle, Button, NumberInput, Stat,
  NumberDisplay, Text, Binder` (flat re-exports in `__init__.py`).

### Docs (standardized per-widget template)
Each `docs/widgets/<name>.md`: one-line description → import → minimal rendered example →
API table (traits + methods) → "Linking" (jslink + Binder snippet) → caveats (static-export /
shadow-DOM notes) → link to `create-your-own-widget.md`. Guides: `linking.md` (jslink + Binder),
`create-your-own-widget.md` (copy a widget dir, the golden-example checklist + the 6 safety rules),
`static-export.md` (how it works with the MyST plugin, referenced by URL; the nbclient/buffer caveat).
`docs/myst.yml` references the `myst-anywidget-static-export` plugin by release URL — the package
itself has **no** code dependency on it.

### CI / distribution
- `test.yml`: Python (pytest) + Node (build all widgets, `tsc --noEmit`).
- `release.yml`: on GitHub Release → build wheel (JS built by hook) → publish to PyPI. **Do not
  auto-trigger; hand the release to the user** (no `gh`/push from the agent).
- `deploy.yml`: build `docs/` (with the plugin) → gh-pages. Commit example notebooks **already
  executed** so deploy needs no kernel.

---

## Execution order (suggested)
1. Scaffold: `pyproject.toml`, root `package.json`, `tsconfig.base.json`, `scripts/build.mjs`,
   `src/manywidgets/__init__.py`, `_base.py`, `packages/core/src/index.ts`, `.gitignore`.
2. Build **`@manywidgets/core`** first (resolveModel/safeSaveChanges/ensureShadowCss); unit-light
   but it underpins everything.
3. Port **`Chart`** (from `chart_widget`) end-to-end as the first full vertical slice — proves the
   golden-example structure + build + packaging. Write its standardized doc page.
4. Add the **input controls** and **value displays** (small vanilla-TS widgets).
5. Add **`Binder`** (from `widget_binder`, using core `resolveModel`); write `linking.md`.
6. Add **`manywidgets.lonboard`** widgets (mine the dashboards for `visible`/`filter_range`/
   `view_state` patterns); import-guard lonboard.
7. Docs: standardized per-widget pages, the three guides, `myst.yml` referencing the plugin.
8. CI workflows; `README.md`; `LICENSE`.

## Verification (end-to-end)
- **Python:** `pytest` — import every widget; defaults/traits sync; `jslink((a,'value'),(b,'value'))`
  builds a Link widget; `Binder(source=a, target=b, ...)` extracts `widget_id`s; lonboard widgets
  raise a friendly error without the extra.
- **JS:** `npm run build` produces every `dist/widget.js`; `tsc --noEmit` clean.
- **Live Jupyter (whole-stack first, per project guidance):** one notebook — a `Slider` driving a
  `Chart` via `jsdlink`, a `Binder` applying a multiplier into a `Stat`, and a lonboard `LayerToggle`.
  Run this single end-to-end load before inspecting intermediates.
- **Static export (the true test):** build `docs/` with the `myst-anywidget-static-export` plugin
  (referenced by URL), open the HTML, confirm widgets render **with no kernel** and that a jslink
  and a `Binder` both work statically.
- **Wheel:** `pip install` the built wheel into a clean env; confirm `from manywidgets import Chart`
  works and `dist/widget.js` is present in the installed package.

## Out of scope / leave behind
- Source `anywidget-experiments` is **not modified** (frozen snapshot).
- v1 excludes ChartGPU (WebGPU), `name_explorer`, and the bespoke dashboards (these return later
  as `docs/examples/` compositions, not core widgets).
- No agent-driven GitHub writes / `git push` / PyPI publish — set CI up and hand the release to
  the user.
