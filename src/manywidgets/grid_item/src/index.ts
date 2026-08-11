import type { RenderProps } from "@anywidget/types";
import { renderChild, type RenderArgs } from "@manywidgets/core";

interface GridItemModel {
  child: unknown;
}

async function render(args: RenderProps<GridItemModel>): Promise<() => void> {
  const { model, el } = args;
  el.className = "manywidgets-grid-item";

  const dispose = model.get("child")
    ? await renderChild(args as unknown as RenderArgs, model.get("child") as string, el)
    : (): void => {};

  return dispose;
}

export default { render };
