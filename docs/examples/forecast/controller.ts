import { onChanges, safeSaveChanges, type AnyModel } from "@manywidgets/core";
import { DAY, openForecast, readPoint, type Place } from "./data";
import { createForecastMap, type ForecastMap } from "./map";
import { DEFAULT_CONFIG, initialPlace, type ForecastConfig } from "./config";
import type { ForecastView } from "./view";
import type { Forecast, ForecastSelection, LocalForecast, Metric } from "./types";

type SavedSelection = ForecastSelection & { saved: number };
type LoadStatus = "idle" | "loading" | "ready" | "error";

/** Preserves selections through MyST's responsive remounts within this document. */
function selectionMemory(key: string) {
  const page = window as Window & { __manywidgetsForecastViews?: Map<string, SavedSelection> };
  const selections = page.__manywidgetsForecastViews ??= new Map();
  return {
    read() {
      const selection = selections.get(key);
      return selection && Date.now() - selection.saved < 60000 ? selection : undefined;
    },
    save(selection: ForecastSelection) {
      selections.set(key, { ...selection, saved: Date.now() });
    },
  };
}

function pointKey(forecast: Forecast, place: Place) {
  return `${forecast.run}/${Math.round(place.lat * 4)}/${Math.round(place.lon * 4)}`;
}

function nextWeekIndex(forecast: Forecast, now: number) {
  const index = forecast.days.findIndex(day => +day.date >= now + 7 * DAY);
  return index < 0 ? forecast.days.length - 1 : index;
}

/** Coordinates model state, cancellable data reads and playback. */
export function createForecastController(model: AnyModel, view: ForecastView, config: ForecastConfig = DEFAULT_CONFIG) {
  const memory = selectionMemory(`${location.pathname}/${model.get("widget_id") ?? "europe"}/${JSON.stringify(config)}`);
  let restoredSelection = memory.read();
  let disposed = false;
  let status: LoadStatus = "idle";
  let forecast: Forecast | undefined;
  let point: LocalForecast | undefined;
  let place: Place = initialPlace(config);
  let map: ForecastMap | undefined;
  let mapReady = false;
  let forecastRequest = new AbortController();
  let pointRequest = new AbortController();
  let playbackTimer: ReturnType<typeof setTimeout> | undefined;
  const pointCache = new Map<string, LocalForecast>();

  function set(name: string, value: unknown) {
    model.set(name, value);
    safeSaveChanges(model);
  }

  function selectedDay() {
    const index = Math.round(Number(model.get("day_index")) || 0);
    return Math.max(0, Math.min((forecast?.days.length ?? 1) - 1, index));
  }

  function selectedMetric(): Metric {
    return model.get("metric") === "spread" ? "spread" : "mean";
  }

  function currentSelection(): ForecastSelection | undefined {
    if (!forecast) return;
    return { date: +forecast.days[selectedDay()].date, place, metric: selectedMetric() };
  }

  function rememberSelection() {
    const selection = currentSelection();
    if (selection && status !== "loading") memory.save(selection);
  }

  function showError(error: unknown) {
    if (disposed) return;
    status = "error";
    view.showError(error instanceof Error ? error.message : "The forecast could not load. Please try again.");
    console.error("Forecast:", error);
  }

  function showMapProgress(ready: boolean) {
    mapReady = ready;
    if (!disposed && status === "ready") view.showMapProgress(ready);
  }

  function drawPoint() {
    if (forecast) view.showPoint(forecast, point, selectedDay());
  }

  function update() {
    rememberSelection();
    view.showMetric(selectedMetric());
    if (!forecast || !map) return;
    view.showDate(forecast, selectedDay());
    drawPoint();
    map.show(forecast, selectedDay(), selectedMetric());
  }

  function selectDay(index: number) {
    set("playing", false);
    set("day_index", index);
  }

  async function selectPlace(next: Place) {
    if (!forecast) return;
    place = next;
    rememberSelection();
    map?.selectPlace(place);
    view.showPlace(place);
    pointRequest.abort();
    const request = new AbortController();
    pointRequest = request;
    point = undefined;
    view.showPointLoading();
    const key = pointKey(forecast, place);
    try {
      const value = pointCache.get(key) ?? await readPoint(forecast.array, forecast.run, place, request.signal);
      if (disposed || request.signal.aborted) return;
      if (pointCache.size >= 12) pointCache.delete(pointCache.keys().next().value!);
      pointCache.set(key, value);
      point = value;
      drawPoint();
    } catch {
      if (!disposed && !request.signal.aborted) view.showPointError();
    }
  }

  function updatePlayback() {
    const playing = !!model.get("playing");
    view.showPlayback(playing);
    clearTimeout(playbackTimer);
    if (!playing || disposed) return;
    playbackTimer = setTimeout(() => {
      if (mapReady && !document.hidden && forecast && status === "ready") {
        if (selectedDay() >= forecast.days.length - 1) {
          set("playing", false);
          return;
        }
        set("day_index", selectedDay() + 1);
      }
      updatePlayback();
    }, 1100);
  }

  async function refresh() {
    if (status === "loading" || disposed) return;
    const selection = currentSelection() ?? restoredSelection;
    restoredSelection = undefined;
    status = "loading";
    set("playing", false);
    view.showLoading();
    forecastRequest.abort();
    forecastRequest = new AbortController();
    pointRequest.abort();
    mapReady = false;
    map?.clear();
    forecast = undefined;
    point = undefined;
    try {
      const latest = await openForecast(forecastRequest.signal, Date.now(), config);
      if (disposed) return;
      forecast = latest;
      point = latest.point;
      place = initialPlace(config);
      view.showPlace(place);
      map?.selectPlace(place);
      pointCache.clear();
      pointCache.set(pointKey(latest, place), point);
      view.showForecast(latest);
      const retainedDay = selection ? latest.days.findIndex(day => +day.date === selection.date) : -1;
      const requestedDay = Number(model.get("day_index"));
      const startingDay = requestedDay >= 0 ? Math.min(requestedDay, latest.days.length - 1) : nextWeekIndex(latest, +latest.checked);
      set("day_index", retainedDay >= 0 ? retainedDay : startingDay);
      if (selection) set("metric", selection.metric);
      status = "ready";
      if (selection) void selectPlace(selection.place);
      update();
      showMapProgress(mapReady);
    } catch (error) {
      showError(error);
    } finally {
      if (!disposed) view.finishLoading();
    }
  }

  function resume() {
    if (!document.hidden && forecast && Date.now() - +forecast.checked > 30 * 60000) {
      void refresh();
    }
  }

  const unsubscribeSelection = onChanges(model, ["metric", "day_index"], update);
  const unsubscribePlayback = onChanges(model, ["playing"], updatePlayback);
  document.addEventListener("visibilitychange", resume);

  view.bind({
    selectDay,
    selectMetric: metric => set("metric", metric),
    selectPlace,
    refresh,
    resetMap: () => map?.reset(),
    nextWeek() {
      if (forecast) selectDay(nextWeekIndex(forecast, Date.now()));
    },
    togglePlayback() {
      if (forecast && selectedDay() === forecast.days.length - 1) set("day_index", 0);
      set("playing", !model.get("playing"));
    },
  });

  return {
    start() {
      update();
      try {
        map = createForecastMap(view.mapContainer, {
          ready: refresh,
          selectPlace,
          progress: showMapProgress,
          error: showError,
        }, config);
      } catch (error) {
        showError(error);
      }
    },
    resize() {
      map?.resize();
      drawPoint();
    },
    dispose() {
      rememberSelection();
      disposed = true;
      forecastRequest.abort();
      pointRequest.abort();
      clearTimeout(playbackTimer);
      unsubscribeSelection();
      unsubscribePlayback();
      document.removeEventListener("visibilitychange", resume);
      map?.dispose();
    },
  };
}
