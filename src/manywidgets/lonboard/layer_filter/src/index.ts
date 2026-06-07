import type { RenderProps } from "@anywidget/types";
import { applyThemeVars, idOf, type ModelHandle, resolveModel, safeSaveChanges } from "@manywidgets/core";

type Category = string | number | [unknown, string];

interface LayerFilterModel {
  layer: unknown;
  categories: Category[];
  value: unknown[];
  label: string;
}

const POLL_MS = 100;
const MAX_RUN_MS = 30 * 60 * 1000;

const catValue = (c: Category): unknown => (Array.isArray(c) ? c[0] : c);
const catLabel = (c: Category): string => (Array.isArray(c) ? String(c[1]) : String(c));

async function render({ model, el }: RenderProps<LayerFilterModel>): Promise<void> {
  const container = document.createElement("div");
  container.className = "manywidgets-layerfilter";

  const heading = document.createElement("div");
  heading.className = "manywidgets-layerfilter__label";
  heading.textContent = model.get("label");
  container.appendChild(heading);

  const list = document.createElement("ul");
  list.className = "manywidgets-layerfilter__list";
  container.appendChild(list);
  el.appendChild(container);
  applyThemeVars(container, model);

  const categories = model.get("categories") || [];
  const enabled = new Set((model.get("value") || []).map((v) => JSON.stringify(v)));

  const boxes: Array<{ value: unknown; input: HTMLInputElement }> = [];
  for (const c of categories) {
    const value = catValue(c);
    const li = document.createElement("li");
    const lbl = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = enabled.has(JSON.stringify(value));
    const span = document.createElement("span");
    span.textContent = catLabel(c);
    lbl.append(input, span);
    li.appendChild(lbl);
    list.appendChild(li);
    boxes.push({ value, input });
    input.addEventListener("change", onToggle);
  }

  let handle: ModelHandle | null = null;
  try {
    handle = await resolveModel(model, idOf(model.get("layer")));
  } catch (err) {
    console.warn("[manywidgets:layer-filter] could not resolve layer", err);
  }

  function currentValues(): unknown[] {
    return boxes.filter((b) => b.input.checked).map((b) => b.value);
  }

  let lastKey = "";
  function apply(): void {
    if (!handle) return;
    const vals = currentValues();
    const key = `${JSON.stringify(vals)}:${handle.models.length}`;
    if (key === lastKey) return;
    lastKey = key;
    handle.set("filter_categories", vals);
    handle.save();
  }

  function onToggle(): void {
    model.set("value", currentValues());
    safeSaveChanges(model);
    apply();
  }

  apply();
  const stopAt = Date.now() + MAX_RUN_MS;
  const loop = (): void => {
    try {
      apply();
    } catch (err) {
      console.warn("[manywidgets:layer-filter] tick error", err);
    }
    if (Date.now() < stopAt) setTimeout(loop, POLL_MS);
  };
  setTimeout(loop, POLL_MS);
}

export default { render };
