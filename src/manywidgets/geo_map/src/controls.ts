// The built-in layer panel (top-right of the map). Vanilla DOM; every change is
// reported through `onChange(layerId, patch)` and lands in the widget's
// `layer_state` trait, so it works identically live and under static export.

import { COLORMAP_NAMES, colormapGradient } from "./colormaps";
import { activeName, bandNames, effectiveRange, isComposite, type GridSpec } from "./grid";
import { isVisible, layerOpacity, type LayerSpec, type LayerState, type LayerStates } from "./layers";

export interface ControlsHandle {
  rebuild(specs: LayerSpec[], states: LayerStates): void;
  update(specs: LayerSpec[], states: LayerStates): void;
  dispose(): void;
}

type OnChange = (layerId: string, patch: LayerState) => void;

export function buildControls(container: HTMLElement, specs: LayerSpec[], states: LayerStates, onChange: OnChange): ControlsHandle {
  const panel = document.createElement("div");
  panel.className = "manywidgets-geomap__panel";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "manywidgets-geomap__panel-toggle";
  toggle.title = "Layers";
  toggle.textContent = "Layers";
  const body = document.createElement("div");
  body.className = "manywidgets-geomap__panel-body";
  panel.appendChild(toggle);
  panel.appendChild(body);
  container.appendChild(panel);
  toggle.addEventListener("click", () => panel.classList.toggle("is-collapsed"));

  // Live DOM references per layer, so `update` can refresh without rebuilding
  // (rebuilding mid-drag would steal focus from the slider).
  const rows = new Map<string, { visible: HTMLInputElement; refresh: (spec: LayerSpec, st: LayerState) => void }>();

  function rebuild(specs: LayerSpec[], states: LayerStates): void {
    body.replaceChildren();
    rows.clear();
    for (const spec of [...specs].reverse()) {
      // Reverse so the panel reads top-to-bottom like the map stack.
      const st = states[spec.id] ?? {};
      const row = document.createElement("div");
      row.className = "manywidgets-geomap__layer";
      const head = document.createElement("label");
      head.className = "manywidgets-geomap__layer-head";
      const visible = document.createElement("input");
      visible.type = "checkbox";
      visible.checked = isVisible(spec, st);
      visible.addEventListener("change", () => onChange(spec.id, { visible: visible.checked }));
      const name = document.createElement("span");
      name.textContent = spec.label ?? spec.id;
      head.appendChild(visible);
      head.appendChild(name);
      row.appendChild(head);

      let refresh: (spec: LayerSpec, st: LayerState) => void = () => {};
      if (spec.type === "grid") refresh = gridControls(row, spec, st, onChange);
      else if (spec.type === "xyz") refresh = opacityControl(row, spec, st, onChange);
      rows.set(spec.id, { visible, refresh });
      body.appendChild(row);
    }
    panel.style.display = specs.length ? "" : "none";
  }

  function update(specs: LayerSpec[], states: LayerStates): void {
    for (const spec of specs) {
      const r = rows.get(spec.id);
      if (!r) continue;
      const st = states[spec.id] ?? {};
      r.visible.checked = isVisible(spec, st);
      r.refresh(spec, st);
    }
  }

  rebuild(specs, states);
  return {
    rebuild,
    update,
    dispose: () => panel.remove(),
  };
}

function slider(label: string, min: number, max: number, step: number, value: number, onInput: (v: number) => void): { el: HTMLElement; input: HTMLInputElement; out: HTMLElement } {
  const el = document.createElement("div");
  el.className = "manywidgets-geomap__field";
  const lab = document.createElement("span");
  lab.className = "manywidgets-geomap__field-label";
  lab.textContent = label;
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  const out = document.createElement("span");
  out.className = "manywidgets-geomap__field-value";
  out.textContent = fmt(value);
  input.addEventListener("input", () => {
    out.textContent = fmt(Number(input.value));
    onInput(Number(input.value));
  });
  el.appendChild(lab);
  el.appendChild(input);
  el.appendChild(out);
  return { el, input, out };
}

function fmt(v: number): string {
  return Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);
}

function opacityControl(row: HTMLElement, spec: LayerSpec, st: LayerState, onChange: OnChange): (spec: LayerSpec, st: LayerState) => void {
  const s = slider("Opacity", 0, 1, 0.05, layerOpacity(spec, st), (v) => onChange(spec.id, { opacity: v }));
  row.appendChild(s.el);
  return (spec2, st2) => {
    s.input.value = String(layerOpacity(spec2, st2));
    s.out.textContent = fmt(layerOpacity(spec2, st2));
  };
}

function gridControls(row: HTMLElement, spec: GridSpec, st: LayerState, onChange: OnChange): (spec: LayerSpec, st: LayerState) => void {
  const names = bandNames(spec);
  const compNames = Object.keys(spec.composites ?? {});

  // Band / composite selector
  const bandField = document.createElement("div");
  bandField.className = "manywidgets-geomap__field";
  const bandLab = document.createElement("span");
  bandLab.className = "manywidgets-geomap__field-label";
  bandLab.textContent = "Show";
  const bandSel = document.createElement("select");
  for (const n of [...names, ...compNames]) {
    const o = document.createElement("option");
    o.value = n;
    o.textContent = n;
    bandSel.appendChild(o);
  }
  bandField.appendChild(bandLab);
  bandField.appendChild(bandSel);
  row.appendChild(bandField);

  // Stretch range: two sliders over the band's full quantized span.
  const span = (name: string): [number, number] => {
    const b = spec.bands[name];
    return [b.scale + b.offset, 255 * b.scale + b.offset];
  };
  const unitOf = (name: string): string => spec.bands[name]?.unit ?? "";
  let cur = activeName(spec, st);
  let [lo, hi] = isComposite(spec, cur) ? [0, 1] : effectiveRange(spec, st, cur);
  const full = isComposite(spec, cur) ? [0, 1] : span(cur);
  const step = (full[1] - full[0]) / 254;
  const minS = slider("Min", full[0], full[1], step, lo, (v) => {
    lo = Math.min(v, hi - step);
    minS.input.value = String(lo);
    onChange(spec.id, { range: [lo, hi] });
  });
  const maxS = slider("Max", full[0], full[1], step, hi, (v) => {
    hi = Math.max(v, lo + step);
    maxS.input.value = String(hi);
    onChange(spec.id, { range: [lo, hi] });
  });
  row.appendChild(minS.el);
  row.appendChild(maxS.el);

  // Colormap + colorbar
  const cmField = document.createElement("div");
  cmField.className = "manywidgets-geomap__field";
  const cmLab = document.createElement("span");
  cmLab.className = "manywidgets-geomap__field-label";
  cmLab.textContent = "Colors";
  const cmSel = document.createElement("select");
  for (const n of COLORMAP_NAMES) {
    const o = document.createElement("option");
    o.value = n;
    o.textContent = n;
    cmSel.appendChild(o);
  }
  cmField.appendChild(cmLab);
  cmField.appendChild(cmSel);
  row.appendChild(cmField);
  const bar = document.createElement("div");
  bar.className = "manywidgets-geomap__colorbar";
  const barLo = document.createElement("span");
  const barHi = document.createElement("span");
  const barSwatch = document.createElement("div");
  barSwatch.className = "manywidgets-geomap__colorbar-swatch";
  bar.appendChild(barLo);
  bar.appendChild(barSwatch);
  bar.appendChild(barHi);
  row.appendChild(bar);

  const op = slider("Opacity", 0, 1, 0.05, layerOpacity(spec, st), (v) => onChange(spec.id, { opacity: v }));
  row.appendChild(op.el);

  function refresh(spec2: LayerSpec, st2: LayerState): void {
    const g = spec2 as GridSpec;
    cur = activeName(g, st2);
    bandSel.value = cur;
    const comp = isComposite(g, cur);
    const cm = st2.colormap ?? g.colormap ?? "gray";
    cmSel.value = cm;
    cmSel.disabled = comp;
    minS.el.style.display = maxS.el.style.display = comp ? "none" : "";
    bar.style.display = comp ? "none" : "";
    if (!comp) {
      const f = span(cur);
      const stp = (f[1] - f[0]) / 254;
      for (const s of [minS, maxS]) {
        s.input.min = String(f[0]);
        s.input.max = String(f[1]);
        s.input.step = String(stp);
      }
      [lo, hi] = effectiveRange(g, st2, cur);
      minS.input.value = String(lo);
      maxS.input.value = String(hi);
      minS.out.textContent = fmt(lo);
      maxS.out.textContent = fmt(hi);
      barSwatch.style.background = colormapGradient(cm);
      const u = unitOf(cur);
      barLo.textContent = `${fmt(lo)}${u ? " " + u : ""}`;
      barHi.textContent = `${fmt(hi)}${u ? " " + u : ""}`;
    }
    op.input.value = String(layerOpacity(g, st2));
    op.out.textContent = fmt(layerOpacity(g, st2));
  }

  bandSel.addEventListener("change", () => {
    const name = bandSel.value;
    // Switching band resets the stretch to that band's default.
    const patch: LayerState = { active: name };
    if (!isComposite(spec, name)) patch.range = effectiveRange(spec, { active: name }, name);
    else patch.range = undefined;
    onChange(spec.id, patch);
  });
  cmSel.addEventListener("change", () => onChange(spec.id, { colormap: cmSel.value }));

  refresh(spec, st);
  return refresh;
}
