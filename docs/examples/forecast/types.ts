import type { openForecast, readPoint, Place } from "./data";

export type Forecast = Awaited<ReturnType<typeof openForecast>>;
export type LocalForecast = Awaited<ReturnType<typeof readPoint>>;
export type Metric = "mean" | "spread";

export type ForecastSelection = {
  date: number;
  place: Place;
  metric: Metric;
};
