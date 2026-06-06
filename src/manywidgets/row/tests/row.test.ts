import { describe, expect, it } from "vitest";
import { fakeHost, fakeModel, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

describe("Row", () => {
  it("mounts each child in order into a flex row", async () => {
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel({ children: ["IPY_MODEL_a", "IPY_MODEL_b"], gap: "24px", align: "center" });
    await widget.render({ model, el, host } as never);

    const container = el.querySelector<HTMLElement>(".manywidgets-row")!;
    expect(container.style.display).toBe("flex");
    expect(container.style.flexDirection).toBe("row");
    expect(container.style.gap).toBe("24px");
    expect(container.style.alignItems).toBe("center");

    const cells = container.querySelectorAll(".manywidgets-row__cell");
    expect(cells.length).toBe(2);
    expect(host.mounted).toEqual(["IPY_MODEL_a", "IPY_MODEL_b"]);
    expect(cells[0].getAttribute("data-child")).toBe("IPY_MODEL_a");
    expect(cells[1].getAttribute("data-child")).toBe("IPY_MODEL_b");
  });

  it("disposes children on cleanup", async () => {
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel({ children: ["IPY_MODEL_a", "IPY_MODEL_b"], gap: "8px", align: "stretch" });
    const dispose = await widget.render({ model, el, host } as never);
    dispose();
    expect(host.disposed).toBe(2);
  });

  it("updates gap reactively", async () => {
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel({ children: [], gap: "8px", align: "stretch" });
    await widget.render({ model, el, host } as never);
    model.set("gap", "32px");
    expect(el.querySelector<HTMLElement>(".manywidgets-row")!.style.gap).toBe("32px");
  });
});
