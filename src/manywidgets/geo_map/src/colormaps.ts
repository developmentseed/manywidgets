// Colormaps as a handful of RGB stops, linearly interpolated into a 256-entry
// lookup table. The stops are sampled from matplotlib's definitions (every ~10%)
// — close enough for display, and a fraction of the size of the full tables.

export type Rgb = [number, number, number];

const STOPS: Record<string, Rgb[]> = {
  gray: [
    [0, 0, 0],
    [255, 255, 255],
  ],
  viridis: [
    [68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142], [38, 130, 142],
    [31, 158, 137], [53, 183, 121], [109, 205, 89], [180, 222, 44], [253, 231, 37],
  ],
  magma: [
    [0, 0, 4], [28, 16, 68], [79, 18, 123], [129, 37, 129], [181, 54, 122],
    [229, 80, 100], [251, 135, 97], [254, 194, 135], [252, 253, 191],
  ],
  inferno: [
    [0, 0, 4], [31, 12, 72], [85, 15, 109], [136, 34, 106], [186, 54, 85],
    [227, 89, 51], [249, 140, 10], [249, 201, 50], [252, 255, 164],
  ],
  cividis: [
    [0, 32, 77], [0, 50, 110], [60, 77, 110], [97, 101, 112], [130, 127, 115],
    [164, 154, 112], [200, 182, 100], [238, 212, 80], [255, 234, 70],
  ],
  terrain: [
    [51, 51, 153], [0, 153, 153], [0, 204, 102], [255, 255, 128],
    [179, 128, 102], [255, 255, 255],
  ],
};

export const COLORMAP_NAMES = Object.keys(STOPS);

const lutCache = new Map<string, Uint8ClampedArray>();

/** 256×3 RGB lookup table for `name` (falls back to gray for unknown names). */
export function colormapLut(name: string): Uint8ClampedArray {
  const key = STOPS[name] ? name : "gray";
  const cached = lutCache.get(key);
  if (cached) return cached;
  const stops = STOPS[key];
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (stops.length - 1);
    const k = Math.min(Math.floor(t), stops.length - 2);
    const f = t - k;
    const a = stops[k];
    const b = stops[k + 1];
    lut[i * 3] = a[0] + (b[0] - a[0]) * f;
    lut[i * 3 + 1] = a[1] + (b[1] - a[1]) * f;
    lut[i * 3 + 2] = a[2] + (b[2] - a[2]) * f;
  }
  lutCache.set(key, lut);
  return lut;
}

/** CSS linear-gradient string for a colorbar swatch. */
export function colormapGradient(name: string): string {
  const stops = STOPS[STOPS[name] ? name : "gray"];
  const parts = stops.map((c, i) => `rgb(${c[0]},${c[1]},${c[2]}) ${(100 * i) / (stops.length - 1)}%`);
  return `linear-gradient(to right, ${parts.join(", ")})`;
}
