import { describe, expect, it } from "vitest";
import { fakeModel, installHostRegistry, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

describe("LayerToggle", () => {
  it("applies the initial visibility to the layer", async () => {
    const layer = fakeModel({ visible: true }, { model_id: "layer1" });
    const cleanup = installHostRegistry([layer]);
    const model = fakeModel({ layer: "IPY_MODEL_layer1", value: false, label: "Buildings" });

    await widget.render({ model, el: mountEl() } as never);
    expect(layer.get("visible")).toBe(false);
    cleanup();
  });

  it("writes visible on toggle and fans out to all proxies of the layer", async () => {
    const p1 = fakeModel({ visible: true }, { model_id: "layer1" });
    const p2 = fakeModel({ visible: true }, { model_id: "layer1" });
    const cleanup = installHostRegistry([p1, p2]);
    const model = fakeModel({ layer: "IPY_MODEL_layer1", value: true, label: "" });
    const el = mountEl();

    await widget.render({ model, el } as never);
    const input = el.querySelector<HTMLInputElement>(".manywidgets-layertoggle__input")!;
    input.checked = false;
    input.dispatchEvent(new Event("change", { bubbles: true }));

    expect(model.get("value")).toBe(false);
    expect(p1.get("visible")).toBe(false);
    expect(p2.get("visible")).toBe(false);
    cleanup();
  });
});
