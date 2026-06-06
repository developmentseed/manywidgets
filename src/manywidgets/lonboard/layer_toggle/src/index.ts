import type { RenderProps } from "@anywidget/types";
import { idOf, type ModelHandle, resolveModel, safeSaveChanges } from "@manywidgets/core";

interface LayerToggleModel {
  layer: unknown;
  value: boolean;
  label: string;
}

const POLL_MS = 100;
const MAX_RUN_MS = 30 * 60 * 1000;

async function render({ model, el }: RenderProps<LayerToggleModel>): Promise<void> {
  const container = document.createElement("label");
  container.className = "manywidgets-layertoggle";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "manywidgets-layertoggle__input";
  input.checked = !!model.get("value");

  const track = document.createElement("span");
  track.className = "manywidgets-layertoggle__track";

  const label = document.createElement("span");
  label.className = "manywidgets-layertoggle__label";
  label.textContent = model.get("label");

  container.append(input, track, label);
  el.appendChild(container);

  let handle: ModelHandle | null = null;
  try {
    handle = await resolveModel(model, idOf(model.get("layer")));
  } catch (err) {
    console.warn("[manywidgets:layer-toggle] could not resolve layer", err);
  }

  // Write only when the desired value OR the set of resolved proxies changes,
  // so polling for late-registering proxies doesn't cause a write storm.
  let lastKey = "";
  function apply(): void {
    if (!handle) return;
    const visible = !!model.get("value");
    const key = `${visible}:${handle.models.length}`;
    if (key === lastKey) return;
    lastKey = key;
    handle.set("visible", visible);
    handle.save();
  }

  input.addEventListener("change", () => {
    model.set("value", input.checked);
    safeSaveChanges(model);
    apply();
  });
  model.on("change:value", () => {
    input.checked = !!model.get("value");
    apply();
  });
  model.on("change:label", () => {
    label.textContent = model.get("label");
  });

  apply();
  const stopAt = Date.now() + MAX_RUN_MS;
  const loop = (): void => {
    try {
      apply();
    } catch (err) {
      console.warn("[manywidgets:layer-toggle] tick error", err);
    }
    if (Date.now() < stopAt) setTimeout(loop, POLL_MS);
  };
  setTimeout(loop, POLL_MS);
}

export default { render };
