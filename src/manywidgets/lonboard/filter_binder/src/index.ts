import type { RenderProps } from "@anywidget/types";
import { asNumber, idOf, type ModelHandle, resolveModel } from "@manywidgets/core";

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

  const lowField = model.get("low_field") || "low";
  const highField = model.get("high_field") || "high";
  const filterField = model.get("filter_field") || "filter_range";
  const label = model.get("label") || `${lowField}/${highField} → ${filterField}`;
  status.textContent = `🔗 filter: connecting…  (${label})`;

  // `layer` may be a single widget-ref or a list of them; resolve all of them.
  const rawLayer = model.get("layer");
  const layerRefs: unknown[] = Array.isArray(rawLayer) ? rawLayer : [rawLayer];

  let source: ModelHandle;
  let layers: ModelHandle[];
  try {
    [source, layers] = await Promise.all([
      resolveModel(model, idOf(model.get("source"))),
      Promise.all(layerRefs.map((ref) => resolveModel(model, idOf(ref)))),
    ]);
  } catch (err) {
    status.textContent = `❌ filter: ${(err as Error).message}`;
    return;
  }

  let lastKey = "";
  const apply = (): void => {
    const low = asNumber(source.get(lowField));
    const high = asNumber(source.get(highField));
    const key = `${low}:${high}:${layers.map((l) => l.models.length).join(",")}`;
    if (key === lastKey) return;
    lastKey = key;
    for (const layer of layers) {
      layer.setByPath(filterField, [low, high]);
      layer.save();
    }
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
