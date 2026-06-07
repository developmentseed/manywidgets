import type { RenderProps } from "@anywidget/types";
import { applyThemeVars, asNumber, onChanges, safeSaveChanges } from "@manywidgets/core";

interface NumberInputModel {
  value: number;
  min: number | null;
  max: number | null;
  step: number;
  label: string;
}

function render({ model, el }: RenderProps<NumberInputModel>): void {
  const container = document.createElement("div");
  container.className = "manywidgets-number";

  const label = document.createElement("label");
  label.className = "manywidgets-number__label";
  label.textContent = model.get("label");

  const input = document.createElement("input");
  input.type = "number";
  input.className = "manywidgets-number__input";

  container.appendChild(label);
  container.appendChild(input);
  el.appendChild(container);
  applyThemeVars(container, model);

  function syncBounds(): void {
    const min = model.get("min");
    const max = model.get("max");
    input.min = min == null ? "" : String(min);
    input.max = max == null ? "" : String(max);
    input.step = String(model.get("step"));
  }
  function syncValue(): void {
    input.value = String(model.get("value"));
  }

  syncBounds();
  syncValue();

  input.addEventListener("input", () => {
    if (input.value === "") return;
    model.set("value", asNumber(input.value));
    safeSaveChanges(model);
  });

  model.on("change:value", syncValue);
  onChanges(model, ["min", "max", "step"], syncBounds);
  model.on("change:label", () => {
    label.textContent = model.get("label");
  });
}

export default { render };
