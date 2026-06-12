"""Built-in themes. Import and pass to any widget via ``theme=``.

``light`` restates the default look as explicit tokens — useful as the canonical
token reference and as a base for ``.extend()``. ``dark``, ``minimal`` and
``brand_example`` show colors, structural tokens, and typography respectively.
Author your own with :class:`~manywidgets.Theme`, or ``.extend()`` one of these.
"""

from __future__ import annotations

from ._theme import Theme

# The default system font stack, shared by themes that restyle typography.
_SYSTEM_FONT = (
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, '
    "sans-serif"
)

#: The default appearance, as explicit tokens (a no-op vs the CSS fallbacks).
light = Theme(
    color_accent="#0366d6",
    color_accent_hover="#0256c7",
    color_text="#24292e",
    color_text_muted="#586069",
    color_border="#e1e4e8",
    color_border_strong="#d0d7de",
    color_surface="#ffffff",
    color_on_accent="#ffffff",
    color_code_bg="#f6f8fa",
    color_positive="#1a7f37",
    color_negative="#cf222e",
    font_family=_SYSTEM_FONT,
)

#: A dark palette. Surfaces, text and borders inverted; brighter accent/series.
dark = Theme(
    color_accent="#2f81f7",
    color_accent_hover="#4493f8",
    color_text="#e6edf3",
    color_text_muted="#8b949e",
    color_border="#30363d",
    color_border_strong="#444c56",
    color_surface="#0d1117",
    color_on_accent="#ffffff",
    color_code_bg="#161b22",
    color_positive="#3fb950",
    color_negative="#f85149",
    chart_palette=[
        "#58a6ff", "#ff7b72", "#3fb950", "#d29922", "#bc8cff",
        "#39c5cf", "#ffa657", "#f778ba", "#a5d6ff", "#7ee787",
    ],
)

#: Flat and tight — no surfaces or borders, smaller radius and vertical rhythm.
minimal = Theme(
    color_surface="transparent",
    color_border="transparent",
    radius="4px",
    radius_sm="4px",
    block_margin="6px 0",
    space_4="8px",
    space_5="10px",
)

#: An example brand theme — a custom font and accent. Copy as a starting point.
brand_example = Theme(
    font_family='"Inter", system-ui, sans-serif',
    color_accent="#7c3aed",
    color_accent_hover="#6d28d9",
    color_on_accent="#ffffff",
    radius="12px",
    radius_sm="8px",
    chart_palette=[
        "#7c3aed", "#db2777", "#0891b2", "#ea580c", "#16a34a",
        "#ca8a04", "#2563eb", "#dc2626", "#9333ea", "#0d9488",
    ],
)
