import type { RenderProps } from "@anywidget/types";
import { applyThemeVars, asNumber } from "@manywidgets/core";

interface NumberDisplayModel {
  value: number;
  format: string;
  duration: number;
  label: string;
}

function defaultFormat(n: number): string {
  return Number.isInteger(n) ? String(n) : String(+n.toFixed(2));
}

/** Format the field between braces (e.g. ":,.0f", ":.2f", ":,", or "" for {}). */
function formatField(n: number, field: string): string {
  const m = field.match(/^:(,)?(?:\.(\d+))?f?$/);
  if (!m) return defaultFormat(n);
  const grouping = !!m[1];
  const decimals = m[2] !== undefined ? parseInt(m[2], 10) : undefined;
  if (decimals !== undefined) {
    return grouping
      ? n.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : n.toFixed(decimals);
  }
  return grouping ? Math.round(n).toLocaleString("en-US") : String(n);
}

/** Apply a small Python-style format spec to a number. Supports a literal
 * prefix and/or suffix around a single `{...}` field, e.g. "${:,.0f}" → "$4,000"
 * or "{:.1f}%" → "99.5%". */
export function formatNumber(n: number, spec: string): string {
  if (!spec) return defaultFormat(n);
  const m = spec.match(/^([^{}]*)\{([^{}]*)\}([^{}]*)$/);
  if (!m) return spec; // no single {...} field — render the spec literally
  const [, prefix, field, suffix] = m;
  return prefix + formatField(n, field) + suffix;
}

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

function render({ model, el }: RenderProps<NumberDisplayModel>): void {
  const container = document.createElement("div");
  container.className = "manywidgets-numberdisplay";

  const labelEl = document.createElement("div");
  labelEl.className = "manywidgets-numberdisplay__label";
  labelEl.textContent = model.get("label");

  const valueEl = document.createElement("div");
  valueEl.className = "manywidgets-numberdisplay__value";

  container.appendChild(labelEl);
  container.appendChild(valueEl);
  el.appendChild(container);
  applyThemeVars(container, model);

  let displayed = 0;
  const setText = (n: number) => {
    valueEl.textContent = formatNumber(n, model.get("format"));
  };

  function animateTo(target: number): void {
    const duration = asNumber(model.get("duration"));
    const start = displayed;
    if (duration <= 0 || typeof requestAnimationFrame !== "function" || start === target) {
      displayed = target;
      setText(target);
      return;
    }
    const t0 =
      typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();
    const frame = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      displayed = start + (target - start) * easeOut(p);
      setText(displayed);
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        displayed = target;
        setText(target);
      }
    };
    requestAnimationFrame(frame);
  }

  animateTo(asNumber(model.get("value")));

  model.on("change:value", () => animateTo(asNumber(model.get("value"))));
  model.on("change:format", () => setText(displayed));
  model.on("change:label", () => {
    labelEl.textContent = model.get("label");
  });
}

export default { render };
