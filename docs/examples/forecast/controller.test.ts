import { DEFAULT_CONFIG } from "./config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnyModel } from "@manywidgets/core";
import { fakeModel } from "../../../tests/js/index";
import { createForecastController } from "./controller";
import { createForecastMap } from "./map";
import { DAY, openForecast, readPoint } from "./data";
import type { Forecast, LocalForecast } from "./types";
import type { ForecastView } from "./view";

vi.mock("./map", () => ({ createForecastMap: vi.fn() }));
vi.mock("./data", async importOriginal => ({
  ...await importOriginal<typeof import("./data")>(),
  openForecast: vi.fn(),
  readPoint: vi.fn(),
}));

const CITIES = DEFAULT_CONFIG.locations;
const now = Date.parse("2026-09-15T10:00:00Z");
const point = { latitude: 52.5, longitude: 13.5, series: [{ mean: 18, low: 15, high: 22 }] };
const forecast = {
  run: 896,
  array: {},
  hours: [],
  initialized: new Date(now - DAY),
  checked: new Date(now),
  point,
  days: Array.from({ length: 14 }, (_, index) => ({
    date: new Date(now + index * DAY + 2 * 3600000), frame: index, hour: index * 24,
  })),
} as unknown as Forecast;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

function setup(widgetId: string = crypto.randomUUID(), config = DEFAULT_CONFIG, dayIndex = 7) {
  const model = fakeModel({ widget_id: widgetId, day_index: dayIndex, metric: "mean", playing: false });
  const view = {
    mapContainer: document.createElement("div"),
    bind: vi.fn(), showForecast: vi.fn(), showMetric: vi.fn(), showDate: vi.fn(),
    showPlace: vi.fn(), showPoint: vi.fn(), showPointLoading: vi.fn(), showPointError: vi.fn(),
    showLoading: vi.fn(), showError: vi.fn(), showMapProgress: vi.fn(), showPlayback: vi.fn(),
    finishLoading: vi.fn(), dispose: vi.fn(),
  } satisfies ForecastView;
  const map = { show: vi.fn(), clear: vi.fn(), selectPlace: vi.fn(), reset: vi.fn(), resize: vi.fn(), dispose: vi.fn() };
  vi.mocked(createForecastMap).mockReturnValue(map);
  const controller = createForecastController(model as AnyModel, view, config);
  cleanups.push(controller.dispose);
  controller.start();
  const events = vi.mocked(createForecastMap).mock.calls.at(-1)![1];
  const actions = view.bind.mock.calls[0][0] as Parameters<ForecastView["bind"]>[0];
  return { model, view, map, controller, events, actions };
}

let cleanups: (() => void)[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.mocked(openForecast).mockResolvedValue(forecast);
});
afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("forecast controller lifecycle", () => {
  it("passes regional settings to the reader and map and honors the starting day", async () => {
    const config = { ...DEFAULT_CONFIG, region_name: "Switzerland", bounds: [5.9, 45.8, 10.6, 47.9] as [number, number, number, number], locations: [CITIES.at(-1)!], initial_location: "Zurich", forecast_days: 7 };
    const { events, model, view } = setup(undefined, config, 2);
    await events.ready();
    expect(openForecast).toHaveBeenCalledWith(expect.any(AbortSignal), now, config);
    expect(vi.mocked(createForecastMap).mock.calls.at(-1)?.[2]).toEqual(config);
    expect(model.get("day_index")).toBe(2);
    expect(view.showPlace).toHaveBeenLastCalledWith(config.locations[0]);
  });

  it("opens about a week ahead for the automatic starting day", async () => {
    const { events, model } = setup(undefined, DEFAULT_CONFIG, -1);
    await events.ready();
    expect(model.get("day_index")).toBe(7);
  });

  it("does not restore another configuration's location or date", async () => {
    const first = setup("config-remount");
    await first.events.ready();
    first.actions.selectDay(9);
    first.controller.dispose();
    cleanups = [];
    const config = { ...DEFAULT_CONFIG, initial_location: "Zurich" };
    const second = setup("config-remount", config, 1);
    await second.events.ready();
    expect(second.model.get("day_index")).toBe(1);
    expect(second.view.showPlace).toHaveBeenLastCalledWith(CITIES.at(-1));
  });

  it("ignores a late location response after a newer place is selected", async () => {
    const { events, actions, view } = setup();
    await events.ready();
    const older = deferred<LocalForecast>();
    const newer = deferred<LocalForecast>();
    vi.mocked(readPoint).mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    const first = actions.selectPlace(CITIES[1]);
    const second = actions.selectPlace(CITIES[2]);
    const paris = { ...point, longitude: 2.25 };
    newer.resolve(paris);
    await second;
    older.resolve({ ...point, longitude: 0 });
    await first;
    expect(view.showPoint.mock.calls.at(-1)?.[1]).toBe(paris);
    expect(vi.mocked(readPoint).mock.calls[0][3]?.aborted).toBe(true);
  });

  it("waits for map readiness during playback and stops at the final day", async () => {
    const { events, actions, model } = setup();
    await events.ready();
    actions.togglePlayback();
    await vi.advanceTimersByTimeAsync(2200);
    expect(model.get("day_index")).toBe(7);
    events.progress(true);
    await vi.advanceTimersByTimeAsync(1100);
    expect(model.get("day_index")).toBe(8);
    model.set("day_index", 13);
    await vi.advanceTimersByTimeAsync(1100);
    expect(model.get("playing")).toBe(false);
  });

  it("keeps selections through a responsive remount while checking the source again", async () => {
    const first = setup("responsive-test");
    await first.events.ready();
    first.actions.selectDay(2);
    first.actions.selectMetric("spread");
    vi.mocked(readPoint).mockResolvedValue(point);
    await first.actions.selectPlace(CITIES[2]);
    first.controller.dispose();
    cleanups = [];
    const second = setup("responsive-test");
    await second.events.ready();
    expect(openForecast).toHaveBeenCalledTimes(2);
    expect(second.model.get("day_index")).toBe(2);
    expect(second.model.get("metric")).toBe("spread");
    expect(second.view.showPlace).toHaveBeenLastCalledWith(CITIES[2]);
  });

  it("aborts pending reads and ignores completion after disposal", async () => {
    const pending = deferred<Forecast>();
    vi.mocked(openForecast).mockReturnValue(pending.promise);
    const { controller, events, view, map } = setup();
    const loading = events.ready();
    const signal = vi.mocked(openForecast).mock.calls[0][0];
    controller.dispose();
    cleanups = [];
    expect(signal?.aborted).toBe(true);
    pending.resolve(forecast);
    await loading;
    expect(view.showForecast).not.toHaveBeenCalled();
    expect(map.dispose).toHaveBeenCalledOnce();
  });
});
