import type { RenderProps } from "@anywidget/types";
import { renderChild, type RenderArgs } from "@manywidgets/core";

interface GridModel {
  children: string[];
  columns: number;
  gap: string;
}

async function render(args: RenderProps<GridModel>): Promise<() => void> {
  const { model, el } = args;
  const container = document.createElement("div");
  container.className = "manywidgets-grid";
  el.appendChild(container);

  let cleanups: Array<() => void> = [];

  function applyStyle(): void {
    const columns = Math.max(1, Number(model.get("columns")) || 1);
    container.style.display = "grid";
    container.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    container.style.gap = model.get("gap") || "8px";
  }

  async function build(): Promise<void> {
    cleanups.forEach((d) => d());
    cleanups = [];
    container.replaceChildren();
    const refs = model.get("children") || [];
    for (const ref of refs) {
      const cell = document.createElement("div");
      cell.className = "manywidgets-grid__cell";
      container.appendChild(cell);
      cleanups.push(await renderChild(args as unknown as RenderArgs, ref, cell));
    }
  }

  applyStyle();
  await build();

  model.on("change:columns", applyStyle);
  model.on("change:gap", applyStyle);
  model.on("change:children", () => {
    void build();
  });

  return () => cleanups.forEach((d) => d());
}

export default { render };
