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

  it("shrinks a value wider than its row to fit", () => {
    const el = mountEl();
    // jsdom has no layout: give the row 150px and the value 300px at 30px.
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 150 });
    const rect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function () {
      const w = this.classList.contains("manywidgets-stat__value") ? (this.style.fontSize ? 150 : 300) : 0;
      return { width: w } as DOMRect;
    };
    const style = window.getComputedStyle;
    window.getComputedStyle = ((n: Element) => ({ ...style(n), fontSize: "30px" })) as typeof getComputedStyle;
    try {
      const model = fakeModel({ label: "", value: "173,961,000", unit: "", delta: null });
      widget.render({ model, el } as never);
      const value = el.querySelector<HTMLElement>(".manywidgets-stat__value")!;
      expect(value.style.fontSize).toBe("15px");

      // Natural width now fits: the inline size is cleared back to the token.
      HTMLElement.prototype.getBoundingClientRect = function () {
        return { width: 100 } as DOMRect;
      };
      model.set("value", "42");
      expect(value.style.fontSize).toBe("");
    } finally {
      delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
      HTMLElement.prototype.getBoundingClientRect = rect;
      window.getComputedStyle = style;
    }
  });
});
