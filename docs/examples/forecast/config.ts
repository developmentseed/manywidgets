import defaults from "./defaults.json";
import type { Place } from "./data";

export type ForecastConfig = {
  store_url: string;
  region_name: string;
  bounds: [number, number, number, number];
  locations: Place[];
  initial_location: string;
  forecast_days: number;
  temperature_range: [number, number];
  spread_range: [number, number];
  temperature_colors: string[];
  spread_colors: string[];
};

/** Shared defaults; Python validates constructor options before syncing them. */
export const DEFAULT_CONFIG = defaults as ForecastConfig;

export function initialPlace(config: ForecastConfig) {
  return config.locations.find(place => place.name === config.initial_location)!;
}

/** Uses the same scale endpoints as the raster, with evenly spaced legend ticks. */
export function legendLabels(range: [number, number], count: number) {
  return Array.from({ length: count }, (_, index) => {
    const value = range[0] + (range[1] - range[0]) * index / (count - 1);
    return `${Number(value.toFixed(2))}`.replace("-", "−") + (index === count - 1 ? "+" : "");
  });
}
