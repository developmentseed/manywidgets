import {
  defineThemeReader,
  resolveThemeColor,
  resolveThemeFontFamily,
  resolveThemeFontSize,
  resolveThemeFontWeight,
  resolveThemePalette,
} from "@manywidgets/core";

const DEFAULT_PALETTE = [
  "#3e63dd", "#e5484d", "#30a46c", "#f76b15",
  "#8e4ec6", "#0090ff", "#ffc53d", "#d6409f",
];

export interface ChartTheme {
  palette: string[];
  textColor: string;
  mutedColor: string;
  gridColor: string;
  fontFamily: string;
  fontSize: number;
  fontSizeSmall: number;
  fontWeightStrong: string;
}

export const readChartTheme = defineThemeReader<ChartTheme>({
  palette: (el) => resolveThemePalette(el, { fallback: DEFAULT_PALETTE }),
  textColor: (el) => resolveThemeColor(el, "--mw-color-text", "#24292e"),
  mutedColor: (el) => resolveThemeColor(el, "--mw-color-text-muted", "#586069"),
  gridColor: (el) => resolveThemeColor(el, "--mw-color-border", "#e1e4e8"),
  fontFamily: (el) => resolveThemeFontFamily(el, "--mw-font-family", "sans-serif"),
  fontSize: (el) => resolveThemeFontSize(el, "--mw-font-size-md", 14),
  fontSizeSmall: (el) => resolveThemeFontSize(el, "--mw-font-size-sm", 12),
  fontWeightStrong: (el) => resolveThemeFontWeight(el, "--mw-font-weight-strong", "600"),
});
