// A "grid" layer is a quantized scalar raster placed on the map by its four
// corner coordinates. Each band is a uint8 image (row-major, top row first)
// where 0 is nodata and 1..255 map linearly onto [offset+scale, offset+255*scale]
// — see `manywidgets.geo_map.GridLayer.from_arrays` for the Python side. All
// colouring (band choice, stretch, colormap, RGB composites) happens here, in
// the browser, so a reader can explore the data with no kernel.

import { colormapLut } from "./colormaps";

export interface GridBand {
  /** base64 of the uint8 pixels */
  data: string;
  scale: number;
  offset: number;
  unit?: string;
  /** default stretch [lo, hi] in data units */
  default_range?: [number, number];
}

export interface GridSpec {
  id: string;
  type: "grid";
  label?: string;
  /** [[lon, lat] × 4] in TL, TR, BR, BL order */
  corners: [number, number][];
  width: number;
  height: number;
  bands: Record<string, GridBand>;
  /** author's band order (object key order is not preserved through the pipeline) */
  band_names?: string[];
  /** name → [r, g, b] band names */
  composites?: Record<string, [string, string, string]>;
  /** initially active band or composite name */
  active?: string;
  colormap?: string;
  range?: [number, number];
  opacity?: number;
  visible?: boolean;
}

/** Per-layer, reader-adjustable state (what the control panel edits). */
export interface GridState {
  visible?: boolean;
  active?: string;
  range?: [number, number];
  colormap?: string;
  opacity?: number;
}

export function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const decodeCache = new WeakMap<GridBand, Uint8Array>();

export function bandPixels(band: GridBand): Uint8Array {
  let px = decodeCache.get(band);
  if (!px) {
    px = decodeBase64(band.data);
    decodeCache.set(band, px);
  }
  return px;
}

/** Quantized byte → data value (NaN for the nodata byte 0). */
export function bandValue(band: GridBand, q: number): number {
  return q === 0 ? NaN : q * band.scale + band.offset;
}

/** Band names in the author's order. */
export function bandNames(spec: GridSpec): string[] {
  const names = spec.band_names?.filter((n) => n in spec.bands);
  return names && names.length ? names : Object.keys(spec.bands);
}

export function isComposite(spec: GridSpec, name: string): boolean {
  return !!spec.composites && name in spec.composites;
}

/** Effective active name: the state's, else the spec's, else the first band. */
export function activeName(spec: GridSpec, state: GridState): string {
  const name = state.active ?? spec.active;
  if (name && (spec.bands[name] || isComposite(spec, name))) return name;
  return bandNames(spec)[0];
}

/** Effective stretch range for a single band (state → spec → band default → full). */
export function effectiveRange(spec: GridSpec, state: GridState, bandName: string): [number, number] {
  const band = spec.bands[bandName];
  if (state.range) return state.range;
  if (spec.range) return spec.range;
  if (band?.default_range) return band.default_range;
  return [bandValue(band, 1), bandValue(band, 255)];
}

/** Map a byte through a stretch to 0..255 (nodata stays -1). */
function stretchByte(band: GridBand, q: number, lo: number, hi: number): number {
  if (q === 0) return -1;
  const v = q * band.scale + band.offset;
  const t = hi === lo ? 0 : (v - lo) / (hi - lo);
  return Math.max(0, Math.min(255, Math.round(t * 255)));
}

/**
 * Paint the active band (or composite) into an RGBA buffer. Composites stretch
 * each channel by its own band default range (or the spec range if given);
 * single bands use the effective range + colormap.
 */
export function paintGrid(spec: GridSpec, state: GridState, out: Uint8ClampedArray): void {
  const n = spec.width * spec.height;
  const name = activeName(spec, state);
  if (isComposite(spec, name)) {
    const names = spec.composites![name];
    const chans = names.map((b) => spec.bands[b]);
    const pxs = chans.map((b) => bandPixels(b));
    const ranges = chans.map((b) => (state.range ?? spec.range ?? b.default_range) ?? [bandValue(b, 1), bandValue(b, 255)]);
    for (let i = 0; i < n; i++) {
      let nodata = false;
      for (let c = 0; c < 3; c++) {
        const s = stretchByte(chans[c], pxs[c][i], ranges[c][0], ranges[c][1]);
        if (s < 0) nodata = true;
        out[i * 4 + c] = s < 0 ? 0 : s;
      }
      out[i * 4 + 3] = nodata ? 0 : 255;
    }
    return;
  }
  const band = spec.bands[name];
  const px = bandPixels(band);
  const [lo, hi] = effectiveRange(spec, state, name);
  const lut = colormapLut(state.colormap ?? spec.colormap ?? "gray");
  for (let i = 0; i < n; i++) {
    const s = stretchByte(band, px[i], lo, hi);
    if (s < 0) {
      out[i * 4 + 3] = 0;
      continue;
    }
    out[i * 4] = lut[s * 3];
    out[i * 4 + 1] = lut[s * 3 + 1];
    out[i * 4 + 2] = lut[s * 3 + 2];
    out[i * 4 + 3] = 255;
  }
}

/** Render the grid to a canvas (created once per layer and reused). */
export function renderGridCanvas(spec: GridSpec, state: GridState, canvas: HTMLCanvasElement): void {
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = ctx.createImageData(spec.width, spec.height);
  paintGrid(spec, state, img.data);
  ctx.putImageData(img, 0, 0);
}

/**
 * Pixel readout at a map position. `toPlane` projects lon/lat to a plane where
 * the quad is (close to) a parallelogram — we use Web Mercator. The inverse is
 * the affine fit through TL, TR, BL; for a reprojected UTM window a few tens of
 * km across the quad is a parallelogram to well under a pixel.
 */
export function gridPixelAt(
  spec: GridSpec,
  lngLat: [number, number],
  toPlane: (lngLat: [number, number]) => [number, number],
): { col: number; row: number } | null {
  const [tl, tr, , bl] = spec.corners.map(toPlane);
  const p = toPlane(lngLat);
  const ux = tr[0] - tl[0], uy = tr[1] - tl[1];
  const vx = bl[0] - tl[0], vy = bl[1] - tl[1];
  const det = ux * vy - uy * vx;
  if (Math.abs(det) < 1e-18) return null;
  const dx = p[0] - tl[0], dy = p[1] - tl[1];
  const u = (dx * vy - dy * vx) / det;
  const v = (ux * dy - uy * dx) / det;
  if (u < 0 || u >= 1 || v < 0 || v >= 1) return null;
  return { col: Math.floor(u * spec.width), row: Math.floor(v * spec.height) };
}

/** Values of every band at a pixel (NaN where nodata). */
export function gridValuesAt(spec: GridSpec, col: number, row: number): Record<string, number> {
  const i = row * spec.width + col;
  const out: Record<string, number> = {};
  for (const [name, band] of Object.entries(spec.bands)) out[name] = bandValue(band, bandPixels(band)[i]);
  return out;
}

export function formatValue(v: number, unit?: string): string {
  if (!Number.isFinite(v)) return "no data";
  const s = Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);
  return unit ? `${s} ${unit}` : s;
}
