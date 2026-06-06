import { describe, expect, it } from "vitest";
import { fakeModel, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

describe("Slider", () => {
  it("renders a range input reflecting the model value", () => {
    const el = mountEl();
    const model = fakeModel({ value: 3, min: 0, max: 10, step: 1, label: "Amp" });
    widget.render({ model, el } as never);

    const input = el.querySelector<HTMLInputElement>(".manywidgets-slider__input")!;
    expect(input).toBeTruthy();
    expect(input.type).toBe("range");
    expect(input.value).toBe("3");
    expect(input.min).toBe("0");
    expect(input.max).toBe("10");
    expect(el.querySelector(".manywidgets-slider__label")!.textContent).toBe("Amp");
  });

  it("writes value + saves on user input", () => {
    const el = mountEl();
    const model = fakeModel({ value: 3, min: 0, max: 10, step: 1, label: "" });
    widget.render({ model, el } as never);

    const input = el.querySelector<HTMLInputElement>(".manywidgets-slider__input")!;
    input.value = "7";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(model.get("value")).toBe(7);
    expect(model.saved).toBeGreaterThan(0);
    expect(el.querySelector(".manywidgets-slider__value")!.textContent).toBe("7");
  });

  it("reflects external value changes (e.g. from a jslink)", () => {
    const el = mountEl();
    const model = fakeModel({ value: 3, min: 0, max: 10, step: 1, label: "" });
    widget.render({ model, el } as never);

    model.set("value", 9);
    const input = el.querySelector<HTMLInputElement>(".manywidgets-slider__input")!;
    expect(input.value).toBe("9");
    expect(el.querySelector(".manywidgets-slider__value")!.textContent).toBe("9");
  });

  it("reflects bound changes (min/max/step) under the strict static emitter", () => {
    // Guards the static-export rule: these are registered via onChanges, not a
    // space-separated on(); the strict fakeModel would not fire otherwise.
    const el = mountEl();
    const model = fakeModel({ value: 3, min: 0, max: 10, step: 1, label: "" });
    widget.render({ model, el } as never);

    model.set("max", 50);
    const input = el.querySelector<HTMLInputElement>(".manywidgets-slider__input")!;
    expect(input.max).toBe("50");
  });
});
