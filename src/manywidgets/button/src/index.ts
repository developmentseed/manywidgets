import type { RenderProps } from "@anywidget/types";
import { asNumber, safeSaveChanges } from "@manywidgets/core";

interface ButtonModel {
  clicks: number;
  label: string;
}

function render({ model, el }: RenderProps<ButtonModel>): void {
  const button = document.createElement("button");
  button.className = "manywidgets-button";
  button.type = "button";
  button.textContent = model.get("label");

  el.appendChild(button);

  button.addEventListener("click", () => {
    model.set("clicks", asNumber(model.get("clicks")) + 1);
    safeSaveChanges(model);
  });

  model.on("change:label", () => {
    button.textContent = model.get("label");
  });
}

export default { render };
