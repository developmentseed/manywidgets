"""Theming: the Theme object, the theme/style kwargs, and Chart palette flow."""

from manywidgets import Button, Chart, Column, Slider, Theme
from manywidgets.themes import dark, light


def test_to_vars_omits_unset_fields():
    vars_ = Theme(color_accent="#7c3aed").to_vars()
    assert vars_ == {"--mw-color-accent": "#7c3aed"}


def test_to_vars_field_to_token_naming():
    vars_ = Theme(font_size_sm="11px", space_3="9px", block_margin="2px 0").to_vars()
    assert vars_["--mw-font-size-sm"] == "11px"
    assert vars_["--mw-space-3"] == "9px"
    assert vars_["--mw-block-margin"] == "2px 0"


def test_extra_merged_into_vars():
    vars_ = Theme(extra={"--mw-control-max-width": "500px"}).to_vars()
    assert vars_["--mw-control-max-width"] == "500px"


def test_chart_palette_not_a_css_var():
    assert "--mw-chart-palette" not in dark.to_vars()


def test_extend_overrides_and_merges_extra():
    base = Theme(color_accent="#000", extra={"--mw-a": "1"})
    out = base.extend(color_accent="#fff", extra={"--mw-b": "2"})
    assert out.color_accent == "#fff"
    assert out.extra == {"--mw-a": "1", "--mw-b": "2"}
    assert base.color_accent == "#000"  # original unchanged (frozen)


def test_merge_later_non_none_wins():
    out = Theme.merge(light, Theme(color_accent="#abc"))
    assert out.to_vars()["--mw-color-accent"] == "#abc"
    assert out.to_vars()["--mw-color-text"] == light.color_text


def test_widget_theme_populates_theme_vars():
    s = Slider(theme=dark)
    assert s.theme_vars["--mw-color-surface"] == dark.color_surface
    assert s.trait_metadata("theme_vars", "sync") is True


def test_style_overrides_theme():
    s = Slider(theme=dark, style={"--mw-color-accent": "#7c3aed"})
    assert s.theme_vars["--mw-color-accent"] == "#7c3aed"
    assert s.theme_vars["--mw-color-surface"] == dark.color_surface


def test_plain_widget_has_empty_theme_vars():
    assert Button().theme_vars == {}


def test_layout_carries_theme_for_cascade():
    col = Column(Slider(), theme=dark)
    assert col.theme_vars["--mw-color-accent"] == dark.color_accent


def test_chart_palette_flows_from_theme():
    assert Chart(theme=dark).palette == dark.chart_palette


def test_explicit_chart_palette_wins():
    assert Chart(theme=dark, palette=["#111", "#222"]).palette == ["#111", "#222"]


def test_chart_without_theme_has_empty_palette():
    assert Chart().palette == []
