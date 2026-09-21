import maplibregl from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ZarrLayer, type GetTileDataOptions, type ZarrLayerProps } from "@developmentseed/deck.gl-zarr";
import type { Texture } from "@luma.gl/core";
import * as zarr from "zarrita";
import { GEO, summarize, type Place } from "./data";
import { createForecastColormap, encodeMissingValues, forecastPipeline, selectTileSlice, type ForecastTile } from "./raster";
import { createBasemap, readBasemapTheme } from "./basemap";
import { observeHostColorMode } from "@manywidgets/core";
import { DEFAULT_CONFIG, initialPlace, type ForecastConfig } from "./config";
import type { Forecast, Metric } from "./types";

type MapEvents = {
  ready(): void;
  selectPlace(place: Place): void;
  progress(ready: boolean): void;
  error(error: unknown): void;
};

function placeAt(lon: number, lat: number, config: ForecastConfig): Place | undefined {
  if (lon < config.bounds[0] || lon > config.bounds[2] || lat < config.bounds[1] || lat > config.bounds[3]) return;
  const nearby = config.locations.find(place => {
    const distance = Math.hypot((place.lon - lon) * Math.cos(lat * Math.PI / 180), place.lat - lat);
    return distance < 0.35;
  });
  return nearby ?? {
    lon,
    lat,
    name: `${Math.abs(lat).toFixed(1)}°${lat < 0 ? "S" : "N"}, ${Math.abs(lon).toFixed(1)}°${lon < 0 ? "W" : "E"}`,
  };
}

/** Skips source chunks outside the configured region because raster traversal ignores extent. */
function intersectsRegion(options: GetTileDataOptions, config: ForecastConfig) {
  const west = -180.125 + options.x * 8;
  const north = 90.125 - options.y * 8;
  return west + 8 >= config.bounds[0] && west <= config.bounds[2] && north >= config.bounds[1] && north - 8 <= config.bounds[3];
}

/** Owns the basemap, raster requests, marker and GPU resources. */
export function createForecastMap(container: HTMLDivElement, events: MapEvents, config: ForecastConfig = DEFAULT_CONFIG) {
  let disposed = false;
  let generation = 0;
  let pendingRequests = 0;
  let viewportReady = false;
  const textures = new Set<Texture>();
  let colormap: Texture | undefined;
  const bounds: maplibregl.LngLatBoundsLike = [[config.bounds[0], config.bounds[1]], [config.bounds[2], config.bounds[3]]];
  let theme = readBasemapTheme(container);
  const map = new maplibregl.Map({
    container,
    bounds,
    fitBoundsOptions: { padding: 18 },
    minZoom: 2,
    maxZoom: 8,
    attributionControl: { compact: true },
    style: createBasemap(theme),
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  for (const direction of ["in", "out"]) {
    const icon = container.querySelector(`.maplibregl-ctrl-zoom-${direction} .maplibregl-ctrl-icon`);
    const path = direction === "in" ? "M4 9h10M9 4v10" : "M4 9h10";
    if (icon) icon.innerHTML = `<svg viewBox="0 0 18 18" aria-hidden="true"><path d="${path}"/></svg>`;
  }
  map.scrollZoom.disable();
  const overlay = new MapboxOverlay({ interleaved: true, layers: [], onError: events.error });
  map.addControl(overlay);
  const dot = document.createElement("div");
  dot.className = "fc-marker";
  const marker = new maplibregl.Marker({ element: dot })
    .setLngLat([initialPlace(config).lon, initialPlace(config).lat])
    .addTo(map);

  map.on("click", event => {
    const place = placeAt(event.lngLat.lng, event.lngLat.lat, config);
    if (place) events.selectPlace(place);
  });
  function updateTheme() {
    if (disposed || !map.getLayer("land")) return;
    const next = readBasemapTheme(container);
    if (JSON.stringify(next) === JSON.stringify(theme)) return;
    theme = next;
    map.setPaintProperty("land", "background-color", theme.land);
    map.setPaintProperty("water", "fill-color", theme.water);
    map.setPaintProperty("borders", "line-color", theme.border);
    for (const layer of ["countries", "cities"]) {
      map.setPaintProperty(layer, "text-color", theme.text);
      map.setPaintProperty(layer, "text-halo-color", theme.land);
    }
  }

  const stopObservingHost = observeHostColorMode(container, updateTheme);
  const themeObserver = new MutationObserver(updateTheme);
  let ancestor: Element | null = container.parentElement;
  while (ancestor) {
    themeObserver.observe(ancestor, {
      attributes: true,
      attributeFilter: ["style", "class", "data-mw-color-mode"],
    });
    const root = ancestor.getRootNode();
    ancestor = ancestor.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  }

  map.on("load", () => {
    updateTheme();
    events.ready();
  });
  map.on("error", event => {
    if (!disposed) console.warn("Basemap:", event.error);
  });

  function reportProgress() {
    if (!disposed) events.progress(viewportReady && pendingRequests === 0);
  }

  function clear() {
    generation++;
    pendingRequests = 0;
    viewportReady = false;
    overlay.setProps({ layers: [] });
  }

  function show(forecast: Forecast, dayIndex: number, metric: Metric) {
    const requestGeneration = generation;
    const spread = metric === "spread";
    const frame = forecast.days[dayIndex].frame;
    const isCurrent = () => !disposed && requestGeneration === generation;

    const layerProps = {
      id: `europe-forecast-${forecast.run}-${requestGeneration}`,
      node: forecast.array,
      metadata: GEO,
      selection: { init_time: forecast.run, lead_time: null, ensemble_member: null },
      extent: config.bounds,
      maxRequests: 3,
      maxCacheSize: 80,
      debounceTime: 180,
      opacity: 0.92,
      beforeId: "water",
      getTileData: async (array, options: GetTileDataOptions) => {
        if (!intersectsRegion(options, config)) return null;
        if (isCurrent()) {
          pendingRequests++;
          viewportReady = false;
          reportProgress();
        }
        try {
          const chunk = await zarr.get(array, options.sliceSpec, { signal: options.signal });
          if (!isCurrent() || options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
          const values = encodeMissingValues(summarize(chunk));
          const pixels = options.width * options.height;
          const uploadedSlice = frame + (spread ? forecast.hours.length : 0);
          colormap ??= createForecastColormap(options.device, config);
          const texture = options.device.createTexture({
            dimension: "2d",
            format: "r32float",
            width: options.width,
            height: options.height,
            mipLevels: 1,
            data: values.subarray(uploadedSlice * pixels, (uploadedSlice + 1) * pixels),
            sampler: {
              minFilter: "nearest",
              magFilter: "nearest",
              addressModeU: "clamp-to-edge",
              addressModeV: "clamp-to-edge",
            },
          });
          textures.add(texture);
          return {
            texture,
            values,
            uploadedSlice,
            width: options.width,
            height: options.height,
            byteLength: values.byteLength + pixels * Float32Array.BYTES_PER_ELEMENT,
          };
        } finally {
          if (isCurrent()) {
            pendingRequests--;
            reportProgress();
          }
        }
      },
      renderTile: tile => {
        if (!tile || !colormap) return { renderPipeline: [] };
        selectTileSlice(tile, frame + (spread ? forecast.hours.length : 0));
        return { renderPipeline: forecastPipeline(tile, colormap, metric, config) };
      },
      updateTriggers: { renderTile: [frame, spread] },
      onTileUnload: tile => {
        const texture = (tile.content as ForecastTile | undefined)?.texture;
        if (texture) {
          texture.destroy();
          textures.delete(texture);
        }
      },
      onTileError: error => {
        if (isCurrent() && error.name !== "AbortError") {
          events.error(new Error("Part of the map could not load. Try again."));
        }
      },
      onViewportLoad: () => {
        if (isCurrent()) {
          viewportReady = true;
          reportProgress();
        }
      },
    } satisfies ZarrLayerProps<zarr.Readable, "float32", ForecastTile | null> & { beforeId: string };
    overlay.setProps({ layers: [new ZarrLayer<zarr.Readable, "float32", ForecastTile | null>(layerProps)] });
  }

  return {
    show,
    clear,
    selectPlace(place: Place) { marker.setLngLat([place.lon, place.lat]); },
    reset() { map.fitBounds(bounds, { padding: 18, duration: 500 }); },
    resize() { map.resize(); },
    dispose() {
      disposed = true;
      generation++;
      stopObservingHost();
      themeObserver.disconnect();
      marker.remove();
      overlay.finalize();
      map.remove();
      for (const texture of textures) texture.destroy();
      textures.clear();
      colormap?.destroy();
    },
  };
}

export type ForecastMap = ReturnType<typeof createForecastMap>;
