import { afterEach, describe, expect, it } from "vitest";
import { fakeHost, fakeModel, installHostRegistry, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

describe("Grid", () => {
  afterEach(() => {
    (globalThis as Record<string, unknown>).__myst_anywidget_hosts &&
      delete (globalThis as Record<string, unknown>).__myst_anywidget_hosts;
  });

  it("applies col_span/row_span from a GridItem child to its cell", async () => {
    const host = fakeHost();
    const el = mountEl();
    const item = fakeModel(
      { widget_id: "item_1", col_span: 2, row_span: 2 },
      { model_id: "item_1" },
    );
    const uninstall = installHostRegistry([item]);
    const model = fakeModel({ children: ["IPY_MODEL_item_1"], columns: 3, gap: "8px" });
    await widget.render({ model, el, host } as never);

    const cell = el.querySelector<HTMLElement>(".manywidgets-grid__cell")!;
    expect(cell.style.gridColumn).toBe("span 2");
    expect(cell.style.gridRow).toBe("span 2");
    uninstall();
  });

  it("places a GridItem child by named area, ignoring spans", async () => {
    const host = fakeHost();
    const el = mountEl();
    const item = fakeModel(
      { widget_id: "item_1", col_span: 2, area: "main" },
      { model_id: "item_1" },
    );
    const uninstall = installHostRegistry([item]);
    const model = fakeModel({
      children: ["IPY_MODEL_item_1"],
      columns: 2,
      gap: "8px",
      template_areas: '"header header" "sidebar main"',
    });
    await widget.render({ model, el, host } as never);

    expect(el.querySelector<HTMLElement>(".manywidgets-grid")!.style.gridTemplateAreas).toBe(
      '"header header" "sidebar main"',
    );
    const cell = el.querySelector<HTMLElement>(".manywidgets-grid__cell")!;
    expect(cell.style.gridArea).toBe("main");
    expect(cell.style.gridColumn).toBe("");
    uninstall();
  });

  it("defaults a bare (non-GridItem) child to a 1x1 cell", async () => {
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel({ children: ["IPY_MODEL_a"], columns: 2, gap: "8px" });
    await widget.render({ model, el, host } as never);

    const cell = el.querySelector<HTMLElement>(".manywidgets-grid__cell")!;
    expect(cell.style.gridColumn).toBe("");
    expect(cell.style.gridRow).toBe("");
  });

  it("mounts children in a CSS grid with the given column count", async () => {
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel({
      children: ["IPY_MODEL_a", "IPY_MODEL_b", "IPY_MODEL_c"],
      columns: 3,
      gap: "12px",
    });
    await widget.render({ model, el, host } as never);

    const container = el.querySelector<HTMLElement>(".manywidgets-grid")!;
    expect(container.style.display).toBe("grid");
    expect(container.style.gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
    expect(container.style.gap).toBe("12px");
    expect(host.mounted).toEqual(["IPY_MODEL_a", "IPY_MODEL_b", "IPY_MODEL_c"]);
    expect(container.querySelectorAll(".manywidgets-grid__cell").length).toBe(3);
  });

  it("updates columns reactively", async () => {
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel({ children: [], columns: 2, gap: "8px" });
    await widget.render({ model, el, host } as never);
    model.set("columns", 4);
    expect(el.querySelector<HTMLElement>(".manywidgets-grid")!.style.gridTemplateColumns).toBe(
      "repeat(4, minmax(0, 1fr))",
    );
  });

  it("passes a string columns value straight through as track sizes", async () => {
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel({ children: [], columns: "200px 1fr", gap: "8px" });
    await widget.render({ model, el, host } as never);

    expect(el.querySelector<HTMLElement>(".manywidgets-grid")!.style.gridTemplateColumns).toBe(
      "200px 1fr",
    );
  });
});
