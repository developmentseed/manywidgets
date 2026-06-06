import { describe, expect, it } from "vitest";
import { fakeModel, installHostRegistry, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

describe("FilterBinder", () => {
  it("writes [low, high] to the layer's filter_range and updates on change", async () => {
    const slider = fakeModel({ widget_id: "rs1", low: 10, high: 90 });
    const layer = fakeModel({ filter_range: null }, { model_id: "layer1" });
    const cleanup = installHostRegistry([slider, layer]);
    const model = fakeModel({
      source: "IPY_MODEL_rs1",
      layer: "IPY_MODEL_layer1",
      low_field: "low",
      high_field: "high",
      filter_field: "filter_range",
      label: "",
    });
    const el = mountEl();

    await widget.render({ model, el } as never);
    expect(layer.get("filter_range")).toEqual([10, 90]);

    slider.set("high", 50);
    expect(layer.get("filter_range")).toEqual([10, 50]);
    expect(el.textContent).toContain("✅");
    cleanup();
  });

  it("fans out to every proxy of the layer", async () => {
    const slider = fakeModel({ widget_id: "rs2", low: 1, high: 2 });
    const p1 = fakeModel({ filter_range: null }, { model_id: "layer2" });
    const p2 = fakeModel({ filter_range: null }, { model_id: "layer2" });
    const cleanup = installHostRegistry([slider, p1, p2]);
    const model = fakeModel({
      source: "IPY_MODEL_rs2",
      layer: "IPY_MODEL_layer2",
      low_field: "low",
      high_field: "high",
      filter_field: "filter_range",
      label: "",
    });

    await widget.render({ model, el: mountEl() } as never);
    expect(p1.get("filter_range")).toEqual([1, 2]);
    expect(p2.get("filter_range")).toEqual([1, 2]);
    cleanup();
  });
});
