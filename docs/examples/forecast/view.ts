import mapCss from "maplibre-gl/dist/maplibre-gl.css";
import type { Place } from "./data";
import { DEFAULT_CONFIG, legendLabels, type ForecastConfig } from "./config";
import { drawChart } from "./chart";
import type { Forecast, LocalForecast, Metric } from "./types";

const shortDate = (date: Date) => date.toLocaleDateString("en-GB", {
  day: "numeric", month: "short", timeZone: "UTC",
});
const fullDate = (date: Date) => date.toLocaleDateString("en-GB", {
  weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
});
const PLAY = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4l10 6-10 6z" fill="currentColor"/></svg>';
const PAUSE = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4v12M14 4v12" stroke="currentColor" stroke-width="3"/></svg>';

type Actions = {
  selectDay(index: number): void;
  selectMetric(metric: Metric): void;
  selectPlace(place: Place): void;
  togglePlayback(): void;
  nextWeek(): void;
  resetMap(): void;
  refresh(): void;
};

/** Owns the forecast markup, element references and display updates. */
export function createForecastView(element: HTMLElement, config: ForecastConfig = DEFAULT_CONFIG) {
  element.classList.add("forecast-widget");
  const css = document.createElement("style");
  css.textContent = mapCss;
  const panel = document.createElement("section");
  panel.className = "fc-shell";
  panel.innerHTML = `
    <header class="fc-heading">
      <div>
        <h2>Europe</h2>
        <p class="fc-dates">Finding the latest forecast…</p>
      </div>
      <div class="fc-source">
        <span>ECMWF ensemble</span>
        <button class="fc-refresh" title="Check for a newer forecast">Checking run…</button>
      </div>
    </header>
    <div class="fc-toolbar">
      <div class="fc-tabs" role="group" aria-label="Map layer">
        <button data-metric="mean" aria-pressed="true">Temperature</button>
        <button data-metric="spread" aria-pressed="false">Forecast spread</button>
      </div>
      <button class="fc-reset">View Europe</button>
    </div>
    <div class="fc-map-wrap">
      <div class="forecast-map" role="region" aria-label="Forecast map of Europe. Click to select a location."></div>
      <div class="fc-map-key">
        <div class="fc-key-title"></div>
        <div class="fc-ramp"></div>
        <div class="fc-ticks"></div>
      </div>
    </div>
    <div class="fc-map-caption">
      <span class="fc-status" role="status" aria-live="polite">Connecting to the forecast archive…</span>
      <button class="fc-retry" hidden>Try again</button>
      <span class="fc-time-note">Every day at 12:00 UTC</span>
    </div>
    <div class="fc-timeline">
      <div class="fc-timeline-heading">
        <strong class="fc-selected-date">Next week</strong>
        <div class="fc-time-actions">
          <button class="fc-next-week">Next week</button>
          <button class="fc-play" aria-label="Play forecast" aria-pressed="false">${PLAY}</button>
        </div>
      </div>
      <div class="fc-days" aria-busy="true" role="group" aria-label="Forecast date"></div>
    </div>
    <div class="fc-local">
      <div class="fc-place-summary">
        <label class="fc-place-label">Forecast for<select class="fc-place" aria-label="Forecast location"></select></label>
        <div class="fc-point-value">…</div>
        <p class="fc-point-range">Loading the temperature range…</p>
        <p class="fc-point-date"></p>
      </div>
      <div class="fc-chart-area">
        <div class="fc-chart-legend">
          <span class="fc-mean-key">Mean</span>
          <span class="fc-range-key">Middle 80% of members</span>
        </div>
        <div class="fc-chart" aria-busy="true"></div>
      </div>
    </div>
    <details class="fc-notes"><summary>How to read this forecast</summary><div>
      <p>The map and chart show air temperature at 12:00 UTC, about 2 metres above the ground. Select the same hour each day to compare the outlook through the week. These values are not daily highs.</p>
      <p>The mean averages 51 ensemble members. The shaded band in the chart spans their 10th to 90th percentiles. A wider band means the members disagree more. It does not guarantee that the temperature will stay inside that range.</p>
      <p>Forecast spread on the map is the standard deviation across those members, in °C. Higher spread means greater disagreement. Missing values are transparent, and water is covered by the basemap.</p>
      <p class="fc-grid-note"></p>
      <p>Data: <a href="https://dynamical.org/catalog/ecmwf-ifs-ens-forecast-15-day-0-25-degree/" target="_blank" rel="noreferrer">ECMWF IFS ENS from dynamical.org</a>, CC BY 4.0. <a href="https://www.ecmwf.int/en/research/modelling-and-prediction/quantifying-forecast-uncertainty" target="_blank" rel="noreferrer">About ensemble forecasts</a>.</p>
    </div></details>`;
  element.append(css, panel);

  function find<T extends HTMLElement>(selector: string): T {
    const found = panel.querySelector<T>(selector);
    if (!found) throw new Error(`Missing forecast element: ${selector}`);
    return found;
  }

  const elements = {
    map: find<HTMLDivElement>(".forecast-map"),
    dates: find(".fc-dates"),
    refresh: find<HTMLButtonElement>(".fc-refresh"),
    reset: find<HTMLButtonElement>(".fc-reset"),
    status: find(".fc-status"),
    retry: find<HTMLButtonElement>(".fc-retry"),
    days: find(".fc-days"),
    selectedDate: find(".fc-selected-date"),
    nextWeek: find<HTMLButtonElement>(".fc-next-week"),
    play: find<HTMLButtonElement>(".fc-play"),
    place: find<HTMLSelectElement>(".fc-place"),
    pointValue: find(".fc-point-value"),
    pointRange: find(".fc-point-range"),
    pointDate: find(".fc-point-date"),
    chart: find(".fc-chart"),
    gridNote: find(".fc-grid-note"),
    keyTitle: find(".fc-key-title"),
    ramp: find(".fc-ramp"),
    ticks: find(".fc-ticks"),
  };
  find("h2").textContent = config.region_name;
  elements.reset.textContent = `View ${config.region_name}`;
  elements.map.setAttribute("aria-label", `Forecast map of ${config.region_name}. Click to select a location.`);
  const metricButtons = Array.from(panel.querySelectorAll<HTMLButtonElement>("[data-metric]"));
  const events = new AbortController();
  let actions: Actions;

  for (const [index, place] of config.locations.entries()) {
    elements.place.add(new Option(place.name, String(index)));
  }

  function bind(next: Actions) {
    actions = next;
    const options = { signal: events.signal };
    for (const button of metricButtons) {
      button.addEventListener("click", () => {
        actions.selectMetric(button.dataset.metric === "spread" ? "spread" : "mean");
      }, options);
    }
    elements.play.addEventListener("click", actions.togglePlayback, options);
    elements.nextWeek.addEventListener("click", actions.nextWeek, options);
    elements.reset.addEventListener("click", actions.resetMap, options);
    elements.retry.addEventListener("click", actions.refresh, options);
    elements.refresh.addEventListener("click", actions.refresh, options);
    elements.place.addEventListener("change", () => {
      const place = config.locations[Number(elements.place.value)];
      if (place) actions.selectPlace(place);
    }, options);
    elements.days.addEventListener("click", event => {
      const button = (event.target as Element).closest<HTMLButtonElement>("button[data-index]");
      if (button) actions.selectDay(Number(button.dataset.index));
    }, options);
  }

  function showForecast(forecast: Forecast) {
    elements.days.setAttribute("aria-busy", "false");
    elements.dates.textContent = `${shortDate(forecast.days[0].date)} to ${shortDate(forecast.days.at(-1)!.date)} · ${forecast.days.length}-day outlook`;
    elements.refresh.textContent = `Run ${shortDate(forecast.initialized)}, 00 UTC ↻`;
    elements.refresh.title = `Checked ${forecast.checked.toISOString().slice(11, 16)} UTC. Click to check for a newer run.`;
    elements.days.replaceChildren(...forecast.days.map((day, index) => {
      const button = document.createElement("button");
      button.className = "fc-day";
      button.dataset.index = String(index);
      button.setAttribute("aria-label", fullDate(day.date));
      const weekday = document.createElement("span");
      weekday.textContent = day.date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
      const number = document.createElement("strong");
      number.textContent = String(day.date.getUTCDate());
      button.append(weekday, number);
      return button;
    }));
  }

  function showMetric(metric: Metric) {
    const spread = metric === "spread";
    for (const button of metricButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.metric === metric));
    }
    elements.keyTitle.textContent = spread ? "Ensemble spread · °C" : "Mean temperature · °C";
    const colors = spread ? config.spread_colors : config.temperature_colors;
    elements.ramp.style.background = `linear-gradient(to right, ${colors.join(",")})`;
    const labels = legendLabels(spread ? config.spread_range : config.temperature_range, spread ? 5 : 6);
    elements.ticks.replaceChildren(...labels.map(label => {
      const span = document.createElement("span");
      span.textContent = label;
      return span;
    }));
    elements.ticks.classList.toggle("fc-temperature-ticks", !spread);
  }

  function showDate(forecast: Forecast, index: number) {
    elements.selectedDate.textContent = fullDate(forecast.days[index].date);
    const buttons = elements.days.querySelectorAll<HTMLButtonElement>("button");
    buttons.forEach((button, dayIndex) => {
      button.setAttribute("aria-pressed", String(dayIndex === index));
    });
    const active = buttons[index];
    if (!active) return;
    const outsideLeft = active.offsetLeft < elements.days.scrollLeft;
    const outsideRight = active.offsetLeft + active.offsetWidth > elements.days.scrollLeft + elements.days.clientWidth;
    if (outsideLeft || outsideRight) {
      elements.days.scrollLeft = active.offsetLeft - elements.days.clientWidth / 2 + active.offsetWidth / 2;
    }
  }

  function showPlace(place: Place) {
    const index = config.locations.findIndex(city => city.name === place.name);
    elements.place.querySelector('option[value="custom"]')?.remove();
    if (index < 0) elements.place.add(new Option(place.name, "custom"));
    elements.place.value = index < 0 ? "custom" : String(index);
  }

  function showPoint(forecast: Forecast, point: LocalForecast | undefined, index: number) {
    const day = forecast.days[index];
    elements.pointDate.textContent = `${shortDate(day.date)} · 12:00 UTC`;
    if (!point) return;
    elements.chart.setAttribute("aria-busy", "false");
    const value = point.series[day.frame];
    const available = Number.isFinite(value.mean);
    elements.pointValue.innerHTML = available ? `${Math.round(value.mean)}<span>°C</span>` : "No data";
    elements.pointRange.textContent = available
      ? `Most members: ${Math.round(value.low)} to ${Math.round(value.high)}°C`
      : "Some ensemble members are missing for this date.";
    elements.gridNote.textContent = `The selected point uses the nearest 0.25° grid cell at ${point.latitude.toFixed(2)}°, ${point.longitude.toFixed(2)}°. Mountains and coastlines can vary within a cell. No elevation correction is applied.`;
    drawChart(elements.chart, forecast.days, point.series, index, actions.selectDay);
  }

  function showPointLoading() {
    elements.chart.setAttribute("aria-busy", "true");
    elements.pointValue.textContent = "…";
    elements.pointRange.textContent = "Loading this location…";
    elements.chart.replaceChildren();
  }

  function showPointError() {
    elements.chart.setAttribute("aria-busy", "false");
    elements.pointValue.innerHTML = "<span>Unavailable</span>";
    elements.pointRange.textContent = "Choose another location or check again later.";
  }

  function showLoading() {
    elements.days.setAttribute("aria-busy", "true");
    elements.chart.setAttribute("aria-busy", "true");
    elements.retry.hidden = true;
    elements.refresh.disabled = true;
    elements.status.textContent = "Checking the latest forecast…";
    elements.pointValue.textContent = "…";
    elements.chart.replaceChildren();
    elements.days.replaceChildren();
  }

  function showError(message: string) {
    elements.retry.hidden = false;
    elements.status.textContent = message;
  }

  function showMapProgress(ready: boolean) {
    elements.status.textContent = ready ? "Click a place to see its forecast" : "Loading the map…";
    panel.toggleAttribute("data-loading", !ready);
  }

  function showPlayback(playing: boolean) {
    elements.play.innerHTML = playing ? PAUSE : PLAY;
    elements.play.setAttribute("aria-pressed", String(playing));
    elements.play.setAttribute("aria-label", playing ? "Pause forecast" : "Play forecast");
  }

  return {
    mapContainer: elements.map,
    bind,
    showForecast,
    showMetric,
    showDate,
    showPlace,
    showPoint,
    showPointLoading,
    showPointError,
    showLoading,
    showError,
    showMapProgress,
    showPlayback,
    finishLoading() { elements.refresh.disabled = false; },
    dispose() {
      events.abort();
      panel.remove();
      css.remove();
    },
  };
}

export type ForecastView = ReturnType<typeof createForecastView>;
