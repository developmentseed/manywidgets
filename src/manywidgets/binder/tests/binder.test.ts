import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeModel, installHostRegistry, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

describe("Binder", () => {
  let cleanup: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    cleanup?.();
  });

  it("applies value*multiplier+offset to the target on resolve and on change", async () => {
    const source = fakeModel({ widget_id: "src1", value: 5 });
    const target = fakeModel({ widget_id: "tgt1", height: 0 });
    cleanup = installHostRegistry([source, target]);

    const model = fakeModel({
      source_widget_id: "src1",
      source_field: "value",
      target_widget_id: "tgt1",
      target_field: "height",
      multiplier: 100,
      offset: 200,
      label: "",
    });
    const el = mountEl();

    await widget.render({ model, el } as never);

    // Initial apply: 5*100 + 200 = 700
    expect(target.get("height")).toBe(700);

    // Source changes -> recompute: 3*100 + 200 = 500
    source.set("value", 3);
    expect(target.get("height")).toBe(500);

    expect(el.textContent).toContain("✅");
  });

  it("supports dotted-path targets (merges into the parent dict)", async () => {
    const source = fakeModel({ widget_id: "s2", value: 4 });
    const target = fakeModel({ widget_id: "t2", view_state: { zoom: 1, pitch: 0 } });
    cleanup = installHostRegistry([source, target]);

    const model = fakeModel({
      source_widget_id: "s2",
      source_field: "value",
      target_widget_id: "t2",
      target_field: "view_state.zoom",
      multiplier: 1,
      offset: 0,
      label: "",
    });

    await widget.render({ model, el: mountEl() } as never);

    expect(target.get("view_state")).toEqual({ zoom: 4, pitch: 0 });
  });
});
