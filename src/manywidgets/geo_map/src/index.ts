import type { RenderProps } from "@anywidget/types";
import maplibregl from "maplibre-gl";
import type { ImageSource, Map as MlMap, MapMouseEvent, StyleSpecification } from "maplibre-gl";
import maplibreCss from "maplibre-gl/dist/maplibre-gl.css";
import {
  applyThemeVars,
  detectHostColorMode,
  ensureShadowCss,
  observeHostColorMode,
  safeSaveChanges,
} from "@manywidgets/core";

import { buildControls, type ControlsHandle } from "./controls";
import { cornersBounds, geometryBounds, featureCollectionBounds, isVisible, layerOpacity, toFeatureCollection, DEFAULT_STYLE } from "./layers";
import type { GeoJsonSpec, LayerSpec, LayerStates, XyzSpec } from "./layers";
import { formatValue, gridPixelAt, gridValuesAt, renderGridCanvas, type GridSpec } from "./grid";

export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

interface GeoMapModel {
  basemap: string;
  height: string;
  view_state: ViewState;
  fit_bounds: [number, number, number, number] | null;
  layers: LayerSpec[];
  layer_state: LayerStates;
  selected: string;
  hovered: string;
  controls: boolean;
  zoom_to_selected: boolean;
}

type Bounds = [number, number, number, number];

// Keyless public basemaps. "auto" follows the host's light/dark mode.
const CARTO_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const BASEMAPS: Record<string, string | StyleSpecification> = {
  positron: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  "dark-matter": "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  voyager: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  satellite: rasterStyle(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    19,
  ),
  osm: rasterStyle("https://tile.openstreetmap.org/{z}/{x}/{y}.png", CARTO_ATTR, 19),
  none: { version: 8, sources: {}, layers: [] },
};

function rasterStyle(url: string, attribution: string, maxzoom: number): StyleSpecification {
  return {
    version: 8,
    sources: { basemap: { type: "raster", tiles: [url], tileSize: 256, attribution, maxzoom } },
    layers: [{ id: "basemap", type: "raster", source: "basemap" }],
  };
}

function resolveBasemap(name: string, el: HTMLElement): string | StyleSpecification {
  if (name === "auto") return BASEMAPS[detectHostColorMode(el) === "dark" ? "dark-matter" : "positron"];
  return BASEMAPS[name] ?? name; // a style URL / inline style name passes through
}

const SRC = (id: string) => `mw-${id}`;

function render({ model, el }: RenderProps<GeoMapModel>): () => void {
  const disposeTheme = applyThemeVars(el, model);
  ensureShadowCss(el, maplibreCss, "maplibre-gl");

  const container = document.createElement("div");
  container.className = "manywidgets-geomap";
  const mapEl = document.createElement("div");
  mapEl.className = "manywidgets-geomap__map";
  const readout = document.createElement("div");
  readout.className = "manywidgets-geomap__readout";
  readout.style.display = "none";
  container.appendChild(mapEl);
  container.appendChild(readout);
  el.appendChild(container);

  const applyHeight = (): void => {
    container.style.height = model.get("height") || "480px";
  };
  applyHeight();

  const view = model.get("view_state") || { longitude: 0, latitude: 0, zoom: 1 };
  const map: MlMap = new maplibregl.Map({
    container: mapEl,
    style: resolveBasemap(model.get("basemap") || "positron", el),
    center: [view.longitude, view.latitude],
    zoom: view.zoom,
    attributionControl: { compact: true },
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
  map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");
  (container as HTMLElement & { __map?: MlMap }).__map = map; // for browser checks / debugging

  const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, maxWidth: "320px" });
  const gridCanvases = new Map<string, HTMLCanvasElement>();
  let managed: { sources: string[]; layers: string[] } = { sources: [], layers: [] };
  let controls: ControlsHandle | null = null;
  let styleReady = false;

  const specs = (): LayerSpec[] => model.get("layers") || [];
  const states = (): LayerStates => model.get("layer_state") || {};
  const stateOf = (id: string) => states()[id];

  // ---- layer management -----------------------------------------------------

  function clearManaged(): void {
    for (const id of managed.layers) if (map.getLayer(id)) map.removeLayer(id);
    for (const id of managed.sources) if (map.getSource(id)) map.removeSource(id);
    managed = { sources: [], layers: [] };
  }

  function addGeoJson(spec: GeoJsonSpec): void {
    const fc = toFeatureCollection(spec);
    for (const f of fc.features) (f.properties as Record<string, unknown>).__mw_id = f.id;
    const s = { ...DEFAULT_STYLE, ...(spec.style ?? {}) };
    const src = SRC(spec.id);
    map.addSource(src, { type: "geojson", data: fc, promoteId: "__mw_id" });
    managed.sources.push(src);
    const vis = isVisible(spec, stateOf(spec.id)) ? "visible" : "none";
    const op = layerOpacity(spec, stateOf(spec.id));
    const selected = ["boolean", ["feature-state", "selected"], false];
    const hovered = ["boolean", ["feature-state", "hover"], false];
    const fillColor = ["case", selected, s.selected_fill, hovered, s.hover_fill, s.fill];
    const lineColor = ["case", selected, s.selected_line, s.line];
    const fillOpacity = ["case", selected, Math.min(1, s.fill_opacity + 0.25) * op, hovered, Math.min(1, s.fill_opacity + 0.15) * op, s.fill_opacity * op];
    const lineWidth = ["case", selected, s.line_width + 1.5, s.line_width];
    const fillId = `${src}-fill`, lineId = `${src}-line`, circleId = `${src}-circle`;
    map.addLayer({ id: fillId, type: "fill", source: src, filter: ["==", ["geometry-type"], "Polygon"], layout: { visibility: vis }, paint: { "fill-color": fillColor as never, "fill-opacity": fillOpacity as never } });
    map.addLayer({ id: lineId, type: "line", source: src, filter: ["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "LineString"]], layout: { visibility: vis }, paint: { "line-color": lineColor as never, "line-width": lineWidth as never, "line-opacity": op } });
    map.addLayer({ id: circleId, type: "circle", source: src, filter: ["==", ["geometry-type"], "Point"], layout: { visibility: vis }, paint: { "circle-color": fillColor as never, "circle-radius": s.radius, "circle-opacity": Math.min(1, s.fill_opacity + 0.6) * op, "circle-stroke-color": lineColor as never, "circle-stroke-width": 1 } });
    managed.layers.push(fillId, lineId, circleId);
    for (const id of [fillId, circleId]) {
      map.on("click", id, (e) => onFeatureClick(e));
      map.on("mousemove", id, (e) => onFeatureHover(e, spec));
      map.on("mouseleave", id, () => onFeatureLeave());
    }
  }

  function addXyz(spec: XyzSpec): void {
    const src = SRC(spec.id);
    map.addSource(src, { type: "raster", tiles: [spec.url], tileSize: spec.tile_size ?? 256, attribution: spec.attribution ?? "", minzoom: spec.min_zoom ?? 0, maxzoom: spec.max_zoom ?? 22 });
    map.addLayer({ id: `${src}-raster`, type: "raster", source: src, layout: { visibility: isVisible(spec, stateOf(spec.id)) ? "visible" : "none" }, paint: { "raster-opacity": layerOpacity(spec, stateOf(spec.id)), "raster-fade-duration": 0 } });
    managed.sources.push(src);
    managed.layers.push(`${src}-raster`);
  }

  function gridCanvas(spec: GridSpec): HTMLCanvasElement {
    let c = gridCanvases.get(spec.id);
    if (!c) {
      c = document.createElement("canvas");
      gridCanvases.set(spec.id, c);
    }
    return c;
  }

  function addGrid(spec: GridSpec): void {
    const src = SRC(spec.id);
    const canvas = gridCanvas(spec);
    renderGridCanvas(spec, stateOf(spec.id) ?? {}, canvas);
    map.addSource(src, { type: "image", url: canvas.toDataURL(), coordinates: spec.corners as [[number, number], [number, number], [number, number], [number, number]] });
    map.addLayer({ id: `${src}-raster`, type: "raster", source: src, layout: { visibility: isVisible(spec, stateOf(spec.id)) ? "visible" : "none" }, paint: { "raster-opacity": layerOpacity(spec, stateOf(spec.id)), "raster-fade-duration": 0, "raster-resampling": "nearest" } });
    managed.sources.push(src);
    managed.layers.push(`${src}-raster`);
  }

  function applyLayers(): void {
    if (!styleReady) return;
    clearManaged();
    // Add in list order so later specs draw on top; rasters below vectors is the
    // author's responsibility via ordering.
    for (const spec of specs()) {
      try {
        if (spec.type === "geojson") addGeoJson(spec);
        else if (spec.type === "xyz") addXyz(spec);
        else if (spec.type === "grid") addGrid(spec);
      } catch (err) {
        console.error(`[manywidgets geomap] layer "${spec.id}" failed:`, err);
      }
    }
    applySelected();
    controls?.rebuild(specs(), states());
  }

  /** Cheap update after a layer_state change: visibility/opacity, grid repaint. */
  function applyStates(): void {
    if (!styleReady) return;
    for (const spec of specs()) {
      const st = stateOf(spec.id) ?? {};
      const src = SRC(spec.id);
      const ids = managed.layers.filter((l) => l.startsWith(`${src}-`));
      const vis = isVisible(spec, st) ? "visible" : "none";
      const op = layerOpacity(spec, st);
      for (const id of ids) {
        if (!map.getLayer(id)) continue;
        map.setLayoutProperty(id, "visibility", vis);
        if (id.endsWith("-raster")) map.setPaintProperty(id, "raster-opacity", op);
      }
      if (spec.type === "grid" && map.getSource(src)) {
        const canvas = gridCanvas(spec);
        renderGridCanvas(spec, st, canvas);
        (map.getSource(src) as ImageSource).updateImage({ url: canvas.toDataURL() });
      }
    }
    controls?.update(specs(), states());
  }

  // ---- selection / hover ------------------------------------------------------

  let currentSelected = "";
  function setFeatureStateAll(id: string, state: Record<string, boolean>): void {
    if (!id) return;
    for (const spec of specs()) {
      if (spec.type !== "geojson" || !map.getSource(SRC(spec.id))) continue;
      map.setFeatureState({ source: SRC(spec.id), id }, state);
    }
  }

  function findFeature(id: string): GeoJSON.Feature | null {
    for (const spec of specs()) {
      if (spec.type !== "geojson") continue;
      const f = toFeatureCollection(spec).features.find((x) => x.id === id);
      if (f) return f;
    }
    return null;
  }

  function applySelected(): void {
    if (!styleReady) return;
    const id = model.get("selected") || "";
    if (currentSelected) setFeatureStateAll(currentSelected, { selected: false });
    currentSelected = id;
    setFeatureStateAll(id, { selected: true });
  }

  function zoomToSelected(): void {
    if (!model.get("zoom_to_selected")) return;
    const f = findFeature(model.get("selected") || "");
    const b = f ? geometryBounds(f.geometry) : null;
    if (b) fitTo(b, true);
  }

  function onFeatureClick(e: MapMouseEvent & { features?: GeoJSON.Feature[] }): void {
    const f = e.features?.[0];
    if (!f) return;
    const id = String(f.id ?? (f.properties as Record<string, unknown> | null)?.__mw_id ?? "");
    if (id === model.get("selected")) return;
    model.set("selected", id);
    safeSaveChanges(model);
  }

  let currentHover = "";
  function onFeatureHover(e: MapMouseEvent & { features?: GeoJSON.Feature[] }, spec: GeoJsonSpec): void {
    const f = e.features?.[0];
    if (!f) return;
    const id = String(f.id ?? (f.properties as Record<string, unknown> | null)?.__mw_id ?? "");
    map.getCanvas().style.cursor = "pointer";
    if (id !== currentHover) {
      if (currentHover) setFeatureStateAll(currentHover, { hover: false });
      currentHover = id;
      setFeatureStateAll(id, { hover: true });
      if (model.get("hovered") !== id) {
        model.set("hovered", id);
        safeSaveChanges(model);
      }
    }
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const keys = spec.tooltip && spec.tooltip.length ? spec.tooltip : Object.keys(props).filter((k) => k !== "__mw_id").slice(0, 6);
    if (keys.length) {
      const rows = keys.map((k) => `<div class="manywidgets-geomap__tip-row"><span>${escapeHtml(k)}</span><b>${escapeHtml(String(props[k] ?? ""))}</b></div>`);
      popup.setLngLat(e.lngLat).setHTML(`<div class="manywidgets-geomap__tip">${rows.join("")}</div>`).addTo(map);
    }
  }

  function onFeatureLeave(): void {
    map.getCanvas().style.cursor = "";
    if (currentHover) setFeatureStateAll(currentHover, { hover: false });
    currentHover = "";
    popup.remove();
    if (model.get("hovered")) {
      model.set("hovered", "");
      safeSaveChanges(model);
    }
  }

  function applyHovered(): void {
    // External hover (e.g. a linked Table row): mirror as feature-state only.
    const id = model.get("hovered") || "";
    if (id === currentHover) return;
    if (currentHover) setFeatureStateAll(currentHover, { hover: false });
    currentHover = id;
    setFeatureStateAll(id, { hover: true });
  }

  // ---- grid readout -----------------------------------------------------------

  const toPlane = (ll: [number, number]): [number, number] => {
    const m = maplibregl.MercatorCoordinate.fromLngLat({ lng: ll[0], lat: ll[1] });
    return [m.x, m.y];
  };

  map.on("mousemove", (e) => {
    const lines: string[] = [];
    for (const spec of specs()) {
      if (spec.type !== "grid" || !isVisible(spec, stateOf(spec.id))) continue;
      const px = gridPixelAt(spec, [e.lngLat.lng, e.lngLat.lat], toPlane);
      if (!px) continue;
      const vals = gridValuesAt(spec, px.col, px.row);
      const parts = Object.entries(vals).map(([k, v]) => `${k}: ${formatValue(v, spec.bands[k].unit)}`);
      lines.push(`<b>${escapeHtml(spec.label ?? spec.id)}</b> ${parts.map(escapeHtml).join(" · ")}`);
    }
    if (lines.length) {
      readout.innerHTML = lines.join("<br>");
      readout.style.display = "";
    } else readout.style.display = "none";
  });
  map.on("mouseout", () => {
    readout.style.display = "none";
  });

  // ---- view state -------------------------------------------------------------

  function fitTo(b: Bounds, animate: boolean): void {
    map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 24, animate, maxZoom: 16 });
  }

  /** `fit_bounds` when it is a real [w, s, e, n]; null/[] mean "fit the layers". */
  function fitBoundsTrait(): Bounds | null {
    const b = model.get("fit_bounds");
    return Array.isArray(b) && b.length === 4 && b.every((v) => Number.isFinite(v)) ? (b as Bounds) : null;
  }

  function applyFitBounds(): void {
    const b = fitBoundsTrait();
    if (b) fitTo(b, false);
  }

  function autoBounds(): Bounds | null {
    let out: Bounds | null = null;
    for (const spec of specs()) {
      let b: Bounds | null = null;
      if (spec.type === "geojson") b = featureCollectionBounds(toFeatureCollection(spec));
      else if (spec.type === "grid") b = cornersBounds(spec.corners);
      if (!b) continue;
      out = out ? [Math.min(out[0], b[0]), Math.min(out[1], b[1]), Math.max(out[2], b[2]), Math.max(out[3], b[3])] : b;
    }
    return out;
  }

  let syncingView = false;
  map.on("moveend", () => {
    const c = map.getCenter();
    const vs: ViewState = { longitude: round(c.lng, 5), latitude: round(c.lat, 5), zoom: round(map.getZoom(), 2) };
    syncingView = true;
    model.set("view_state", vs);
    safeSaveChanges(model);
    syncingView = false;
  });

  function applyViewState(): void {
    if (syncingView) return;
    const vs = model.get("view_state");
    if (!vs) return;
    const c = map.getCenter();
    if (Math.abs(c.lng - vs.longitude) < 1e-6 && Math.abs(c.lat - vs.latitude) < 1e-6 && Math.abs(map.getZoom() - vs.zoom) < 1e-3) return;
    map.jumpTo({ center: [vs.longitude, vs.latitude], zoom: vs.zoom });
  }

  // ---- controls ---------------------------------------------------------------

  function mountControls(): void {
    controls?.dispose();
    controls = null;
    if (!model.get("controls")) return;
    controls = buildControls(container, specs(), states(), (id, patch) => {
      const next = { ...states(), [id]: { ...(states()[id] ?? {}), ...patch } };
      model.set("layer_state", next);
      safeSaveChanges(model);
      applyStates();
    });
  }

  // ---- wiring -----------------------------------------------------------------

  map.on("style.load", () => {
    styleReady = true;
    applyLayers();
  });
  map.once("load", () => {
    mountControls();
    const b = fitBoundsTrait() ?? autoBounds();
    if (b) fitTo(b, false);
  });

  model.on("change:layers", () => {
    applyLayers();
    const b = fitBoundsTrait() ?? autoBounds();
    if (b) fitTo(b, true);
  });
  model.on("change:layer_state", applyStates);
  model.on("change:selected", () => {
    applySelected();
    zoomToSelected();
  });
  model.on("change:hovered", applyHovered);
  model.on("change:view_state", applyViewState);
  model.on("change:fit_bounds", applyFitBounds);
  model.on("change:height", () => {
    applyHeight();
    map.resize();
  });
  model.on("change:controls", mountControls);
  model.on("change:basemap", () => {
    styleReady = false;
    map.setStyle(resolveBasemap(model.get("basemap") || "positron", el));
  });
  const disposeColorMode = observeHostColorMode(el, () => {
    if (model.get("basemap") === "auto") {
      styleReady = false;
      map.setStyle(resolveBasemap("auto", el));
    }
  });

  // The widget mounts into a shadow root whose size settles after render.
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => map.resize()) : null;
  ro?.observe(container);

  return () => {
    ro?.disconnect();
    disposeColorMode();
    controls?.dispose();
    popup.remove();
    map.remove();
    disposeTheme();
  };
}

function round(v: number, d: number): number {
  const p = 10 ** d;
  return Math.round(v * p) / p;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export default { render };
