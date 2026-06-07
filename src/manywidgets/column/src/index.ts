import type { RenderProps } from "@anywidget/types";
import { applyThemeVars, renderChild, type RenderArgs } from "@manywidgets/core";

interface ColumnModel {
  children: string[];
  gap: string;
  align: string;
}

async function render(args: RenderProps<ColumnModel>): Promise<() => void> {
  const { model, el } = args;
  const container = document.createElement("div");
  container.className = "manywidgets-column";
  el.appendChild(container);
  applyThemeVars(container, model);

  let cleanups: Array<() => void> = [];

  function applyStyle(): void {
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = model.get("gap") || "8px";
    container.style.alignItems = model.get("align") || "stretch";
  }

  async function build(): Promise<void> {
    cleanups.forEach((d) => d());
    cleanups = [];
    container.replaceChildren();
    const refs = model.get("children") || [];
    for (const ref of refs) {
      const cell = document.createElement("div");
      cell.className = "manywidgets-column__cell";
      container.appendChild(cell);
      cleanups.push(await renderChild(args as unknown as RenderArgs, ref, cell));
    }
  }

  applyStyle();
  await build();

  model.on("change:gap", applyStyle);
  model.on("change:align", applyStyle);
  model.on("change:children", () => {
    void build();
  });

  return () => cleanups.forEach((d) => d());
}

export default { render };
