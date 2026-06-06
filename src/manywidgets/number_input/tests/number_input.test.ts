import { describe, expect, it } from "vitest";
import { fakeModel, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

describe("NumberInput", () => {
  it("renders a number input reflecting the value/bounds", () => {
    const el = mountEl();
    const model = fakeModel({ value: 4, min: 0, max: 10, step: 2, label: "Count" });
    widget.render({ model, el } as never);
    const input = el.querySelector<HTMLInputElement>(".manywidgets-number__input")!;
    expect(input.type).toBe("number");
    expect(input.value).toBe("4");
    expect(input.min).toBe("0");
    expect(input.max).toBe("10");
    expect(input.step).toBe("2");
  });

  it("handles null bounds", () => {
    const el = mountEl();
    const model = fakeModel({ value: 1, min: null, max: null, step: 1, label: "" });
    widget.render({ model, el } as never);
    const input = el.querySelector<HTMLInputElement>(".manywidgets-number__input")!;
    expect(input.min).toBe("");
    expect(input.max).toBe("");
  });

  it("writes value on input and reflects external changes", () => {
    const el = mountEl();
    const model = fakeModel({ value: 1, min: null, max: null, step: 1, label: "" });
    widget.render({ model, el } as never);
    const input = el.querySelector<HTMLInputElement>(".manywidgets-number__input")!;
    input.value = "7";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(model.get("value")).toBe(7);

    model.set("value", 12);
    expect(input.value).toBe("12");
  });
});
