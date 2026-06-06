import { describe, expect, it } from "vitest";
import { fakeModel, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

describe("Button", () => {
  it("renders the label", () => {
    const el = mountEl();
    const model = fakeModel({ clicks: 0, label: "Go" });
    widget.render({ model, el } as never);
    expect(el.querySelector(".manywidgets-button")!.textContent).toBe("Go");
  });

  it("increments clicks on click and saves", () => {
    const el = mountEl();
    const model = fakeModel({ clicks: 0, label: "Go" });
    widget.render({ model, el } as never);
    const button = el.querySelector<HTMLButtonElement>(".manywidgets-button")!;
    button.click();
    button.click();
    expect(model.get("clicks")).toBe(2);
    expect(model.saved).toBe(2);
  });

  it("updates label on change", () => {
    const el = mountEl();
    const model = fakeModel({ clicks: 0, label: "Go" });
    widget.render({ model, el } as never);
    model.set("label", "Stop");
    expect(el.querySelector(".manywidgets-button")!.textContent).toBe("Stop");
  });
});
