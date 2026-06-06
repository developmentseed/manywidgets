import type { RenderProps } from "@anywidget/types";
import { safeSaveChanges } from "@manywidgets/core";

interface ToggleModel {
  value: boolean;
  label: string;
}

function render({ model, el }: RenderProps<ToggleModel>): void {
  const container = document.createElement("label");
  container.className = "manywidgets-toggle";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "manywidgets-toggle__input";
  input.checked = !!model.get("value");

  const track = document.createElement("span");
  track.className = "manywidgets-toggle__track";

  const label = document.createElement("span");
  label.className = "manywidgets-toggle__label";
  label.textContent = model.get("label");

  container.appendChild(input);
  container.appendChild(track);
  container.appendChild(label);
  el.appendChild(container);

  input.addEventListener("change", () => {
    model.set("value", input.checked);
    safeSaveChanges(model);
  });

  model.on("change:value", () => {
    input.checked = !!model.get("value");
  });
  model.on("change:label", () => {
    label.textContent = model.get("label");
  });
}

export default { render };
