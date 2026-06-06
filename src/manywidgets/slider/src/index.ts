import type { RenderProps } from "@anywidget/types";
import { onChanges, safeSaveChanges } from "@manywidgets/core";

interface SliderModel {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
}

function render({ model, el }: RenderProps<SliderModel>): void {
  const container = document.createElement("div");
  container.className = "manywidgets-slider";

  const header = document.createElement("div");
  header.className = "manywidgets-slider__header";

  const label = document.createElement("span");
  label.className = "manywidgets-slider__label";
  label.textContent = model.get("label");

  const readout = document.createElement("span");
  readout.className = "manywidgets-slider__value";

  header.appendChild(label);
  header.appendChild(readout);

  const input = document.createElement("input");
  input.type = "range";
  input.className = "manywidgets-slider__input";

  container.appendChild(header);
  container.appendChild(input);
  el.appendChild(container);

  function syncBounds(): void {
    input.min = String(model.get("min"));
    input.max = String(model.get("max"));
    input.step = String(model.get("step"));
  }

  function syncValue(): void {
    const v = model.get("value");
    input.value = String(v);
    readout.textContent = String(v);
  }

  syncBounds();
  syncValue();

  input.addEventListener("input", () => {
    const next = Number(input.value);
    model.set("value", next);
    safeSaveChanges(model);
    readout.textContent = String(next);
  });

  model.on("change:value", syncValue);
  onChanges(model, ["min", "max", "step"], syncBounds);
  model.on("change:label", () => {
    label.textContent = model.get("label");
  });
}

export default { render };
