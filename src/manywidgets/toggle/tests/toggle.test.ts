import { describe, expect, it } from "vitest";
import { fakeModel, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

describe("Toggle", () => {
  it("reflects the initial value and label", () => {
    const el = mountEl();
    const model = fakeModel({ value: true, label: "Show legend" });
    widget.render({ model, el } as never);
    const input = el.querySelector<HTMLInputElement>(".manywidgets-toggle__input")!;
    expect(input.checked).toBe(true);
    expect(el.querySelector(".manywidgets-toggle__label")!.textContent).toBe("Show legend");
  });

  it("writes value on change", () => {
    const el = mountEl();
    const model = fakeModel({ value: false, label: "" });
    widget.render({ model, el } as never);
    const input = el.querySelector<HTMLInputElement>(".manywidgets-toggle__input")!;
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(model.get("value")).toBe(true);
    expect(model.saved).toBeGreaterThan(0);
  });

  it("reflects external value changes", () => {
    const el = mountEl();
    const model = fakeModel({ value: false, label: "" });
    widget.render({ model, el } as never);
    model.set("value", true);
    const input = el.querySelector<HTMLInputElement>(".manywidgets-toggle__input")!;
    expect(input.checked).toBe(true);
  });
});
