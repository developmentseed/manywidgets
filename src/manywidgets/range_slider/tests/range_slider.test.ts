import { describe, expect, it } from "vitest";
import { fakeModel, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

function setup(over: Record<string, unknown> = {}) {
  const el = mountEl();
  const model = fakeModel({ low: 2, high: 8, min: 0, max: 10, step: 1, label: "W", ...over });
  widget.render({ model, el } as never);
  const low = el.querySelector<HTMLInputElement>(".manywidgets-range__input--low")!;
  const high = el.querySelector<HTMLInputElement>(".manywidgets-range__input--high")!;
  return { el, model, low, high };
}

describe("RangeSlider", () => {
  it("renders two range inputs reflecting low/high", () => {
    const { el, low, high } = setup();
    expect(low.value).toBe("2");
    expect(high.value).toBe("8");
    expect(el.querySelector(".manywidgets-range__value")!.textContent).toBe("2 – 8");
  });

  it("writes low on input and clamps to <= high", () => {
    const { model, low } = setup();
    low.value = "5";
    low.dispatchEvent(new Event("input", { bubbles: true }));
    expect(model.get("low")).toBe(5);

    low.value = "9"; // beyond high (8) -> clamp to 8
    low.dispatchEvent(new Event("input", { bubbles: true }));
    expect(model.get("low")).toBe(8);
  });

  it("writes high on input and clamps to >= low", () => {
    const { model, high } = setup();
    high.value = "1"; // below low (2) -> clamp to 2
    high.dispatchEvent(new Event("input", { bubbles: true }));
    expect(model.get("high")).toBe(2);
  });

  it("reflects external changes under the strict static emitter", () => {
    const { el, model, low } = setup();
    model.set("low", 4);
    expect(low.value).toBe("4");
    expect(el.querySelector(".manywidgets-range__value")!.textContent).toBe("4 – 8");
  });
});
