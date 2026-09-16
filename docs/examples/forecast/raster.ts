import type { Device, Texture } from "@luma.gl/core";
import {
  Colormap,
  CreateTexture,
  FilterNoDataVal,
  LinearRescale,
  createColormapTexture,
} from "@developmentseed/deck.gl-raster/gpu-modules";
import { DEFAULT_CONFIG, type ForecastConfig } from "./config";
import type { Metric } from "./types";

export const NO_DATA = -9999;

export type ForecastTile = {
  texture: Texture;
  values: Float32Array;
  uploadedSlice: number;
  width: number;
  height: number;
  byteLength: number;
};

/** Samples the legend's color stops into two 256-pixel RGBA colormap rows. */
export function colormapPixels(config: ForecastConfig = DEFAULT_CONFIG) {
  const pixels = new Uint8ClampedArray(256 * 2 * 4);
  for (const [row, colors] of [config.temperature_colors, config.spread_colors].entries()) {
    const stops = colors.map(hex => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16)));
    for (let x = 0; x < 256; x++) {
      const position = x / 255 * (stops.length - 1);
      const left = Math.min(Math.floor(position), stops.length - 2);
      const fraction = position - left;
      const offset = (row * 256 + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        pixels[offset + channel] = Math.round(stops[left][channel] * (1 - fraction) + stops[left + 1][channel] * fraction);
      }
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

export function createForecastColormap(device: Device, config: ForecastConfig = DEFAULT_CONFIG) {
  return createColormapTexture(device, new ImageData(colormapPixels(config), 256, 2));
}

/** Converts missing summaries to the finite sentinel accepted by FilterNoDataVal. */
export function encodeMissingValues(values: Float32Array) {
  for (let index = 0; index < values.length; index++) {
    if (!Number.isFinite(values[index])) values[index] = NO_DATA;
  }
  return values;
}

/** Uploads the requested cached slice only when the tile's day or metric changes. */
export function selectTileSlice(tile: ForecastTile, slice: number) {
  if (tile.uploadedSlice === slice) return;
  const pixels = tile.width * tile.height;
  tile.texture.writeData(tile.values.subarray(slice * pixels, (slice + 1) * pixels));
  tile.uploadedSlice = slice;
}

/** Composes the library's texture, missing-value, rescale and colormap modules. */
export function forecastPipeline(tile: ForecastTile, colormap: Texture, metric: Metric, config: ForecastConfig = DEFAULT_CONFIG) {
  const spread = metric === "spread";
  const [rescaleMin, rescaleMax] = spread ? config.spread_range : config.temperature_range;
  return [
    { module: CreateTexture, props: { textureName: tile.texture } },
    { module: FilterNoDataVal, props: { value: NO_DATA } },
    { module: LinearRescale, props: { rescaleMin, rescaleMax } },
    { module: Colormap, props: { colormapTexture: colormap, colormapIndex: spread ? 1 : 0 } },
  ];
}
