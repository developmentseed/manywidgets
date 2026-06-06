import { describe, expect, it } from "vitest";
import { fakeHost, fakeModel, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

describe("Column", () => {
  it("mounts children in a flex column", async () => {
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel({ children: ["IPY_MODEL_a", "IPY_MODEL_b"], gap: "12px", align: "stretch" });
    await widget.render({ model, el, host } as never);

    const container = el.querySelector<HTMLElement>(".manywidgets-column")!;
    expect(container.style.display).toBe("flex");
    expect(container.style.flexDirection).toBe("column");
    expect(container.style.gap).toBe("12px");
    expect(host.mounted).toEqual(["IPY_MODEL_a", "IPY_MODEL_b"]);
    expect(container.querySelectorAll(".manywidgets-column__cell").length).toBe(2);
  });

  it("disposes children on cleanup", async () => {
    const host = fakeHost();
    const model = fakeModel({ children: ["IPY_MODEL_a"], gap: "8px", align: "stretch" });
    const dispose = await widget.render({ model, el: mountEl(), host } as never);
    dispose();
    expect(host.disposed).toBe(1);
  });
});
