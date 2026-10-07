// Layer specs are plain JSON built by the Python helpers (see widget.py).
// Everything here is independent of maplibre so it can be unit-tested.

import type { GridSpec, GridState } from "./grid";

export interface GeoJsonStyle {
  fill?: string;
  line?: string;
  fill_opacity?: number;
  line_width?: number;
  selected_fill?: string;
  selected_line?: string;
  hover_fill?: string;
  /** circle radius for point features */
  radius?: number;
}

export interface GeoJsonSpec {
  id: string;
  type: "geojson";
  label?: string;
  data: GeoJSON.FeatureCollection | GeoJSON.Feature | GeoJSON.Geometry;
  /** feature property used as the feature id (for selected/hovered) */
  id_property?: string;
  style?: GeoJsonStyle;
  /** property names shown in the hover tooltip */
  tooltip?: string[];
  visible?: boolean;
}

export interface XyzSpec {
  id: string;
  type: "xyz";
  label?: string;
  url: string;
  attribution?: string;
  tile_size?: number;
  min_zoom?: number;
  max_zoom?: number;
  opacity?: number;
  visible?: boolean;
}

export type LayerSpec = GeoJsonSpec | XyzSpec | GridSpec;

export interface LayerState extends GridState {
  visible?: boolean;
  opacity?: number;
}

export type LayerStates = Record<string, LayerState>;

export const DEFAULT_STYLE: Required<GeoJsonStyle> = {
  fill: "#3e63dd",
  line: "#3e63dd",
  fill_opacity: 0.15,
  line_width: 1.5,
  selected_fill: "#f76b15",
  selected_line: "#f76b15",
  hover_fill: "#3e63dd",
  radius: 5,
};

export function isVisible(spec: LayerSpec, state: LayerState | undefined): boolean {
  return state?.visible ?? spec.visible ?? true;
}

export function layerOpacity(spec: LayerSpec, state: LayerState | undefined): number {
  const o = state?.opacity ?? ("opacity" in spec ? spec.opacity : undefined);
  return o === undefined ? 1 : Math.max(0, Math.min(1, o));
}

/** Normalise any GeoJSON input to a FeatureCollection whose features carry an `id`. */
export function toFeatureCollection(spec: GeoJsonSpec): GeoJSON.FeatureCollection {
  const d = spec.data as { type?: string };
  let features: GeoJSON.Feature[];
  if (d.type === "FeatureCollection") features = (spec.data as GeoJSON.FeatureCollection).features;
  else if (d.type === "Feature") features = [spec.data as GeoJSON.Feature];
  else features = [{ type: "Feature", geometry: spec.data as GeoJSON.Geometry, properties: {} }];
  return {
    type: "FeatureCollection",
    features: features.map((f, i) => ({
      ...f,
      properties: { ...(f.properties ?? {}) },
      id: featureId(f, spec.id_property, i),
    })),
  };
}

export function featureId(f: GeoJSON.Feature, idProperty: string | undefined, index: number): string {
  if (idProperty && f.properties && f.properties[idProperty] !== undefined) return String(f.properties[idProperty]);
  if (f.id !== undefined && f.id !== null) return String(f.id);
  return String(index);
}

/** [w, s, e, n] of a geometry, or null for an empty one. */
export function geometryBounds(g: GeoJSON.Geometry | null | undefined): [number, number, number, number] | null {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  const visit = (c: unknown): void => {
    if (!Array.isArray(c)) return;
    if (typeof c[0] === "number") {
      const [x, y] = c as number[];
      if (x < w) w = x;
      if (x > e) e = x;
      if (y < s) s = y;
      if (y > n) n = y;
    } else c.forEach(visit);
  };
  if (!g) return null;
  if (g.type === "GeometryCollection") g.geometries.forEach((gg) => visit((gg as { coordinates?: unknown }).coordinates));
  else visit((g as { coordinates?: unknown }).coordinates);
  return Number.isFinite(w) ? [w, s, e, n] : null;
}

export function featureCollectionBounds(fc: GeoJSON.FeatureCollection): [number, number, number, number] | null {
  let out: [number, number, number, number] | null = null;
  for (const f of fc.features) {
    const b = geometryBounds(f.geometry);
    if (!b) continue;
    out = out ? [Math.min(out[0], b[0]), Math.min(out[1], b[1]), Math.max(out[2], b[2]), Math.max(out[3], b[3])] : b;
  }
  return out;
}

export function cornersBounds(corners: [number, number][]): [number, number, number, number] {
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
