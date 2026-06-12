---
title: Styling & theming
---

# Styling & theming

Every widget is styled with CSS custom properties (the `--mw-*` tokens). Override
them with a **`Theme`** — a reusable bundle of values — or per widget with
`theme=` / `style=`. Themes are plain data, so they work in a live kernel and in a
static export alike.

For rendered, end-to-end demos of every case below, see the
[styling examples](../examples/styling-examples.ipynb).

## Theme a whole dashboard

Pass `theme=` to a layout widget; the tokens cascade to every nested widget.

```python
from manywidgets import Column, Slider, Toggle, Stat
from manywidgets.themes import dark

Column(
    Slider(label="Amplitude", value=3),
    Toggle(label="Show legend", value=True),
    Stat(label="Total", value=1280, unit="kWh"),
    theme=dark,
)
```

## Per-widget overrides

`theme=` works on any widget, and `style=` sets individual tokens. `style=` wins
over `theme=`, and a child's own setting wins over an enclosing layout's.

```python
from manywidgets import Slider
from manywidgets.themes import dark

Slider(theme=dark)
Slider(style={"--mw-color-accent": "#7c3aed"})
Slider(theme=dark, style={"--mw-color-accent": "#7c3aed"})  # dark, custom accent
```

## Built-in themes

```python
from manywidgets.themes import light, dark, minimal, brand_example
```

- `light` — the default look, as explicit tokens (handy as an `.extend()` base).
- `dark` — inverted surfaces/text with a brighter accent and series palette.
- `minimal` — flat: no surfaces or borders, tighter radius and rhythm.
- `brand_example` — a custom font + accent; copy it as a starting point.

## Custom themes

A `Theme` sets only the tokens you name; everything else keeps its default.
Compose with `.extend()` (named overrides) or `Theme.merge()` (field-wise).

```python
from manywidgets import Theme
from manywidgets.themes import dark

brand = Theme(
    color_accent="#7c3aed",
    color_accent_hover="#6d28d9",
    font_family='"Inter", system-ui, sans-serif',
)

dark.extend(radius="14px")          # dark, but rounder
Theme.merge(brand, Theme(radius="0px"))  # brand, squared off
```

Reuse a theme across notebooks by putting it in your own module — or ship it as a
package: a `Theme` is just a serializable object, so `from my_theme import brand`
then `theme=brand` works with no coupling to manywidgets.

## Tokens

| Token | Default | Controls |
|---|---|---|
| `--mw-color-accent` | `#0366d6` | Buttons, sliders, links, active controls |
| `--mw-color-accent-hover` | `#0256c7` | Accent hover state |
| `--mw-color-text` | `#24292e` | Primary text |
| `--mw-color-text-muted` | `#586069` | Labels, units, secondary text |
| `--mw-color-border` | `#e1e4e8` | Container borders |
| `--mw-color-border-strong` | `#d0d7de` | Input borders, toggle off-track |
| `--mw-color-surface` | `#ffffff` | Card / control backgrounds |
| `--mw-color-on-accent` | `#ffffff` | Text / knob on an accent fill |
| `--mw-color-code-bg` | `#f6f8fa` | Inline code background (Text) |
| `--mw-color-positive` | `#1a7f37` | Positive delta (Stat) |
| `--mw-color-negative` | `#cf222e` | Negative delta (Stat) |
| `--mw-font-family` | system stack | All typography |
| `--mw-font-size-sm` | `12px` | Captions, muted labels |
| `--mw-font-size-md` | `14px` | Control and label text |
| `--mw-font-weight-strong` | `600` | Labels |
| `--mw-radius` | `8px` | Container corners |
| `--mw-radius-sm` | `6px` | Input / button corners |
| `--mw-block-margin` | `10px 0` | Vertical space around a widget |
| `--mw-space-1` … `--mw-space-6` | `4`…`18px` | Internal padding and gaps |

The `Theme` field for a token is its name without the `--mw-` prefix and with
dashes as underscores (`--mw-color-accent` → `color_accent`). Less-common tokens
(e.g. `--mw-control-max-width`, `--mw-stat-value-size`) are set through `style=`
or a theme's `extra` dict:

```python
Theme(color_accent="#7c3aed", extra={"--mw-control-max-width": "480px"})
```

## Precedence

| Source | Wins over |
|---|---|
| `style=` on the widget | everything below |
| `theme=` on the widget | the layout's theme |
| `theme=` on a layout | the built-in defaults |
| built-in token defaults | — |

## Charts

A `<canvas>` can't read CSS variables, so a chart's **series colors** travel as a
real `palette` trait instead of a token. A theme's `chart_palette` flows into it
when you pass the theme to the chart directly:

```python
from manywidgets import Chart
from manywidgets.themes import dark

Chart(theme=dark)                      # series use dark's palette
Chart(palette=["#111", "#222"])        # explicit colors
```

A theme set on an enclosing layout colors the chart's frame but not its series —
pass `theme=` (or `palette=`) to the `Chart` itself for that.

## Static export

Themes resolve to a token dict on a synced trait and are applied with
`element.style.setProperty`, so a themed dashboard renders correctly with no
kernel. No stylesheet to load, nothing kernel-side at render time.
