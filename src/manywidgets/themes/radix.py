"""Radix-adapted token values under the manywidgets ``--mw-*`` namespace.

Values in this module are adapted from Radix Themes and Radix Colors token
scales. Radix is MIT licensed. The public API remains manywidgets-owned:
callers should set or override ``--mw-*`` tokens, not Radix's raw CSS variable
names or selectors.
"""

from __future__ import annotations

from collections.abc import Mapping

from ._radix_tokens import (
    RADIX_ACCENT_COLORS,
    RADIX_COLOR_FAMILIES,
    RADIX_DARK_COLOR_TOKENS,
    RADIX_GRAY_COLORS,
    RADIX_LIGHT_COLOR_TOKENS,
    RADIX_MATCHING_GRAY_COLORS,
    RADIX_ROOT_COLOR_TOKENS,
)
from ._theme import Theme

RADIX_SOURCE = "Adapted from Radix Themes/Colors token values, MIT license."

RADIX_SCALING_PRESETS = {
    "90%": "0.9",
    "95%": "0.95",
    "100%": "1",
    "105%": "1.05",
    "110%": "1.1",
}

RADIX_RADIUS_PRESETS = {
    "none": {
        "--mw-radius-factor": "0",
        "--mw-radius-full": "0px",
        "--mw-radius-thumb": "0.5px",
    },
    "small": {
        "--mw-radius-factor": "0.75",
        "--mw-radius-full": "0px",
        "--mw-radius-thumb": "0.5px",
    },
    "medium": {
        "--mw-radius-factor": "1",
        "--mw-radius-full": "0px",
        "--mw-radius-thumb": "9999px",
    },
    "large": {
        "--mw-radius-factor": "1.5",
        "--mw-radius-full": "0px",
        "--mw-radius-thumb": "9999px",
    },
    "full": {
        "--mw-radius-factor": "1.5",
        "--mw-radius-full": "9999px",
        "--mw-radius-thumb": "9999px",
    },
}

_SYSTEM_FONT = (
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", '
    "system-ui, sans-serif"
)
_CODE_FONT = (
    '"Menlo", "Consolas", "Bitstream Vera Sans Mono", monospace, '
    '"Apple Color Emoji", "Segoe UI Emoji"'
)
_SERIF_FONT = '"Times New Roman", "Times", serif'

_NUMBER_SUFFIXES = tuple(str(i) for i in range(1, 13))
_ALPHA_SUFFIXES = tuple(f"a{i}" for i in range(1, 13))
_COLOR_SUFFIXES = (
    *_NUMBER_SUFFIXES,
    *_ALPHA_SUFFIXES,
    "contrast",
    "surface",
    "indicator",
    "track",
)

_COMMON_TOKENS: dict[str, str] = {
    "--mw-scaling": "1",
    "--mw-scaling-90": "0.9",
    "--mw-scaling-95": "0.95",
    "--mw-scaling-100": "1",
    "--mw-scaling-105": "1.05",
    "--mw-scaling-110": "1.1",
    "--mw-radius-1": "calc(3px * var(--mw-scaling) * var(--mw-radius-factor))",
    "--mw-radius-2": "calc(4px * var(--mw-scaling) * var(--mw-radius-factor))",
    "--mw-radius-3": "calc(6px * var(--mw-scaling) * var(--mw-radius-factor))",
    "--mw-radius-4": "calc(8px * var(--mw-scaling) * var(--mw-radius-factor))",
    "--mw-radius-5": "calc(12px * var(--mw-scaling) * var(--mw-radius-factor))",
    "--mw-radius-6": "calc(16px * var(--mw-scaling) * var(--mw-radius-factor))",
    "--mw-radius-sm": "var(--mw-radius-3)",
    "--mw-radius": "var(--mw-radius-4)",
    "--mw-radius-md": "var(--mw-radius-4)",
    "--mw-radius-lg": "var(--mw-radius-5)",
    "--mw-space-1": "calc(4px * var(--mw-scaling))",
    "--mw-space-2": "calc(8px * var(--mw-scaling))",
    "--mw-space-3": "calc(12px * var(--mw-scaling))",
    "--mw-space-4": "calc(16px * var(--mw-scaling))",
    "--mw-space-5": "calc(24px * var(--mw-scaling))",
    "--mw-space-6": "calc(32px * var(--mw-scaling))",
    "--mw-space-7": "calc(40px * var(--mw-scaling))",
    "--mw-space-8": "calc(48px * var(--mw-scaling))",
    "--mw-space-9": "calc(64px * var(--mw-scaling))",
    "--mw-block-margin": "10px 0",
}

_TYPOGRAPHY_TOKENS: dict[str, str] = {
    "--mw-font-size-1": "calc(12px * var(--mw-scaling))",
    "--mw-font-size-2": "calc(14px * var(--mw-scaling))",
    "--mw-font-size-3": "calc(16px * var(--mw-scaling))",
    "--mw-font-size-4": "calc(18px * var(--mw-scaling))",
    "--mw-font-size-5": "calc(20px * var(--mw-scaling))",
    "--mw-font-size-6": "calc(24px * var(--mw-scaling))",
    "--mw-font-size-7": "calc(28px * var(--mw-scaling))",
    "--mw-font-size-8": "calc(35px * var(--mw-scaling))",
    "--mw-font-size-9": "calc(60px * var(--mw-scaling))",
    "--mw-font-weight-light": "300",
    "--mw-font-weight-regular": "400",
    "--mw-font-weight-medium": "500",
    "--mw-font-weight-bold": "700",
    "--mw-line-height-1": "calc(16px * var(--mw-scaling))",
    "--mw-line-height-2": "calc(20px * var(--mw-scaling))",
    "--mw-line-height-3": "calc(24px * var(--mw-scaling))",
    "--mw-line-height-4": "calc(26px * var(--mw-scaling))",
    "--mw-line-height-5": "calc(28px * var(--mw-scaling))",
    "--mw-line-height-6": "calc(30px * var(--mw-scaling))",
    "--mw-line-height-7": "calc(36px * var(--mw-scaling))",
    "--mw-line-height-8": "calc(40px * var(--mw-scaling))",
    "--mw-line-height-9": "calc(60px * var(--mw-scaling))",
    "--mw-letter-spacing-1": "0.0025em",
    "--mw-letter-spacing-2": "0em",
    "--mw-letter-spacing-3": "0em",
    "--mw-letter-spacing-4": "-0.0025em",
    "--mw-letter-spacing-5": "-0.005em",
    "--mw-letter-spacing-6": "-0.00625em",
    "--mw-letter-spacing-7": "-0.0075em",
    "--mw-letter-spacing-8": "-0.01em",
    "--mw-letter-spacing-9": "-0.025em",
    "--mw-default-font-family": _SYSTEM_FONT,
    "--mw-default-font-size": "var(--mw-font-size-3)",
    "--mw-default-font-style": "normal",
    "--mw-default-font-weight": "var(--mw-font-weight-regular)",
    "--mw-default-line-height": "1.5",
    "--mw-default-letter-spacing": "0em",
    "--mw-default-leading-trim-start": "0.42em",
    "--mw-default-leading-trim-end": "0.36em",
    "--mw-heading-font-family": "var(--mw-default-font-family)",
    "--mw-heading-font-size-adjust": "1",
    "--mw-heading-font-style": "normal",
    "--mw-heading-leading-trim-start": "var(--mw-default-leading-trim-start)",
    "--mw-heading-leading-trim-end": "var(--mw-default-leading-trim-end)",
    "--mw-heading-letter-spacing": "0em",
    "--mw-heading-line-height-1": "calc(16px * var(--mw-scaling))",
    "--mw-heading-line-height-2": "calc(18px * var(--mw-scaling))",
    "--mw-heading-line-height-3": "calc(22px * var(--mw-scaling))",
    "--mw-heading-line-height-4": "calc(24px * var(--mw-scaling))",
    "--mw-heading-line-height-5": "calc(26px * var(--mw-scaling))",
    "--mw-heading-line-height-6": "calc(30px * var(--mw-scaling))",
    "--mw-heading-line-height-7": "calc(36px * var(--mw-scaling))",
    "--mw-heading-line-height-8": "calc(40px * var(--mw-scaling))",
    "--mw-heading-line-height-9": "calc(60px * var(--mw-scaling))",
    "--mw-code-font-family": _CODE_FONT,
    "--mw-code-font-size-adjust": "0.95",
    "--mw-code-font-style": "normal",
    "--mw-code-font-weight": "inherit",
    "--mw-code-letter-spacing": "-0.007em",
    "--mw-code-padding-top": "0.1em",
    "--mw-code-padding-bottom": "0.1em",
    "--mw-code-padding-left": "0.25em",
    "--mw-code-padding-right": "0.25em",
    "--mw-strong-font-family": "var(--mw-default-font-family)",
    "--mw-strong-font-size-adjust": "1",
    "--mw-strong-font-style": "inherit",
    "--mw-strong-font-weight": "var(--mw-font-weight-bold)",
    "--mw-strong-letter-spacing": "0em",
    "--mw-em-font-family": _SERIF_FONT,
    "--mw-em-font-size-adjust": "1.18",
    "--mw-em-font-style": "italic",
    "--mw-em-font-weight": "inherit",
    "--mw-em-letter-spacing": "-0.025em",
    "--mw-quote-font-family": _SERIF_FONT,
    "--mw-quote-font-size-adjust": "1.18",
    "--mw-quote-font-style": "italic",
    "--mw-quote-font-weight": "inherit",
    "--mw-quote-letter-spacing": "-0.025em",
    "--mw-tab-active-letter-spacing": "-0.01em",
    "--mw-tab-active-word-spacing": "0em",
    "--mw-tab-inactive-letter-spacing": "0em",
    "--mw-tab-inactive-word-spacing": "0em",
    "--mw-font-family": "var(--mw-default-font-family)",
    "--mw-font-size-sm": "var(--mw-font-size-1)",
    "--mw-font-size-md": "var(--mw-font-size-2)",
    "--mw-font-weight-strong": "600",
}

_CURSOR_TOKENS: dict[str, str] = {
    "--mw-cursor-button": "default",
    "--mw-cursor-checkbox": "default",
    "--mw-cursor-disabled": "not-allowed",
    "--mw-cursor-link": "pointer",
    "--mw-cursor-menu-item": "default",
    "--mw-cursor-radio": "default",
    "--mw-cursor-slider-thumb": "default",
    "--mw-cursor-slider-thumb-active": "default",
    "--mw-cursor-switch": "default",
}

_COMPONENT_TOKENS: dict[str, str] = {
    "--mw-control-padding-x": "var(--mw-space-3)",
    "--mw-control-padding-y": "calc(10px * var(--mw-scaling))",
    "--mw-control-gap": "calc(6px * var(--mw-scaling))",
    "--mw-control-max-width": "320px",
    "--mw-control-radius": "var(--mw-radius-4)",
    "--mw-control-shadow": "none",
    "--mw-input-padding-x": "var(--mw-space-2)",
    "--mw-input-padding-y": "calc(6px * var(--mw-scaling))",
    "--mw-input-radius": "var(--mw-radius-3)",
    "--mw-panel-padding-x": "calc(18px * var(--mw-scaling))",
    "--mw-panel-padding-y": "var(--mw-space-3)",
    "--mw-panel-radius": "var(--mw-radius-4)",
    "--mw-panel-shadow": "var(--mw-shadow-2)",
    "--mw-stat-min-width": "140px",
    "--mw-stat-value-size": "calc(30px * var(--mw-scaling))",
    "--mw-number-display-value-size": "calc(40px * var(--mw-scaling))",
    "--mw-toggle-track-width": "calc(40px * var(--mw-scaling))",
    "--mw-toggle-track-height": "calc(22px * var(--mw-scaling))",
    "--mw-toggle-thumb-size": "calc(18px * var(--mw-scaling))",
}

_LIGHT_SHADOWS = {
    "--mw-shadow-1": (
        "inset 0 0 0 1px var(--mw-gray-a5), "
        "inset 0 1.5px 2px 0 var(--mw-gray-a2), "
        "inset 0 1.5px 2px 0 var(--mw-black-a2)"
    ),
    "--mw-shadow-2": (
        "0 0 0 1px var(--mw-gray-a3), "
        "0 0 0 0.5px var(--mw-black-a1), "
        "0 1px 1px 0 var(--mw-gray-a2), "
        "0 2px 1px -1px var(--mw-black-a1), "
        "0 1px 3px 0 var(--mw-black-a1)"
    ),
    "--mw-shadow-3": (
        "0 0 0 1px var(--mw-gray-a3), "
        "0 2px 3px -2px var(--mw-gray-a3), "
        "0 3px 12px -4px var(--mw-black-a2), "
        "0 4px 16px -8px var(--mw-black-a2)"
    ),
    "--mw-shadow-4": (
        "0 0 0 1px var(--mw-gray-a3), "
        "0 8px 40px var(--mw-black-a1), "
        "0 12px 32px -16px var(--mw-gray-a3)"
    ),
    "--mw-shadow-5": (
        "0 0 0 1px var(--mw-gray-a3), "
        "0 12px 60px var(--mw-black-a3), "
        "0 12px 32px -16px var(--mw-gray-a5)"
    ),
    "--mw-shadow-6": (
        "0 0 0 1px var(--mw-gray-a3), "
        "0 12px 60px var(--mw-black-a3), "
        "0 16px 64px var(--mw-gray-a2), "
        "0 16px 36px -20px var(--mw-gray-a7)"
    ),
}

_DARK_SHADOWS = {
    "--mw-shadow-1": (
        "inset 0 -1px 1px 0 var(--mw-gray-a3), "
        "inset 0 0 0 1px var(--mw-gray-a3), "
        "inset 0 3px 4px 0 var(--mw-black-a5), "
        "inset 0 0 0 1px var(--mw-gray-a4)"
    ),
    "--mw-shadow-2": (
        "0 0 0 1px var(--mw-gray-a6), "
        "0 0 0 0.5px var(--mw-black-a3), "
        "0 1px 1px 0 var(--mw-black-a6), "
        "0 2px 1px -1px var(--mw-black-a6), "
        "0 1px 3px 0 var(--mw-black-a5)"
    ),
    "--mw-shadow-3": (
        "0 0 0 1px var(--mw-gray-a6), "
        "0 2px 3px -2px var(--mw-black-a3), "
        "0 3px 8px -2px var(--mw-black-a6), "
        "0 4px 12px -4px var(--mw-black-a7)"
    ),
    "--mw-shadow-4": (
        "0 0 0 1px var(--mw-gray-a6), "
        "0 8px 40px var(--mw-black-a3), "
        "0 12px 32px -16px var(--mw-black-a5)"
    ),
    "--mw-shadow-5": (
        "0 0 0 1px var(--mw-gray-a6), "
        "0 12px 60px var(--mw-black-a5), "
        "0 12px 32px -16px var(--mw-black-a7)"
    ),
    "--mw-shadow-6": (
        "0 0 0 1px var(--mw-gray-a6), "
        "0 12px 60px var(--mw-black-a4), "
        "0 16px 64px var(--mw-black-a6), "
        "0 16px 36px -20px var(--mw-black-a11)"
    ),
}

_LIGHT_SEMANTIC_TOKENS = {
    "--mw-color-mode": "light",
    "--mw-color-background": "white",
    "--mw-color-overlay": "var(--mw-black-a6)",
    "--mw-color-panel-solid": "white",
    "--mw-color-panel-translucent": "rgba(255, 255, 255, 0.7)",
    "--mw-color-panel": "var(--mw-color-panel-translucent)",
    "--mw-color-surface-translucent": "rgba(255, 255, 255, 0.85)",
    "--mw-backdrop-filter-panel": "blur(64px)",
}

_DARK_SEMANTIC_TOKENS = {
    "--mw-color-mode": "dark",
    "--mw-color-background": "var(--mw-gray-1)",
    "--mw-color-overlay": "var(--mw-black-a8)",
    "--mw-color-panel-solid": "var(--mw-gray-2)",
    "--mw-color-panel-translucent": "var(--mw-gray-a2)",
    "--mw-color-panel": "var(--mw-color-panel-translucent)",
    "--mw-color-surface-translucent": "rgba(0, 0, 0, 0.25)",
    "--mw-backdrop-filter-panel": "blur(64px)",
}

_SEMANTIC_TOKENS = {
    "--mw-color-accent": "var(--myst-color-primary, var(--mw-accent-9))",
    "--mw-color-accent-hover": "var(--myst-color-primary-hover, var(--mw-accent-10))",
    "--mw-color-accent-soft": "var(--myst-color-active-bg, var(--mw-accent-a3))",
    "--mw-color-accent-surface": "var(--myst-color-accent-surface, var(--mw-accent-surface))",
    "--mw-color-text": "var(--myst-color-text, var(--jp-content-font-color1, var(--mw-gray-12)))",
    "--mw-color-text-muted": (
        "var(--myst-color-text-secondary, var(--jp-content-font-color2, var(--mw-gray-11)))"
    ),
    "--mw-color-border": "var(--myst-color-border, var(--jp-border-color2, var(--mw-gray-6)))",
    "--mw-color-border-strong": (
        "var(--myst-color-border-strong, var(--jp-border-color1, var(--mw-gray-7)))"
    ),
    "--mw-color-surface": (
        "var(--myst-color-bg, var(--jp-layout-color1, var(--mw-color-background)))"
    ),
    "--mw-color-surface-elevated": (
        "var(--myst-color-surface, var(--jp-layout-color2, var(--mw-color-panel-solid)))"
    ),
    "--mw-color-on-accent": "var(--mw-accent-contrast)",
    "--mw-color-code-bg": (
        "var(--myst-color-bg-secondary, var(--jp-layout-color2, var(--mw-gray-3)))"
    ),
    "--mw-color-positive": "var(--myst-color-success, var(--mw-green-11))",
    "--mw-color-negative": "var(--myst-color-danger, var(--mw-red-11))",
    "--mw-color-warning": "var(--myst-color-warning, var(--mw-amber-11))",
    "--mw-color-info": "var(--myst-color-info, var(--mw-blue-11))",
    "--mw-color-focus": "var(--myst-color-focus-ring, var(--mw-focus-8))",
}

_LIGHT_CHART_PALETTE = [
    "#3e63dd",
    "#e5484d",
    "#30a46c",
    "#f76b15",
    "#8e4ec6",
    "#0090ff",
    "#ffc53d",
    "#d6409f",
    "#00a2c7",
    "#46a758",
]

_DARK_CHART_PALETTE = [
    "#9eb1ff",
    "#ff9592",
    "#3dd68c",
    "#ffa057",
    "#d19dff",
    "#70b8ff",
    "#ffd60a",
    "#ff8dcc",
    "#4ccce6",
    "#71d083",
]


def radix_theme(
    *,
    appearance: str = "light",
    accent: str = "indigo",
    gray: str = "auto",
    radius: str = "medium",
    scaling: str = "100%",
) -> Theme:
    """Return a Radix-adapted manywidgets theme.

    The returned theme is plain serialized ``--mw-*`` variables. It does not
    depend on ``@radix-ui/themes`` or React at runtime.
    """

    _validate_choice("appearance", appearance, ("light", "dark"))
    _validate_choice("accent", accent, RADIX_ACCENT_COLORS)
    _validate_choice("gray", gray, RADIX_GRAY_COLORS)
    _validate_choice("radius", radius, tuple(RADIX_RADIUS_PRESETS))
    _validate_choice("scaling", scaling, tuple(RADIX_SCALING_PRESETS))

    resolved_gray = RADIX_MATCHING_GRAY_COLORS[accent] if gray == "auto" else gray
    source = RADIX_LIGHT_COLOR_TOKENS if appearance == "light" else RADIX_DARK_COLOR_TOKENS
    tokens = {
        **_COMMON_TOKENS,
        **_TYPOGRAPHY_TOKENS,
        **_CURSOR_TOKENS,
        **_COMPONENT_TOKENS,
        **RADIX_ROOT_COLOR_TOKENS,
        **source,
        **_alias_color(source, "gray", resolved_gray),
    }
    tokens.update(_alias_color(source, "accent", resolved_gray if accent == "gray" else accent))
    tokens.update(_focus_tokens())
    tokens.update(_LIGHT_SHADOWS if appearance == "light" else _DARK_SHADOWS)
    tokens.update(_LIGHT_SEMANTIC_TOKENS if appearance == "light" else _DARK_SEMANTIC_TOKENS)
    tokens.update(_SEMANTIC_TOKENS)
    tokens.update(RADIX_RADIUS_PRESETS[radius])
    tokens["--mw-scaling"] = RADIX_SCALING_PRESETS[scaling]

    return Theme(tokens=tokens, palette=_palette(appearance))


def light_theme(
    *,
    accent: str = "indigo",
    gray: str = "auto",
    radius: str = "medium",
    scaling: str = "100%",
) -> Theme:
    """Return a light Radix-adapted manywidgets theme."""

    return radix_theme(
        appearance="light",
        accent=accent,
        gray=gray,
        radius=radius,
        scaling=scaling,
    )


def dark_theme(
    *,
    accent: str = "indigo",
    gray: str = "auto",
    radius: str = "medium",
    scaling: str = "100%",
) -> Theme:
    """Return a dark Radix-adapted manywidgets theme."""

    return radix_theme(
        appearance="dark",
        accent=accent,
        gray=gray,
        radius=radius,
        scaling=scaling,
    )


def _validate_choice(name: str, value: str, options: tuple[str, ...]) -> None:
    if value not in options:
        allowed = ", ".join(options)
        raise ValueError(f"Unknown Radix {name} {value!r}. Expected one of: {allowed}")


def _alias_color(source: Mapping[str, str], target: str, family: str) -> dict[str, str]:
    aliases: dict[str, str] = {}
    for suffix in _COLOR_SUFFIXES:
        source_key = _color_key(family, suffix)
        value = source[source_key]
        if suffix in {"indicator", "track"}:
            value = f"var(--mw-{target}-9)"
        aliases[f"--mw-{target}-{suffix}"] = value
    return aliases


def _color_key(family: str, suffix: str) -> str:
    if family == "gray":
        return f"--mw-radix-gray-{suffix}"
    return f"--mw-{family}-{suffix}"


def _focus_tokens() -> dict[str, str]:
    tokens: dict[str, str] = {}
    for suffix in (*_NUMBER_SUFFIXES, *_ALPHA_SUFFIXES):
        tokens[f"--mw-focus-{suffix}"] = f"var(--mw-accent-{suffix})"
    return tokens


def _palette(appearance: str) -> list[str]:
    return list(_LIGHT_CHART_PALETTE if appearance == "light" else _DARK_CHART_PALETTE)


light = light_theme()
dark = dark_theme()

__all__ = [
    "RADIX_ACCENT_COLORS",
    "RADIX_COLOR_FAMILIES",
    "RADIX_GRAY_COLORS",
    "RADIX_RADIUS_PRESETS",
    "RADIX_SCALING_PRESETS",
    "RADIX_SOURCE",
    "dark",
    "dark_theme",
    "light",
    "light_theme",
    "radix_theme",
]
