import type { RenderProps } from "@anywidget/types";
import { asNumber, renderChild, resolveModel, type RenderArgs } from "@manywidgets/core";

interface GridModel {
  children: string[];
  columns: number;
  gap: string;
  template_areas: string;
}

async function placementFor(
  args: RenderArgs,
  ref: string,
): Promise<{ colSpan: number; rowSpan: number; area: string }> {
  const handle = await resolveModel(args.model, ref).catch(() => null);
  return {
    colSpan: Math.max(1, asNumber(handle?.get("col_span"), 1)),
    rowSpan: Math.max(1, asNumber(handle?.get("row_span"), 1)),
    area: (handle?.get("area") as string) || "",
  };
}

async function render(args: RenderProps<GridModel>): Promise<() => void> {
  const { model, el } = args;
  const container = document.createElement("div");
  container.className = "manywidgets-grid";
  el.appendChild(container);

  let cleanups: Array<() => void> = [];

  function applyStyle(): void {
    const columns = Math.max(1, Number(model.get("columns")) || 1);
    const areas = model.get("template_areas") || "";
    container.style.display = "grid";
    container.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    container.style.gridTemplateAreas = areas || "";
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
      const { colSpan, rowSpan, area } = await placementFor(args as unknown as RenderArgs, ref);
      if (area) {
        cell.style.gridArea = area;
      } else {
        if (colSpan > 1) cell.style.gridColumn = `span ${colSpan}`;
        if (rowSpan > 1) cell.style.gridRow = `span ${rowSpan}`;
      }
      container.appendChild(cell);
      cleanups.push(await renderChild(args as unknown as RenderArgs, ref, cell));
    }
  }

  applyStyle();
  await build();

  model.on("change:columns", applyStyle);
  model.on("change:gap", applyStyle);
  model.on("change:template_areas", applyStyle);
  model.on("change:children", () => {
    void build();
  });

  return () => cleanups.forEach((d) => d());
}

export default { render };
