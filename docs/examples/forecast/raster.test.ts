import { describe, expect, it, vi } from "vitest";
import type { Texture } from "@luma.gl/core";
import { SPREAD_COLORS, TEMPERATURE_COLORS } from "./data";
import { colormapPixels, encodeMissingValues, NO_DATA, selectTileSlice } from "./raster";

const rgb = (hex: string) => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));

describe("forecast raster data", () => {
  it("preserves valid zero values while encoding missing samples for the library filter", () => {
    const values = new Float32Array([0, -10, 40, NaN, Infinity, -Infinity]);
    expect(Array.from(encodeMissingValues(values))).toEqual([0, -10, 40, NO_DATA, NO_DATA, NO_DATA]);
  });

  it("samples both legend ramps with opaque endpoints and interpolated colors", () => {
    const pixels = colormapPixels();
    expect(pixels).toHaveLength(256 * 2 * 4);
    for (const [row, colors] of [TEMPERATURE_COLORS, SPREAD_COLORS].entries()) {
      const first = row * 256 * 4;
      const last = first + 255 * 4;
      expect(Array.from(pixels.slice(first, first + 4))).toEqual([...rgb(colors[0]), 255]);
      expect(Array.from(pixels.slice(last, last + 4))).toEqual([...rgb(colors.at(-1)!), 255]);
      const middle = first + 128 * 4;
      rgb(colors[2]).forEach((channel, index) => {
        expect(Math.abs(pixels[middle + index] - channel)).toBeLessThanOrEqual(1);
      });
      for (let x = 0; x < 256; x++) expect(pixels[first + x * 4 + 3]).toBe(255);
    }
  });

  it("uploads only the selected mean or spread slice and skips unchanged selections", () => {
    const writeData = vi.fn();
    const tile = {
      texture: { writeData } as unknown as Texture,
      values: new Float32Array([10, 20, 30, 40, 1, 2, 3, 4]),
      uploadedSlice: 0, width: 2, height: 1, byteLength: 40,
    };
    selectTileSlice(tile, 0);
    expect(writeData).not.toHaveBeenCalled();
    selectTileSlice(tile, 3);
    expect(Array.from(writeData.mock.calls[0][0])).toEqual([3, 4]);
    selectTileSlice(tile, 3);
    expect(writeData).toHaveBeenCalledTimes(1);
    selectTileSlice(tile, 1);
    expect(Array.from(writeData.mock.calls[1][0])).toEqual([30, 40]);
    expect(tile.values).toHaveLength(8);
  });
});
