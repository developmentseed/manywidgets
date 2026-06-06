import { describe, expect, it } from "vitest";
import { fakeModel, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

describe("Stat", () => {
  it("renders label, value, unit", () => {
    const el = mountEl();
    const model = fakeModel({ label: "Revenue", value: 1234, unit: "USD", delta: null });
    widget.render({ model, el } as never);
    expect(el.querySelector(".manywidgets-stat__label")!.textContent).toBe("Revenue");
    expect(el.querySelector(".manywidgets-stat__value")!.textContent).toBe("1234");
    expect(el.querySelector(".manywidgets-stat__unit")!.textContent).toBe("USD");
    expect(el.querySelector(".manywidgets-stat__delta")!.textContent).toBe("");
  });

  it("shows a signed delta with direction class", () => {
    const el = mountEl();
    const model = fakeModel({ label: "", value: 0, unit: "", delta: 5 });
    widget.render({ model, el } as never);
    const delta = el.querySelector(".manywidgets-stat__delta")!;
    expect(delta.textContent).toContain("5");
    expect(delta.className).toContain("manywidgets-stat__delta--up");

    model.set("delta", -2);
    expect(delta.className).toContain("manywidgets-stat__delta--down");
    expect(delta.textContent).toContain("2");
  });

  it("updates value on external change (e.g. jslink)", () => {
    const el = mountEl();
    const model = fakeModel({ label: "", value: 1, unit: "", delta: null });
    widget.render({ model, el } as never);
    model.set("value", 99);
    expect(el.querySelector(".manywidgets-stat__value")!.textContent).toBe("99");
  });
});
