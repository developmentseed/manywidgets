"""Small, serializable theming primitives for manywidgets.

The public contract is manywidgets-owned CSS custom properties. A ``Theme``
serializes to a flat ``{"--mw-*": value}`` dict that widgets sync as ordinary
trait state. Built-in themes may derive values from other systems, but user code
should target the ``--mw-*`` layer.
"""

from __future__ import annotations

from dataclasses import dataclass, field, fields, replace
from typing import Mapping

_NON_VAR_FIELDS = {"chart_palette", "tokens"}
_MW_PREFIX = "--mw-"


def _normalize_vars(values: Mapping[str, object] | None) -> dict[str, str]:
    out: dict[str, str] = {}
    for key, value in (values or {}).items():
        name = str(key)
        if not name.startswith(_MW_PREFIX):
            raise ValueError(f"Theme token names must start with {_MW_PREFIX!r}: {name!r}")
        out[name] = str(value)
    return out


@dataclass(frozen=True)
class Theme:
    """A reusable bundle of manywidgets token values.

    Common semantic tokens are available as named fields. Broader token scales,
    component-specific escape hatches, or future tokens can be supplied through
    ``tokens`` as explicit ``--mw-*`` names.
    """

    # Semantic colors
    color_mode: str | None = None
    color_accent: str | None = None
    color_accent_hover: str | None = None
    color_accent_soft: str | None = None
    color_accent_surface: str | None = None
    color_text: str | None = None
    color_text_muted: str | None = None
    color_border: str | None = None
    color_border_strong: str | None = None
    color_background: str | None = None
    color_overlay: str | None = None
    color_panel: str | None = None
    color_panel_solid: str | None = None
    color_panel_translucent: str | None = None
    color_surface: str | None = None
    color_surface_elevated: str | None = None
    color_surface_translucent: str | None = None
    color_on_accent: str | None = None
    color_code_bg: str | None = None
    color_positive: str | None = None
    color_negative: str | None = None
    color_warning: str | None = None
    color_info: str | None = None
    color_focus: str | None = None
    accent_contrast: str | None = None
    accent_surface: str | None = None
    accent_indicator: str | None = None
    accent_track: str | None = None
    backdrop_filter_panel: str | None = None

    # Typography
    font_family: str | None = None
    font_size_1: str | None = None
    font_size_2: str | None = None
    font_size_3: str | None = None
    font_size_4: str | None = None
    font_size_5: str | None = None
    font_size_6: str | None = None
    font_size_7: str | None = None
    font_size_8: str | None = None
    font_size_9: str | None = None
    font_size_sm: str | None = None
    font_size_md: str | None = None
    font_weight_light: str | None = None
    font_weight_regular: str | None = None
    font_weight_medium: str | None = None
    font_weight_bold: str | None = None
    font_weight_strong: str | None = None
    line_height_1: str | None = None
    line_height_2: str | None = None
    line_height_3: str | None = None
    line_height_4: str | None = None
    line_height_5: str | None = None
    line_height_6: str | None = None
    line_height_7: str | None = None
    line_height_8: str | None = None
    line_height_9: str | None = None
    letter_spacing_1: str | None = None
    letter_spacing_2: str | None = None
    letter_spacing_3: str | None = None
    letter_spacing_4: str | None = None
    letter_spacing_5: str | None = None
    letter_spacing_6: str | None = None
    letter_spacing_7: str | None = None
    letter_spacing_8: str | None = None
    letter_spacing_9: str | None = None

    # Rhythm
    block_margin: str | None = None
    space_1: str | None = None
    space_2: str | None = None
    space_3: str | None = None
    space_4: str | None = None
    space_5: str | None = None
    space_6: str | None = None
    space_7: str | None = None
    space_8: str | None = None
    space_9: str | None = None

    # Shape
    scaling: str | None = None
    radius_factor: str | None = None
    radius: str | None = None
    radius_sm: str | None = None
    radius_1: str | None = None
    radius_2: str | None = None
    radius_3: str | None = None
    radius_4: str | None = None
    radius_5: str | None = None
    radius_6: str | None = None
    radius_full: str | None = None
    radius_thumb: str | None = None

    # Elevation
    shadow_1: str | None = None
    shadow_2: str | None = None
    shadow_3: str | None = None
    shadow_4: str | None = None
    shadow_5: str | None = None
    shadow_6: str | None = None
    control_shadow: str | None = None
    panel_shadow: str | None = None

    # Interaction
    cursor_button: str | None = None
    cursor_checkbox: str | None = None
    cursor_disabled: str | None = None
    cursor_link: str | None = None
    cursor_menu_item: str | None = None
    cursor_radio: str | None = None
    cursor_slider_thumb: str | None = None
    cursor_slider_thumb_active: str | None = None
    cursor_switch: str | None = None

    # Component-level aliases used by widget CSS.
    control_padding_x: str | None = None
    control_padding_y: str | None = None
    control_gap: str | None = None
    control_max_width: str | None = None
    control_radius: str | None = None
    input_padding_x: str | None = None
    input_padding_y: str | None = None
    input_radius: str | None = None
    panel_padding_x: str | None = None
    panel_padding_y: str | None = None
    panel_radius: str | None = None
    stat_value_size: str | None = None

    # Non-DOM renderers need explicit values instead of CSS variables.
    chart_palette: list[str] | None = None

    # Escape hatch for any other manywidgets-owned CSS custom property.
    tokens: Mapping[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "tokens", _normalize_vars(self.tokens))

    def to_vars(self) -> dict[str, str]:
        """Serialize set fields to a flat ``{"--mw-*": value}`` dict."""
        out: dict[str, str] = dict(self.tokens)
        for f in fields(self):
            if f.name in _NON_VAR_FIELDS:
                continue
            value = getattr(self, f.name)
            if value is not None:
                out[_MW_PREFIX + f.name.replace("_", "-")] = str(value)
        return out

    def extend(self, **overrides: object) -> "Theme":
        """Return a copy with overrides applied.

        ``tokens`` is merged instead of replaced so broad token scales and
        semantic overrides can accumulate.
        """
        if "tokens" in overrides:
            merged = {
                **self.tokens,
                **_normalize_vars(overrides.pop("tokens") or {}),  # type: ignore[arg-type]
            }
            overrides["tokens"] = merged
        return replace(self, **overrides)

    @staticmethod
    def from_vars(values: Mapping[str, object]) -> "Theme":
        """Create a theme from explicit ``--mw-*`` CSS custom properties."""
        return Theme(tokens=values)

    @staticmethod
    def merge(*themes: "Theme | None") -> "Theme":
        """Field-wise merge of themes. Later non-``None`` values win."""
        result = Theme()
        for theme in themes:
            if theme is None:
                continue
            overrides = {
                f.name: getattr(theme, f.name)
                for f in fields(theme)
                if f.name not in _NON_VAR_FIELDS and getattr(theme, f.name) is not None
            }
            overrides["tokens"] = {**result.tokens, **theme.tokens}
            if theme.chart_palette is not None:
                overrides["chart_palette"] = list(theme.chart_palette)
            result = replace(result, **overrides)
        return result
