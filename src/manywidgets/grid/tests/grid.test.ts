import { describe, expect, it } from "vitest";
import { fakeHost, fakeModel, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

describe("Grid", () => {
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
});
