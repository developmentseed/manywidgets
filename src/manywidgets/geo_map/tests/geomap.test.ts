import { beforeAll, describe, expect, it, vi } from "vitest";
import { fakeModel, mountEl } from "@manywidgets/test-utils";

import { colormapGradient, colormapLut, COLORMAP_NAMES } from "../src/colormaps";
import {
  activeName,
  bandValue,
  decodeBase64,
  effectiveRange,
  formatValue,
  gridPixelAt,
  gridValuesAt,
  paintGrid,
  type GridSpec,
} from "../src/grid";
import { featureCollectionBounds, geometryBounds, isVisible, layerOpacity, toFeatureCollection, type GeoJsonSpec } from "../src/layers";
import { buildControls } from "../src/controls";

// ---- maplibre mock (WebGL is unavailable in jsdom) ---------------------------

const mapCalls: { sources: Map<string, unknown>; layers: Map<string, unknown>; handlers: Map<string, Function[]> } = {
  sources: new Map(),
  layers: new Map(),
  handlers: new Map(),
};

vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({ default: ".maplibregl-map{}" }));
vi.mock("maplibre-gl", () => {
  class FakeMap {
    constructor(_opts: unknown) {
      mapCalls.sources.clear();
      mapCalls.layers.clear();
      mapCalls.handlers.clear();
    }
    on(ev: string, a: unknown, b?: unknown) {
      const fn = (typeof a === "function" ? a : b) as Function;
      const key = typeof a === "string" ? `${ev}:${a}` : ev;
      if (!mapCalls.handlers.has(key)) mapCalls.handlers.set(key, []);
      mapCalls.handlers.get(key)!.push(fn);
    }
    once(ev: string, fn: Function) {
      this.on(ev, fn);
    }
    fire(ev: string) {
      for (const fn of mapCalls.handlers.get(ev) ?? []) fn({});
    }
    addControl() {}
    addSource(id: string, s: unknown) {
      mapCalls.sources.set(id, s);
    }
    addLayer(l: { id: string }) {
      mapCalls.layers.set(l.id, l);
    }
    getSource(id: string) {
      const s = mapCalls.sources.get(id);
      return s ? { ...(s as object), updateImage: vi.fn() } : undefined;
    }
    getLayer(id: string) {
      return mapCalls.layers.get(id);
    }
    removeLayer(id: string) {
      mapCalls.layers.delete(id);
    }
    removeSource(id: string) {
      mapCalls.sources.delete(id);
    }
    setLayoutProperty() {}
    setPaintProperty() {}
    setFeatureState() {}
    setStyle() {}
    fitBounds() {}
    jumpTo() {}
    resize() {}
    remove() {}
    getCanvas() {
      return { style: {} };
    }
    getCenter() {
      return { lng: 0, lat: 0 };
    }
    getZoom() {
      return 1;
    }
  }
  class Popup {
    setLngLat() {
      return this;
    }
    setHTML() {
      return this;
    }
    addTo() {
      return this;
    }
    remove() {}
  }
  class NavigationControl {}
  class ScaleControl {}
  const MercatorCoordinate = { fromLngLat: (ll: { lng: number; lat: number }) => ({ x: ll.lng, y: -ll.lat }) };
  return { default: { Map: FakeMap, Popup, NavigationControl, ScaleControl, MercatorCoordinate } };
});

// ---- fixtures --------------------------------------------------------------

function b64(bytes: number[]): string {
  return btoa(String.fromCharCode(...bytes));
}

/** 2×2 grid, two bands. Band "a": bytes 1,128,255,0(nodata); scale 0.1, offset -0.1 → values 0, 12.7, 25.4, NaN */
function gridSpec(): GridSpec {
  return {
    id: "g",
    type: "grid",
    label: "Test grid",
    corners: [
      [10, 20],
      [12, 20],
      [12, 18],
      [10, 18],
    ],
    width: 2,
    height: 2,
    bands: {
      a: { data: b64([1, 128, 255, 0]), scale: 0.1, offset: -0.1, unit: "dB", default_range: [0, 20] },
      b: { data: b64([255, 255, 1, 1]), scale: 1, offset: -1 },
    },
    band_names: ["b", "a"],
    composites: { rgb: ["a", "b", "a"] },
    active: "a",
    colormap: "viridis",
  };
}

beforeAll(() => {
  // jsdom has no canvas; renderGridCanvas tolerates a null 2d context.
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
  HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
});

describe("colormaps", () => {
  it("builds 256-entry LUTs with the end stops exact", () => {
    const lut = colormapLut("viridis");
    expect(lut.length).toBe(768);
    expect([lut[0], lut[1], lut[2]]).toEqual([68, 1, 84]);
    expect([lut[765], lut[766], lut[767]]).toEqual([253, 231, 37]);
    expect(colormapLut("nope")).toBe(colormapLut("gray"));
    expect(COLORMAP_NAMES).toContain("terrain");
    expect(colormapGradient("gray")).toMatch(/^linear-gradient/);
  });
});

describe("grid decoding + painting", () => {
  it("decodes base64 bytes and maps them to values (0 = nodata)", () => {
    expect(Array.from(decodeBase64(b64([1, 2, 250])))).toEqual([1, 2, 250]);
    const band = gridSpec().bands.a;
    expect(bandValue(band, 1)).toBeCloseTo(0);
    expect(bandValue(band, 255)).toBeCloseTo(25.4);
    expect(Number.isNaN(bandValue(band, 0))).toBe(true);
  });

  it("resolves the active band and stretch from state → spec → band default", () => {
    const spec = gridSpec();
    expect(activeName(spec, {})).toBe("a");
    expect(activeName(spec, { active: "rgb" })).toBe("rgb");
    expect(activeName(spec, { active: "missing" })).toBe("b"); // first of band_names
    expect(effectiveRange(spec, {}, "a")).toEqual([0, 20]);
    expect(effectiveRange(spec, { range: [1, 2] }, "a")).toEqual([1, 2]);
    expect(effectiveRange(spec, {}, "b")).toEqual([0, 254]);
  });

  it("paints a single band through the LUT with transparent nodata", () => {
    const spec = gridSpec();
    const out = new Uint8ClampedArray(2 * 2 * 4);
    paintGrid(spec, { range: [0, 25.4], colormap: "gray" }, out);
    expect(Array.from(out.slice(0, 4))).toEqual([0, 0, 0, 255]); // value 0 → black
    expect(Array.from(out.slice(8, 12))).toEqual([255, 255, 255, 255]); // 25.4 → white
    expect(out[15]).toBe(0); // nodata → alpha 0
    expect(out[5]).toBeGreaterThan(100); // mid value → grey
  });

  it("paints composites per channel", () => {
    const spec = gridSpec();
    const out = new Uint8ClampedArray(2 * 2 * 4);
    paintGrid(spec, { active: "rgb" }, out);
    // pixel 0: a=0 (range 0..20 → 0), b=254 (range 0..254 → 255)
    expect(Array.from(out.slice(0, 4))).toEqual([0, 255, 0, 255]);
    expect(out[15]).toBe(0); // a is nodata at pixel 3
  });

  it("finds the pixel under a lon/lat and reads values", () => {
    const spec = gridSpec();
    const plane = (ll: [number, number]): [number, number] => [ll[0], -ll[1]];
    expect(gridPixelAt(spec, [10.5, 19.5], plane)).toEqual({ col: 0, row: 0 });
    expect(gridPixelAt(spec, [11.5, 18.5], plane)).toEqual({ col: 1, row: 1 });
    expect(gridPixelAt(spec, [13, 19], plane)).toBeNull();
    const v = gridValuesAt(spec, 1, 0);
    expect(v.a).toBeCloseTo(12.7);
    expect(v.b).toBeCloseTo(254);
    expect(formatValue(v.a, "dB")).toBe("12.7 dB");
    expect(formatValue(NaN)).toBe("no data");
  });
});

describe("geojson helpers", () => {
  const spec: GeoJsonSpec = {
    id: "f",
    type: "geojson",
    id_property: "name",
    data: {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { name: "x" }, geometry: { type: "Point", coordinates: [1, 2] } },
        { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[0, 0], [4, 0], [4, 3], [0, 0]]] } },
      ],
    },
  };
  it("assigns string ids from id_property, else index", () => {
    const fc = toFeatureCollection(spec);
    expect(fc.features.map((f) => f.id)).toEqual(["x", "1"]);
  });
  it("computes bounds", () => {
    expect(geometryBounds({ type: "Point", coordinates: [1, 2] })).toEqual([1, 2, 1, 2]);
    expect(featureCollectionBounds(toFeatureCollection(spec))).toEqual([0, 0, 4, 3]);
  });
  it("resolves visibility and opacity from state over spec", () => {
    expect(isVisible({ ...spec, visible: false }, undefined)).toBe(false);
    expect(isVisible({ ...spec, visible: false }, { visible: true })).toBe(true);
    expect(layerOpacity(spec, undefined)).toBe(1);
    expect(layerOpacity(spec, { opacity: 0.3 })).toBe(0.3);
  });
});

describe("controls panel", () => {
  it("renders one row per layer (top layer first) and reports changes", () => {
    const host = mountEl();
    const changes: [string, unknown][] = [];
    const specs = [gridSpec(), { ...gridSpec(), id: "h", label: "Top", type: "grid" as const }];
    const h = buildControls(host, specs, {}, (id, patch) => changes.push([id, patch]));
    const names = Array.from(host.querySelectorAll(".manywidgets-geomap__layer-head span")).map((e) => e.textContent);
    expect(names).toEqual(["Top", "Test grid"]);
    const sel = host.querySelector<HTMLSelectElement>(".manywidgets-geomap__layer select")!;
    expect(Array.from(sel.options).map((o) => o.value)).toEqual(["b", "a", "rgb"]); // band_names order
    sel.value = "b";
    sel.dispatchEvent(new Event("change"));
    expect(changes[0]).toEqual(["h", { active: "b", range: [0, 254] }]);
    const cb = host.querySelector<HTMLInputElement>(".manywidgets-geomap__layer-head input")!;
    cb.checked = false;
    cb.dispatchEvent(new Event("change"));
    expect(changes[1]).toEqual(["h", { visible: false }]);
    h.update(specs, { h: { active: "rgb" } });
    expect(sel.value).toBe("rgb");
    h.dispose();
    expect(host.querySelector(".manywidgets-geomap__panel")).toBeNull();
  });
});

describe("GeoMap render (maplibre mocked)", () => {
  it("mounts, injects maplibre css into the root, adds layers on style.load and syncs selection", async () => {
    const widget = (await import("../src/index")).default;
    const el = mountEl();
    const model = fakeModel({
      basemap: "positron",
      height: "300px",
      view_state: { longitude: 1, latitude: 2, zoom: 3 },
      fit_bounds: null,
      layers: [
        { id: "f", type: "geojson", data: { type: "Feature", properties: { k: 1 }, geometry: { type: "Point", coordinates: [1, 2] } } },
        gridSpec(),
        { id: "t", type: "xyz", url: "https://tile.example/{z}/{x}/{y}.png" },
      ],
      layer_state: {},
      selected: "",
      hovered: "",
      controls: true,
      zoom_to_selected: true,
    });
    const dispose = widget.render({ model, el } as never);
    const container = el.querySelector<HTMLElement>(".manywidgets-geomap")!;
    expect(container.style.height).toBe("300px");
    expect(el.getRootNode().querySelector('style[data-manywidgets-css="maplibre-gl"]') || document.head.querySelector('style[data-manywidgets-css="maplibre-gl"]')).toBeTruthy();

    const map = (container as HTMLElement & { __map: { fire(ev: string): void } }).__map;
    map.fire("style.load");
    expect(Array.from(mapCalls.sources.keys())).toEqual(["mw-f", "mw-g", "mw-t"]);
    expect(Array.from(mapCalls.layers.keys())).toEqual(["mw-f-fill", "mw-f-line", "mw-f-circle", "mw-g-raster", "mw-t-raster"]);
    map.fire("load");
    expect(container.querySelector(".manywidgets-geomap__panel")).toBeTruthy();

    // A panel change lands in layer_state and is saved (works kernel-free).
    const cb = container.querySelector<HTMLInputElement>(".manywidgets-geomap__layer-head input")!;
    cb.checked = false;
    cb.dispatchEvent(new Event("change"));
    expect((model.get("layer_state") as Record<string, unknown>).t).toEqual({ visible: false });
    expect(model.saved).toBeGreaterThan(0);

    // A feature click sets `selected`.
    const click = mapCalls.handlers.get("click:mw-f-circle")![0];
    click({ features: [{ id: "0", properties: { __mw_id: "0" } }] });
    expect(model.get("selected")).toBe("0");

    expect(() => dispose()).not.toThrow();
    expect(container.querySelector(".manywidgets-geomap__panel")).toBeNull(); // controls disposed
  });
});
