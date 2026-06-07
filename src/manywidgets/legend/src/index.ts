import type { RenderProps } from "@anywidget/types";
import { onChanges } from "@manywidgets/core";

type Color = string | number[];
type Entry = [Color, string];

interface LegendModel {
  entries: Entry[];
  title: string;
}

function toCss(color: Color): string {
  if (typeof color === "string") return color;
  if (Array.isArray(color)) {
    const [r, g, b, a] = color;
    if (color.length >= 4) return `rgba(${r}, ${g}, ${b}, ${(a as number) / 255})`;
    return `rgb(${r}, ${g}, ${b})`;
  }
  return "transparent";
}

function render({ model, el }: RenderProps<LegendModel>): void {
  const container = document.createElement("div");
  container.className = "manywidgets-legend";

  const titleEl = document.createElement("div");
  titleEl.className = "manywidgets-legend__title";

  const list = document.createElement("ul");
  list.className = "manywidgets-legend__list";

  container.appendChild(titleEl);
  container.appendChild(list);
  el.appendChild(container);

  function update(): void {
    const title = model.get("title") || "";
    titleEl.textContent = title;
    titleEl.style.display = title ? "" : "none";

    list.replaceChildren();
    for (const entry of model.get("entries") || []) {
      const [color, label] = entry;
      const li = document.createElement("li");
      li.className = "manywidgets-legend__item";
      const swatch = document.createElement("span");
      swatch.className = "manywidgets-legend__swatch";
      swatch.style.background = toCss(color);
      const text = document.createElement("span");
      text.className = "manywidgets-legend__label";
      text.textContent = String(label);
      li.appendChild(swatch);
      li.appendChild(text);
      list.appendChild(li);
    }
  }

  update();
  onChanges(model, ["entries", "title"], update);
}

export default { render };
