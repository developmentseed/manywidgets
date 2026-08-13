import { describe, expect, it } from "vitest";
import { fakeHost, fakeModel, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

describe("GridItem", () => {
  it("mounts its child with no extra wrapper markup", async () => {
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel({ child: "IPY_MODEL_c", col_span: 2, row_span: 2, area: "" });
    await widget.render({ model, el, host } as never);

    expect(el.className).toBe("manywidgets-grid-item");
    expect(host.mounted).toEqual(["IPY_MODEL_c"]);
    expect(el.getAttribute("data-child")).toBe("IPY_MODEL_c");
  });

  it("no-ops when there is no child", async () => {
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel({ child: null, col_span: 1, row_span: 1, area: "" });
    await widget.render({ model, el, host } as never);

    expect(host.mounted).toEqual([]);
  });
});
