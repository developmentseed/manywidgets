import type { RenderProps } from "@anywidget/types";
import { applyThemeVars, asNumber, idOf, type ModelHandle, resolveModel } from "@manywidgets/core";

interface FilterBinderModel {
  source: unknown;
  layer: unknown;
  low_field: string;
  high_field: string;
  filter_field: string;
  label: string;
}

const POLL_MS = 100;
const MAX_RUN_MS = 30 * 60 * 1000;

async function render({ model, el }: RenderProps<FilterBinderModel>): Promise<void> {
  el.className = "manywidgets-filterbinder";
  el.style.cssText =
    "font:12px/1.4 ui-monospace,SFMono-Regular,monospace;color:#24292e;" +
    "padding:6px 10px;border:1px solid #e1e4e8;border-radius:6px;" +
    "background:#f6f8fa;max-width:fit-content;margin:6px 0;";
  const status = document.createElement("div");
  el.appendChild(status);
  applyThemeVars(el, model);

  const lowField = model.get("low_field") || "low";
  const highField = model.get("high_field") || "high";
  const filterField = model.get("filter_field") || "filter_range";
  const label = model.get("label") || `${lowField}/${highField} → ${filterField}`;
  status.textContent = `🔗 filter: connecting…  (${label})`;

  let source: ModelHandle;
  let layer: ModelHandle;
  try {
    [source, layer] = await Promise.all([
      resolveModel(model, idOf(model.get("source"))),
      resolveModel(model, idOf(model.get("layer"))),
    ]);
  } catch (err) {
    status.textContent = `❌ filter: ${(err as Error).message}`;
    return;
  }

  let lastKey = "";
  const apply = (): void => {
    const low = asNumber(source.get(lowField));
    const high = asNumber(source.get(highField));
    const key = `${low}:${high}:${layer.models.length}`;
    if (key === lastKey) return;
    lastKey = key;
    layer.setByPath(filterField, [low, high]);
    layer.save();
    status.textContent = `✅ ${label}: [${low}, ${high}]`;
  };

  source.on(lowField, apply);
  source.on(highField, apply);
  apply();

  const stopAt = Date.now() + MAX_RUN_MS;
  const loop = (): void => {
    try {
      apply();
    } catch (err) {
      console.warn("[manywidgets:filter-binder] tick error", err);
    }
    if (Date.now() < stopAt) setTimeout(loop, POLL_MS);
  };
  setTimeout(loop, POLL_MS);
}

export default { render };
