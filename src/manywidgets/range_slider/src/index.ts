import type { RenderProps } from "@anywidget/types";
import { applyThemeVars, onChanges, safeSaveChanges } from "@manywidgets/core";

interface RangeSliderModel {
  low: number;
  high: number;
  min: number;
  max: number;
  step: number;
  label: string;
}

function render({ model, el }: RenderProps<RangeSliderModel>): void {
  const container = document.createElement("div");
  container.className = "manywidgets-range";

  const header = document.createElement("div");
  header.className = "manywidgets-range__header";
  const label = document.createElement("span");
  label.className = "manywidgets-range__label";
  label.textContent = model.get("label");
  const readout = document.createElement("span");
  readout.className = "manywidgets-range__value";
  header.appendChild(label);
  header.appendChild(readout);

  const lowInput = document.createElement("input");
  lowInput.type = "range";
  lowInput.className = "manywidgets-range__input manywidgets-range__input--low";
  const highInput = document.createElement("input");
  highInput.type = "range";
  highInput.className = "manywidgets-range__input manywidgets-range__input--high";

  const inputs = document.createElement("div");
  inputs.className = "manywidgets-range__inputs";
  inputs.appendChild(lowInput);
  inputs.appendChild(highInput);

  container.appendChild(header);
  container.appendChild(inputs);
  el.appendChild(container);
  applyThemeVars(container, model);

  function syncBounds(): void {
    for (const input of [lowInput, highInput]) {
      input.min = String(model.get("min"));
      input.max = String(model.get("max"));
      input.step = String(model.get("step"));
    }
  }

  function syncValues(): void {
    const low = model.get("low");
    const high = model.get("high");
    lowInput.value = String(low);
    highInput.value = String(high);
    readout.textContent = `${low} – ${high}`;
  }

  syncBounds();
  syncValues();

  lowInput.addEventListener("input", () => {
    let low = Number(lowInput.value);
    const high = model.get("high");
    if (low > high) low = high; // keep low <= high
    lowInput.value = String(low);
    model.set("low", low);
    safeSaveChanges(model);
    syncValues();
  });

  highInput.addEventListener("input", () => {
    let high = Number(highInput.value);
    const low = model.get("low");
    if (high < low) high = low; // keep high >= low
    highInput.value = String(high);
    model.set("high", high);
    safeSaveChanges(model);
    syncValues();
  });

  onChanges(model, ["low", "high"], syncValues);
  onChanges(model, ["min", "max", "step"], syncBounds);
  model.on("change:label", () => {
    label.textContent = model.get("label");
  });
}

export default { render };
