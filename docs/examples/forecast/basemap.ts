import type { StyleSpecification, SymbolLayerSpecification } from "maplibre-gl";
import { resolveThemeColor } from "@manywidgets/core";

export function readBasemapTheme(element: HTMLElement) {
  return {
    land: resolveThemeColor(element, "--mw-color-surface", "#ffffff"),
    water: resolveThemeColor(element, "--mw-color-surface-elevated", "#f6f8fa"),
    border: resolveThemeColor(element, "--mw-color-text-muted", "#586069"),
    text: resolveThemeColor(element, "--mw-color-text", "#24292e"),
  };
}

export type BasemapTheme = ReturnType<typeof readBasemapTheme>;

/** Free OpenFreeMap vector tiles, pared back to the geography needed here. */
export function createBasemap(theme: BasemapTheme): StyleSpecification {
  const labels = {
    "text-field": ["coalesce", ["get", "name:en"], ["get", "name:latin"], ["get", "name"]],
    "text-font": ["Noto Sans Regular"],
    "text-size": 10,
  } satisfies SymbolLayerSpecification["layout"];
  const labelPaint = {
    "text-color": theme.text,
    "text-halo-color": theme.land,
    "text-halo-width": 1,
  };

  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      geography: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
    },
    layers: [
      {
        id: "land",
        type: "background",
        paint: { "background-color": theme.land },
      },
      {
        id: "water",
        type: "fill",
        source: "geography",
        "source-layer": "water",
        paint: { "fill-color": theme.water },
      },
      {
        id: "borders",
        type: "line",
        source: "geography",
        "source-layer": "boundary",
        filter: ["all", ["==", ["get", "admin_level"], 2], ["!=", ["get", "maritime"], 1]],
        paint: { "line-color": theme.border, "line-width": 0.7, "line-opacity": 0.3 },
      },
      {
        id: "countries",
        type: "symbol",
        source: "geography",
        "source-layer": "place",
        filter: ["==", ["get", "class"], "country"],
        layout: { ...labels, "text-transform": "uppercase", "text-letter-spacing": 0.08 },
        paint: { ...labelPaint, "text-halo-blur": 0.5 },
      },
      {
        id: "cities",
        type: "symbol",
        source: "geography",
        "source-layer": "place",
        minzoom: 4,
        filter: ["==", ["get", "class"], "city"],
        layout: labels,
        paint: labelPaint,
      },
    ],
  };
}
