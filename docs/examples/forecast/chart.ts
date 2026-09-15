import type { ForecastDay, PointForecast } from "./data";
const NS = "http://www.w3.org/2000/svg";
function node(tag: string, attrs: Record<string, string | number>, text?: string) {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  if (text) el.textContent = text;
  return el;
}

/** A local afternoon forecast: mean line and 10th to 90th percentile band. */
export function drawChart(container: HTMLElement, days: ForecastDay[], series: PointForecast, selected: number, choose: (i: number) => void) {
  const width = Math.max(280, container.clientWidth || 700);
  const svg = node("svg", { viewBox: `0 0 ${width} 190`, role: "group", "aria-label": "Afternoon temperature forecast. Line: ensemble mean. Shaded band: 10th to 90th percentile." });
  const values = days.map(d => series[d.frame]);
  const valid = values.filter(v => Number.isFinite(v.mean));
  if (!valid.length) { container.textContent = "Forecast values are missing for this point."; return; }
  const bottom = 151, top = 16, left = 32, right = width - 14;
  const min = Math.floor(Math.min(...valid.map(v => v.low)) / 5) * 5 - 2;
  const max = Math.ceil(Math.max(...valid.map(v => v.high)) / 5) * 5 + 2;
  const x = (i: number) => left + i / Math.max(1, days.length - 1) * (right - left);
  const y = (v: number) => bottom - (v - min) / (max - min) * (bottom - top);
  for (let tick = Math.ceil(min / 5) * 5; tick <= max; tick += 5) {
    svg.append(node("line", { x1: left, x2: right, y1: y(tick), y2: y(tick), class: "fc-chart-grid" }));
    svg.append(node("text", { x: left - 9, y: y(tick) + 4, "text-anchor": "end", class: "fc-chart-label" }, `${tick}°`));
  }
  let start = 0;
  while (start < values.length) {
    if (!Number.isFinite(values[start].mean)) { start++; continue; }
    let end = start;
    while (end + 1 < values.length && Number.isFinite(values[end + 1].mean)) end++;
    const ids = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    const upper = ids.map(i => `${x(i)},${y(values[i].high)}`).join(" L");
    const lower = [...ids].reverse().map(i => `${x(i)},${y(values[i].low)}`).join(" L");
    svg.append(node("path", { d: `M${upper} L${lower} Z`, class: "fc-chart-band" }));
    svg.append(node("path", { d: `M${ids.map(i => `${x(i)},${y(values[i].mean)}`).join(" L")}`, class: "fc-chart-line" }));
    start = end + 1;
  }
  svg.append(node("line", { x1: x(selected), x2: x(selected), y1: top, y2: bottom, class: "fc-chart-cursor" }));
  if (Number.isFinite(values[selected]?.mean)) svg.append(node("circle", { cx: x(selected), cy: y(values[selected].mean), r: 4.5, class: "fc-chart-point" }));
  days.forEach((d, i) => {
    if ((i % (width < 450 ? 4 : 2) === 0 && i < days.length - 2) || i === days.length - 1) svg.append(node("text", { x: x(i), y: 176, "text-anchor": "middle", class: "fc-chart-label" }, d.date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })));
    const target = node("rect", { x: x(i) - 18, y: top, width: 36, height: bottom - top, fill: "transparent", class: "fc-chart-target", role: "button", tabindex: 0, "aria-label": `Show ${d.date.toISOString().slice(0, 10)}` });
    target.addEventListener("click", () => choose(i));
    target.addEventListener("keydown", e => { const k = (e as KeyboardEvent).key; if (k === "Enter" || k === " ") { e.preventDefault(); choose(i); } });
    svg.append(target);
  });
  container.replaceChildren(svg);
}
