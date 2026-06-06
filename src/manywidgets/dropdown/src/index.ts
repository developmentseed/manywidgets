import type { RenderProps } from "@anywidget/types";
import { safeSaveChanges } from "@manywidgets/core";

type Option = string | number | [string, unknown];

interface DropdownModel {
  options: Option[];
  value: unknown;
  label: string;
}

function optionLabel(opt: Option): string {
  return Array.isArray(opt) ? String(opt[0]) : String(opt);
}
function optionValue(opt: Option): unknown {
  return Array.isArray(opt) ? opt[1] : opt;
}

function render({ model, el }: RenderProps<DropdownModel>): void {
  const container = document.createElement("div");
  container.className = "manywidgets-dropdown";

  const label = document.createElement("label");
  label.className = "manywidgets-dropdown__label";
  label.textContent = model.get("label");

  const select = document.createElement("select");
  select.className = "manywidgets-dropdown__select";

  container.appendChild(label);
  container.appendChild(select);
  el.appendChild(container);

  // We index options so the <option> value attribute (always a string) maps back
  // to the original typed value.
  let current: Option[] = [];

  function rebuild(): void {
    current = model.get("options") || [];
    select.replaceChildren();
    current.forEach((opt, i) => {
      const o = document.createElement("option");
      o.value = String(i);
      o.textContent = optionLabel(opt);
      select.appendChild(o);
    });
    syncValue();
  }

  function syncValue(): void {
    const value = model.get("value");
    const idx = current.findIndex((opt) => optionValue(opt) === value);
    if (idx >= 0) select.value = String(idx);
  }

  rebuild();

  select.addEventListener("change", () => {
    const opt = current[Number(select.value)];
    if (opt === undefined) return;
    model.set("value", optionValue(opt));
    safeSaveChanges(model);
  });

  model.on("change:options", rebuild);
  model.on("change:value", syncValue);
  model.on("change:label", () => {
    label.textContent = model.get("label");
  });
}

export default { render };
