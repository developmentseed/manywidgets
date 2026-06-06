import { describe, expect, it } from "vitest";
import { fakeModel, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

describe("Dropdown", () => {
  it("renders options and selects the current value", () => {
    const el = mountEl();
    const model = fakeModel({ options: ["a", "b", "c"], value: "b", label: "Pick" });
    widget.render({ model, el } as never);

    const select = el.querySelector<HTMLSelectElement>(".manywidgets-dropdown__select")!;
    expect(select.options.length).toBe(3);
    expect(select.options[1].textContent).toBe("b");
    // value "b" is the option at index 1
    expect(select.value).toBe("1");
  });

  it("writes the typed value on change (label/value pairs)", () => {
    const el = mountEl();
    const model = fakeModel({ options: [["One", 1], ["Two", 2]], value: 1, label: "" });
    widget.render({ model, el } as never);

    const select = el.querySelector<HTMLSelectElement>(".manywidgets-dropdown__select")!;
    select.value = "1"; // index 1 -> value 2
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(model.get("value")).toBe(2);
    expect(model.saved).toBeGreaterThan(0);
  });

  it("rebuilds when options change", () => {
    const el = mountEl();
    const model = fakeModel({ options: ["a"], value: "a", label: "" });
    widget.render({ model, el } as never);

    model.set("options", ["x", "y", "z"]);
    const select = el.querySelector<HTMLSelectElement>(".manywidgets-dropdown__select")!;
    expect(select.options.length).toBe(3);
    expect(select.options[0].textContent).toBe("x");
  });
});
