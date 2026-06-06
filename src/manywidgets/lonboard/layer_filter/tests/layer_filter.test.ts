import { describe, expect, it } from "vitest";
import { fakeModel, installHostRegistry, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

describe("LayerFilter", () => {
  it("renders a checkbox per category and applies the initial selection", async () => {
    const layer = fakeModel({ filter_categories: null }, { model_id: "layer1" });
    const cleanup = installHostRegistry([layer]);
    const model = fakeModel({
      layer: "IPY_MODEL_layer1",
      categories: [[0, "Shallow"], [1, "Deep"], [2, "Very deep"]],
      value: [0, 1, 2],
      label: "Depth",
    });
    const el = mountEl();

    await widget.render({ model, el } as never);
    const boxes = el.querySelectorAll<HTMLInputElement>(".manywidgets-layerfilter__list input");
    expect(boxes.length).toBe(3);
    expect(layer.get("filter_categories")).toEqual([0, 1, 2]);
    cleanup();
  });

  it("writes filter_categories on toggle (fanning out)", async () => {
    const p1 = fakeModel({ filter_categories: null }, { model_id: "layer2" });
    const p2 = fakeModel({ filter_categories: null }, { model_id: "layer2" });
    const cleanup = installHostRegistry([p1, p2]);
    const model = fakeModel({
      layer: "IPY_MODEL_layer2",
      categories: [0, 1, 2],
      value: [0, 1, 2],
      label: "",
    });
    const el = mountEl();

    await widget.render({ model, el } as never);
    const boxes = el.querySelectorAll<HTMLInputElement>(".manywidgets-layerfilter__list input");
    boxes[1].checked = false; // disable category 1
    boxes[1].dispatchEvent(new Event("change", { bubbles: true }));

    expect(model.get("value")).toEqual([0, 2]);
    expect(p1.get("filter_categories")).toEqual([0, 2]);
    expect(p2.get("filter_categories")).toEqual([0, 2]);
    cleanup();
  });
});
