import type { RenderProps } from "@anywidget/types";
import { asNumber } from "@manywidgets/core";

interface NumberDisplayModel {
  value: number;
  format: string;
  duration: number;
  label: string;
}

/** Apply a small Python-style format spec to a number. */
export function formatNumber(n: number, spec: string): string {
  if (!spec || spec === "{}") {
    return Number.isInteger(n) ? String(n) : String(+n.toFixed(2));
  }
  const m = spec.match(/^\{:(,)?(?:\.(\d+))?f?\}$/);
  if (!m) return spec.replace("{}", String(n));
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
