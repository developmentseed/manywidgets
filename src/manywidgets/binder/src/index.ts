import type { RenderProps } from "@anywidget/types";
import { asNumber, resolveModel, type ModelHandle } from "@manywidgets/core";

interface BinderModel {
  source_widget_id: string;
  source_field: string;
  target_widget_id: string;
  target_field: string;
  multiplier: number;
  offset: number;
  label: string;
}

const POLL_MS = 100;
const MAX_RUN_MS = 30 * 60 * 1000;

async function render({ model, el }: RenderProps<BinderModel>): Promise<void> {
  const sourceId = model.get("source_widget_id");
  const sourceField = model.get("source_field") || "value";
  const targetId = model.get("target_widget_id");
  const targetField = model.get("target_field");
  const multiplier = model.get("multiplier");
  const offset = model.get("offset");
  const label =
    model.get("label") ||
    `${sourceId}.${sourceField} → ${targetId}.${targetField}`;

  el.className = "manywidgets-binder";
  el.style.cssText =
    "font:12px/1.4 ui-monospace,SFMono-Regular,monospace;color:#24292e;" +
    "padding:6px 10px;border:1px solid #e1e4e8;border-radius:6px;" +
    "background:#f6f8fa;max-width:fit-content;margin:6px 0;";
  const status = document.createElement("div");
  status.textContent = `🔗 binder: connecting…  (${label})`;
  el.appendChild(status);

  let source: ModelHandle;
  let target: ModelHandle;
  try {
    [source, target] = await Promise.all([
      resolveModel(model, sourceId),
      resolveModel(model, targetId),
    ]);
  } catch (err) {
    status.textContent = `❌ binder failed: ${(err as Error).message}`;
    console.error("[manywidgets:binder] resolve failed", err, { sourceId, targetId });
    return;
  }

  let lastKey: string | null = null;
  const apply = (): void => {
    const raw = source.get(sourceField);
    const next = typeof raw === "number" ? asNumber(raw) * multiplier + offset : raw;
    const key = JSON.stringify(next ?? null);
    if (key === lastKey) return;
    lastKey = key;
    target.setByPath(targetField, next);
    target.save();
  };

  // Live kernel: change events fire on the canonical source model.
  source.on(sourceField, apply);
  // Apply once so the target reflects the current source state immediately.
  apply();
  status.textContent = `✅ ${label}`;

  // Static export (and a safety net live): proxies may not emit change events
  // and the target proxy can register late, so poll and re-apply on change.
  const stopAt = Date.now() + MAX_RUN_MS;
  const loop = (): void => {
    try {
      apply();
    } catch (err) {
      console.warn("[manywidgets:binder] tick error", err);
    }
    if (Date.now() < stopAt) setTimeout(loop, POLL_MS);
  };
  setTimeout(loop, POLL_MS);
}

export default { render };
