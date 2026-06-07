import { describe, expect, it } from "vitest";
import { fakeModel, mountEl } from "@manywidgets/test-utils";
import widget, { formatNumber } from "../src/index";

describe("formatNumber", () => {
  it("handles the spec subset", () => {
    expect(formatNumber(42, "{}")).toBe("42");
    expect(formatNumber(42, "{:.1f}")).toBe("42.0");
    expect(formatNumber(1234.5, "{:,.0f}")).toBe("1,235");
    expect(formatNumber(1234, "{:,}")).toBe("1,234");
    expect(formatNumber(3.14159, "{:.2f}")).toBe("3.14");
  });

  it("supports a literal prefix and/or suffix around the field", () => {
    expect(formatNumber(4000, "${:,.0f}")).toBe("$4,000");
    expect(formatNumber(99.5, "{:.1f}%")).toBe("99.5%");
    expect(formatNumber(42, "{:,.0f} ms")).toBe("42 ms");
    expect(formatNumber(1234, "~ {} ~")).toBe("~ 1234 ~");
  });

  it("renders a spec with no field literally", () => {
    expect(formatNumber(42, "no field")).toBe("no field");
  });
});

describe("NumberDisplay", () => {
  it("renders the formatted value instantly when duration is 0", () => {
    const el = mountEl();
    const model = fakeModel({ value: 42, format: "{:.1f}", duration: 0, label: "Total" });
    widget.render({ model, el } as never);
    expect(el.querySelector(".manywidgets-numberdisplay__value")!.textContent).toBe("42.0");
    expect(el.querySelector(".manywidgets-numberdisplay__label")!.textContent).toBe("Total");
  });

  it("updates on value change (instant, duration 0)", () => {
    const el = mountEl();
    const model = fakeModel({ value: 42, format: "{:.1f}", duration: 0, label: "" });
    widget.render({ model, el } as never);
    model.set("value", 7);
    expect(el.querySelector(".manywidgets-numberdisplay__value")!.textContent).toBe("7.0");
  });

  it("reformats on format change without changing the value", () => {
    const el = mountEl();
    const model = fakeModel({ value: 1234, format: "{}", duration: 0, label: "" });
    widget.render({ model, el } as never);
    const valueEl = el.querySelector(".manywidgets-numberdisplay__value")!;
    expect(valueEl.textContent).toBe("1234");
    model.set("format", "{:,}");
    expect(valueEl.textContent).toBe("1,234");
  });
});
