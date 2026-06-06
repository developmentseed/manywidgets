import { describe, expect, it } from "vitest";
import { fakeModel, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

describe("Text", () => {
  it("renders plain text safely (no HTML interpretation)", () => {
    const el = mountEl();
    const model = fakeModel({ value: "<b>hi</b>", markdown: false });
    widget.render({ model, el } as never);
    const container = el.querySelector(".manywidgets-text")!;
    expect(container.textContent).toBe("<b>hi</b>");
    expect(container.querySelector("b")).toBeNull();
  });

  it("renders markdown when enabled", () => {
    const el = mountEl();
    const model = fakeModel({ value: "**bold**", markdown: true });
    widget.render({ model, el } as never);
    const container = el.querySelector(".manywidgets-text")!;
    expect(container.querySelector("strong")!.textContent).toBe("bold");
    expect(container.classList.contains("manywidgets-text--markdown")).toBe(true);
  });

  it("updates on value change", () => {
    const el = mountEl();
    const model = fakeModel({ value: "one", markdown: false });
    widget.render({ model, el } as never);
    model.set("value", "two");
    expect(el.querySelector(".manywidgets-text")!.textContent).toBe("two");
  });
});
