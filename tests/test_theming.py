"""Theming plumbing without wiring existing widget CSS yet."""

import pytest

from manywidgets import Button, Column, Slider, Theme
from manywidgets.themes import RADIX_COLOR_FAMILIES, dark, light, radix_theme


def test_theme_named_fields_to_mw_vars():
    vars_ = Theme(color_accent="#7c3aed", radius_4="8px").to_vars()
    assert vars_["--mw-color-accent"] == "#7c3aed"
    assert vars_["--mw-radius-4"] == "8px"


def test_theme_accepts_explicit_mw_tokens():
    vars_ = Theme.from_vars({"--mw-shadow-3": "0 3px 12px #0002"}).to_vars()
    assert vars_ == {"--mw-shadow-3": "0 3px 12px #0002"}


def test_theme_rejects_non_mw_tokens():
    with pytest.raises(ValueError):
        Theme.from_vars({"--radix-shadow-3": "0 3px 12px #0002"})


def test_extend_overrides_and_merges_tokens():
    base = Theme(color_accent="#000", tokens={"--mw-radius-4": "8px"})
    out = base.extend(color_accent="#fff", tokens={"--mw-shadow-2": "none"})

    assert out.color_accent == "#fff"
    assert out.tokens == {"--mw-radius-4": "8px", "--mw-shadow-2": "none"}
    assert base.color_accent == "#000"


def test_merge_later_non_none_wins():
    out = Theme.merge(light, Theme(color_accent="#abc"))
    assert out.to_vars()["--mw-color-accent"] == "#abc"
    assert out.to_vars()["--mw-gray-12"] == light.to_vars()["--mw-gray-12"]


def test_radix_adapted_tokens_include_scales_and_semantics():
    vars_ = light.to_vars()

    assert vars_["--mw-accent-9"] == "#3e63dd"
    assert vars_["--mw-accent-a9"] == "#0031d2c1"
    assert vars_["--mw-accent-surface"] == "#f5f8ffcc"
    assert vars_["--mw-accent-indicator"] == "var(--mw-accent-9)"
    assert vars_["--mw-radius-4"] == (
        "calc(8px * var(--mw-scaling) * var(--mw-radius-factor))"
    )
    assert "0 3px 12px -4px var(--mw-black-a2)" in vars_["--mw-shadow-3"]
    assert vars_["--mw-color-text"] == (
        "var(--myst-color-text, var(--jp-content-font-color1, var(--mw-gray-12)))"
    )


def test_radix_semantics_include_verified_myst_fallbacks():
    vars_ = light.to_vars()

    assert vars_["--mw-color-surface"] == (
        "var(--myst-color-bg, var(--jp-layout-color1, var(--mw-color-background)))"
    )
    assert vars_["--mw-color-surface-elevated"] == (
        "var(--myst-color-surface, var(--jp-layout-color2, var(--mw-color-panel-solid)))"
    )
    assert vars_["--mw-color-border"] == (
        "var(--myst-color-border, var(--jp-border-color2, var(--mw-gray-6)))"
    )
    assert vars_["--mw-color-border-strong"] == (
        "var(--myst-color-border-strong, var(--jp-border-color1, var(--mw-gray-7)))"
    )
    assert vars_["--mw-color-accent"] == "var(--myst-color-primary, var(--mw-accent-9))"
    assert vars_["--mw-color-accent-hover"] == (
        "var(--myst-color-primary-hover, var(--mw-accent-10))"
    )
    assert vars_["--mw-color-accent-soft"] == (
        "var(--myst-color-active-bg, var(--mw-accent-a3))"
    )
    assert vars_["--mw-color-code-bg"] == (
        "var(--myst-color-bg-secondary, var(--jp-layout-color2, var(--mw-gray-3)))"
    )
    assert vars_["--mw-color-positive"] == "var(--myst-color-success, var(--mw-green-11))"
    assert vars_["--mw-color-negative"] == "var(--myst-color-danger, var(--mw-red-11))"
    assert vars_["--mw-color-warning"] == "var(--myst-color-warning, var(--mw-amber-11))"
    assert vars_["--mw-color-info"] == "var(--myst-color-info, var(--mw-blue-11))"
    assert vars_["--mw-color-focus"] == "var(--myst-color-focus-ring, var(--mw-focus-8))"


def test_dark_tokens_use_dark_scales():
    vars_ = dark.to_vars()

    assert vars_["--mw-gray-1"] == "#111113"
    assert vars_["--mw-accent-12"] == "#d6e1ff"
    assert vars_["--mw-accent-a9"] == "#4671ffdb"
    assert "0 3px 8px -2px var(--mw-black-a6)" in vars_["--mw-shadow-3"]


def test_radix_tokens_include_full_color_families_and_alpha_scales():
    vars_ = light.to_vars()

    for color in RADIX_COLOR_FAMILIES:
        assert f"--mw-{color}-9" in vars_
        assert f"--mw-{color}-a9" in vars_
        assert f"--mw-{color}-surface" in vars_
        assert f"--mw-{color}-contrast" in vars_
        assert f"--mw-{color}-indicator" in vars_
        assert f"--mw-{color}-track" in vars_

    assert vars_["--mw-blue-9"] == "#0090ff"
    assert vars_["--mw-blue-surface"] == "#f1f9ffcc"
    assert vars_["--mw-violet-a12"] == "#0b0043d9"
    assert vars_["--mw-black-a12"] == "rgba(0, 0, 0, 0.95)"
    assert vars_["--mw-white-a12"] == "rgba(255, 255, 255, 0.95)"
    assert vars_["--mw-radix-gray-9"] == "#8d8d8d"


def test_radix_theme_helper_supports_accent_gray_radius_and_scaling():
    theme = radix_theme(accent="tomato", gray="mauve", radius="large", scaling="105%")
    vars_ = theme.to_vars()

    assert vars_["--mw-accent-9"] == "#e54d2e"
    assert vars_["--mw-accent-a9"] == "#df2600d1"
    assert vars_["--mw-gray-1"] == "#fdfcfd"
    assert vars_["--mw-radius-factor"] == "1.5"
    assert vars_["--mw-radius-thumb"] == "9999px"
    assert vars_["--mw-scaling"] == "1.05"


def test_radix_theme_auto_gray_matches_accent_family():
    vars_ = radix_theme(accent="green").to_vars()
    assert vars_["--mw-gray-1"] == "#fbfdfc"
    assert vars_["--mw-sage-1"] == "#fbfdfc"


def test_radix_theme_rejects_unknown_presets():
    with pytest.raises(ValueError):
        radix_theme(accent="cerulean")
    with pytest.raises(ValueError):
        radix_theme(radius="roundish")
    with pytest.raises(ValueError):
        radix_theme(scaling="120%")


def test_radix_tokens_include_typography_cursor_and_component_aliases():
    vars_ = light.to_vars()

    assert vars_["--mw-font-size-9"] == "calc(60px * var(--mw-scaling))"
    assert vars_["--mw-line-height-9"] == "calc(60px * var(--mw-scaling))"
    assert vars_["--mw-letter-spacing-9"] == "-0.025em"
    assert vars_["--mw-cursor-disabled"] == "not-allowed"
    assert vars_["--mw-control-padding-x"] == "var(--mw-space-3)"
    assert vars_["--mw-control-max-width"] == "320px"
    assert vars_["--mw-input-padding-y"] == "calc(6px * var(--mw-scaling))"
    assert vars_["--mw-stat-value-size"] == "calc(30px * var(--mw-scaling))"


def test_widget_theme_populates_theme_vars():
    s = Slider(theme=light)
    assert s.theme_vars["--mw-accent-9"] == "#3e63dd"
    assert s.trait_metadata("theme_vars", "sync") is True


def test_style_overrides_theme():
    s = Slider(theme=light, style={"--mw-color-accent": "#7c3aed"})
    assert s.theme_vars["--mw-color-accent"] == "#7c3aed"
    assert s.theme_vars["--mw-accent-9"] == "#3e63dd"


def test_style_rejects_non_mw_tokens():
    with pytest.raises(ValueError):
        Slider(style={"--radix-accent-9": "#3e63dd"})


def test_plain_widget_has_empty_theme_vars():
    assert Button().theme_vars == {}


def test_layout_can_carry_theme_for_future_cascade():
    col = Column(Slider(), theme=dark)
    assert col.theme_vars["--mw-color-text"] == (
        "var(--myst-color-text, var(--jp-content-font-color1, var(--mw-gray-12)))"
    )
