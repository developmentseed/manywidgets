"""The :class:`Theme` object — a reusable bundle of styling overrides.

A ``Theme`` is just a set of named values that serialize to a flat
``{"--mw-*": value}`` dict (via :meth:`Theme.to_vars`). That dict is what a widget
syncs to the front-end and applies as inline CSS custom properties, so a theme is
pure data — it works in a live kernel and in static export alike.

Every field defaults to ``None`` and is omitted from ``to_vars()``, so a partial
theme overrides only what it sets; everything else falls back to each widget's
built-in default. Compose themes with :meth:`extend` (named overrides) or
:meth:`merge` (field-wise, later wins).
"""

from __future__ import annotations

from dataclasses import dataclass, field, fields, replace

# Fields that are not plain CSS custom properties.
_NON_VAR_FIELDS = {"chart_palette", "extra"}


@dataclass(frozen=True)
class Theme:
    """A bundle of styling overrides, passed to widgets via ``theme=``.

    ::

        from manywidgets import Slider, Theme, dark

        Slider(theme=dark)
        Slider(theme=Theme(color_accent="#7c3aed"))
        Slider(theme=dark.extend(radius="14px"))
    """

    # Colors
    color_accent: str | None = None
    color_accent_hover: str | None = None
    color_text: str | None = None
    color_text_muted: str | None = None
    color_border: str | None = None
    color_border_strong: str | None = None
    color_surface: str | None = None
    color_on_accent: str | None = None
    color_code_bg: str | None = None
    color_positive: str | None = None
    color_negative: str | None = None

    # Typography
    font_family: str | None = None
    font_size_sm: str | None = None
    font_size_md: str | None = None
    font_weight_strong: str | None = None

    # Shape & rhythm
    radius: str | None = None
    radius_sm: str | None = None
    block_margin: str | None = None
    space_1: str | None = None
    space_2: str | None = None
    space_3: str | None = None
    space_4: str | None = None
    space_5: str | None = None
    space_6: str | None = None

    # Chart series colors — an ordered list, not a CSS variable (a canvas can't
    # read CSS custom properties). Flows to a Chart's ``palette`` trait instead.
    chart_palette: list[str] | None = None

    # Escape hatch for any other ``--mw-*`` token (e.g. per-widget structural
    # tokens like ``--mw-control-max-width``). Merged last, so it wins.
    extra: dict[str, str] = field(default_factory=dict)

    def to_vars(self) -> dict[str, str]:
        """Serialize set fields to a flat ``{"--mw-*": value}`` dict."""
        out: dict[str, str] = {}
        for f in fields(self):
            if f.name in _NON_VAR_FIELDS:
                continue
            value = getattr(self, f.name)
            if value is not None:
                out["--mw-" + f.name.replace("_", "-")] = str(value)
        out.update(self.extra)
        return out

    def extend(self, **overrides: object) -> Theme:
        """Return a copy with ``overrides`` applied (e.g. ``dark.extend(radius="14px")``).

        ``extra`` is merged (not replaced) so structural tokens accumulate.
        """
        if "extra" in overrides:
            merged = {**self.extra, **(overrides.pop("extra") or {})}  # type: ignore[arg-type]
            overrides["extra"] = merged
        return replace(self, **overrides)

    @staticmethod
    def merge(*themes: Theme | None) -> Theme:
        """Field-wise merge of several themes; later non-``None`` values win."""
        result = Theme()
        for theme in themes:
            if theme is None:
                continue
            overrides = {
                f.name: getattr(theme, f.name)
                for f in fields(theme)
                if f.name != "extra" and getattr(theme, f.name) is not None
            }
            overrides["extra"] = {**result.extra, **theme.extra}
            result = replace(result, **overrides)
        return result
