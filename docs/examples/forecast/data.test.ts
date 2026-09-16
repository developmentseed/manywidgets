/** @vitest-environment node */
import { DEFAULT_CONFIG } from "./config";
import { describe, expect, it, vi } from "vitest";
import { candidateRuns, DAY, forecastDays, pointSummary, summarize, openForecast } from "./data";
const hours = [...Array.from({length:49},(_,i)=>i*3), ...Array.from({length:36},(_,i)=>150+i*6)];

describe("live forecast dates", () => {
  it("limits a shorter outlook without changing source frame indices", () => {
    const days = forecastDays(new Date("2026-09-14T00:00:00Z"), hours, Date.parse("2026-09-15T13:00:00Z"), 7);
    expect(days).toHaveLength(7);
    expect(days[0].date.toISOString()).toBe("2026-09-16T12:00:00.000Z");
    expect(days.at(-1)!.date.toISOString()).toBe("2026-09-22T12:00:00.000Z");
    expect(days.every(day => hours[day.frame] === day.hour)).toBe(true);
  });
  it("selects recent past runs newest first, excluding future and stale runs", () => {
    const now = Date.parse("2026-09-15T10:00:00Z");
    expect(candidateRuns([now-4*DAY,now-2*DAY,now-DAY,now+DAY,now-12*3600000].map(t=>t/1000),now).map(d=>d.run)).toEqual([4,2,1]);
  });
  it("shows only upcoming noon snapshots within the source horizon", () => {
    const days=forecastDays(new Date("2026-09-14T00:00:00Z"),hours,Date.parse("2026-09-15T10:00:00Z"));
    expect(days).toHaveLength(14);
    expect(days[0].date.toISOString()).toBe("2026-09-15T12:00:00.000Z");
    expect(days.at(-1)!.date.toISOString()).toBe("2026-09-28T12:00:00.000Z");
    expect(days.every(d=>hours[d.frame]===d.hour)).toBe(true);
  });
  it("moves the date window when opened on another day or after noon", () => {
    const days=forecastDays(new Date("2026-09-14T00:00:00Z"),hours,Date.parse("2026-09-16T13:00:00Z"));
    expect(days[0].date.toISOString()).toBe("2026-09-17T12:00:00.000Z");
    expect(days).toHaveLength(12);
  });
});
describe("ensemble calculations", () => {
  it("calculates mean and population standard deviation", () => {
    const data=Float32Array.from({length:51},(_,i)=>i<17?30:15);
    const result=summarize({data,shape:[1,51,1,1],stride:[51,1,1,1]});
    expect(result[0]).toBe(20);expect(result[1]).toBeCloseTo(Math.sqrt(50),5);
  });
  it("keeps zero spread distinct from missing members", () => {
    const data=new Float32Array(102).fill(20);data[1]=NaN;
    expect(Array.from(summarize({data,shape:[1,51,1,2],stride:[102,2,2,1]}))).toEqual([20,NaN,0,NaN]);
  });
  it("respects non-contiguous strides and separates leads and bands", () => {
    const data=new Float32Array(204);
    for(let m=0;m<51;m++){data[m*4]=10;data[m*4+1]=20;data[m*4+2]=30;data[m*4+3]=40;}
    expect(Array.from(summarize({data,shape:[2,51,1,2],stride:[2,4,2,1]}))).toEqual([10,20,30,40,0,0,0,0]);
  });
  it("uses the 10th and 90th percentiles and leaves gaps in the point series", () => {
    const data=Float32Array.from({length:102},(_,i)=>i<51?i:NaN);
    const points=pointSummary({data,shape:[2,51],stride:[51,1]});
    expect(points[0]).toEqual({mean:25,low:5,high:45});
    expect(points[1]).toEqual({mean:NaN,low:NaN,high:NaN});
  });
});


describe("configured forecast store", () => {
  it("requests metadata from the supplied store instead of the default", async () => {
    const fetchStore = vi.fn(async (_request: Request) => new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchStore);
    try {
      await expect(openForecast(new AbortController().signal, Date.now(), {
        ...DEFAULT_CONFIG, store_url: "https://weather.example/ecmwf.zarr",
      })).rejects.toThrow();
      expect(fetchStore).toHaveBeenCalled();
      for (const [request] of fetchStore.mock.calls) {
        expect(request.url).toMatch(/^https:\/\/weather\.example\/ecmwf\.zarr\//);
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
