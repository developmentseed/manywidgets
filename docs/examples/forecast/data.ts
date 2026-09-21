import * as zarr from "zarrita";
import { DEFAULT_CONFIG, initialPlace, type ForecastConfig } from "./config";

export const DAY = 86400000;
export const GEO = {
  "spatial:dimensions": ["latitude", "longitude"],
  "spatial:transform": [0.25, 0, -180.125, 0, -0.25, 90.125],
  "spatial:shape": [721, 1440],
  "proj:code": "EPSG:4326",
};
export type Place = { name: string; lon: number; lat: number };
export type ForecastDay = { frame: number; date: Date; hour: number };
export type PointForecast = { mean: number; low: number; high: number }[];

/** Future daily snapshots at 12 UTC, up to fourteen days from opening. */
export function forecastDays(initialized: Date, hours: number[], now = Date.now(), count = 14): ForecastDay[] {
  return hours.map((hour, frame) => ({ hour, frame, date: new Date(+initialized + hour * 3600000) }))
    .filter(d => d.date.getUTCHours() === 12 && +d.date >= now && +d.date <= now + count * DAY)
    .slice(0, count);
}

export function candidateRuns(times: number[], now = Date.now()) {
  return times.map((seconds, run) => ({ run, time: seconds * 1000 }))
    .filter(d => d.time <= now && now - d.time <= 3 * DAY)
    .sort((a, b) => b.time - a.time).slice(0, 3);
}

export function pointSummary(chunk: { data: ArrayLike<number>; shape: number[]; stride: number[] }): PointForecast {
  const [frames, members] = chunk.shape;
  if (chunk.shape.length !== 2 || members !== 51) throw new Error("Expected 51 forecast members.");
  return Array.from({ length: frames }, (_, t) => {
    const values = Array.from({ length: members }, (_, m) => chunk.data[t * chunk.stride[0] + m * chunk.stride[1]]);
    if (!values.every(Number.isFinite)) return { mean: NaN, low: NaN, high: NaN };
    values.sort((a, b) => a - b);
    return { mean: values.reduce((a, b) => a + b, 0) / members, low: values[5], high: values[45] };
  });
}

export async function readPoint(array: zarr.Array<"float32", zarr.Readable>, run: number, place: Place, signal: AbortSignal) {
  const row = Math.max(0, Math.min(720, Math.round((90 - place.lat) * 4)));
  const col = Math.max(0, Math.min(1439, Math.round((place.lon + 180) * 4)));
  const chunk = await zarr.get(array, [run, null, null, row, col], { signal });
  return { series: pointSummary(chunk), latitude: 90 - row / 4, longitude: col / 4 - 180 };
}

export async function openForecast(signal: AbortSignal, now = Date.now(), config: ForecastConfig = DEFAULT_CONFIG) {
  const store = await zarr.withConsolidatedMetadata(new zarr.FetchStore(config.store_url, {
    fetch: request => fetch(new Request(request, {
      cache: request.url.includes("temperature_2m/c/") ? "default" : "no-cache",
      signal: AbortSignal.any([signal, request.signal]),
    })),
  }), { format: "v3" });
  const root = await zarr.open.v3(store, { kind: "group" });
  const open = (name: string) => zarr.open.v3(root.resolve(name), { kind: "array" });
  const [array, init, lead] = await Promise.all([open("temperature_2m"), open("init_time"), open("lead_time")]);
  if (!array.is("float32") || array.attrs.units !== "degree_Celsius" || array.shape.slice(1).join() !== "85,51,721,1440") {
    throw new Error("The forecast format has changed. The data adapter needs an update.");
  }
  const [times, leads] = await Promise.all([zarr.get(init, [null], { signal }), zarr.get(lead, [null], { signal })]);
  const hours = Array.from(leads.data, Number).map(s => s / 3600);
  const candidates = candidateRuns(Array.from(times.data, Number), now);
  if (!candidates.length) throw new Error("The archive has no run from the last three days. Try again later.");
  for (const { run, time } of candidates) {
    const initialized = new Date(time);
    const days = forecastDays(initialized, hours, now, config.forecast_days);
    if (days.length < Math.min(7, config.forecast_days)) continue;
    const point = await readPoint(array, run, initialPlace(config), signal);
    if (days.every(d => Number.isFinite(point.series[d.frame].mean))) {
      return { array, hours, run, initialized, days, point, checked: new Date(now) };
    }
  }
  throw new Error("Recent runs are still missing forecast values. Try again later.");
}

/** Reduce each member ensemble to mean and population standard deviation.
 * Missing members leave the pixel transparent instead of narrowing its spread.
 */
export function summarize(chunk: { data: ArrayLike<number>; shape: number[]; stride: number[] }) {
  const [frames, members, height, width] = chunk.shape;
  if (chunk.shape.length !== 4 || members !== 51) throw new Error("Expected all 51 ensemble members.");
  const pixels = height * width;
  const result = new Float32Array(frames * pixels * 2);
  const [st, sm, sy, sx] = chunk.stride;
  for (let t = 0; t < frames; t++) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let mean = 0, squared = 0, count = 0;
    const start = t * st + y * sy + x * sx;
    for (let m = 0; m < members; m++) {
      const value = chunk.data[start + m * sm];
      if (Number.isFinite(value)) {
        count++;
        const delta = value - mean;
        mean += delta / count;
        squared += delta * (value - mean);
      }
    }
    const i = t * pixels + y * width + x;
    result[i] = count === members ? mean : NaN;
    result[frames * pixels + i] = count === members ? Math.sqrt(Math.max(0, squared / members)) : NaN;
  }
  return result;
}
