import { describe, expect, it } from "vitest";
import { fakeModel, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

describe("Legend", () => {
  it("renders a titled list of swatch + label rows", () => {
    const el = mountEl();
    const model = fakeModel({
      entries: [[[230, 30, 30], "High"], ["#0a0", "Low"]],
      title: "Category",
    });
    widget.render({ model, el } as never);

    expect(el.querySelector(".manywidgets-legend__title")!.textContent).toBe("Category");
    const items = el.querySelectorAll(".manywidgets-legend__item");
    expect(items.length).toBe(2);
    expect(items[0].querySelector(".manywidgets-legend__label")!.textContent).toBe("High");
    const swatch0 = items[0].querySelector<HTMLElement>(".manywidgets-legend__swatch")!;
    const swatch1 = items[1].querySelector<HTMLElement>(".manywidgets-legend__swatch")!;
    expect(swatch0.style.background).toBe("rgb(230, 30, 30)"); // array -> rgb()
    expect(swatch1.style.background).toBe("rgb(0, 170, 0)"); // CSS "#0a0" normalized by cssstyle
  });

  it("supports rgba (4-tuple, 0-255 alpha) and hides an empty title", () => {
    const el = mountEl();
    const model = fakeModel({ entries: [[[10, 20, 30, 128], "x"]], title: "" });
    widget.render({ model, el } as never);
    const swatch = el.querySelector<HTMLElement>(".manywidgets-legend__swatch")!;
    expect(swatch.style.background.startsWith("rgba(10, 20, 30,")).toBe(true);
    expect(el.querySelector<HTMLElement>(".manywidgets-legend__title")!.style.display).toBe("none");
  });

  it("updates on entries change", () => {
    const el = mountEl();
    const model = fakeModel({ entries: [], title: "" });
    widget.render({ model, el } as never);
    model.set("entries", [["#111", "a"], ["#222", "b"], ["#333", "c"]]);
    expect(el.querySelectorAll(".manywidgets-legend__item").length).toBe(3);
  });
});
