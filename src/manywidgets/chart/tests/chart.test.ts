import { describe, expect, it, vi } from "vitest";
import { fakeModel, mountEl } from "@manywidgets/test-utils";

// Chart.js needs a real canvas 2d context (absent in jsdom), so mock it and
// capture constructed instances.
const { instances } = vi.hoisted(() => ({ instances: [] as Array<Record<string, unknown>> }));
vi.mock("chart.js/auto", () => {
  class MockChart {
    data: unknown;
    options: unknown;
    constructor(_canvas: unknown, config: { data: unknown; options: unknown }) {
      this.data = config.data;
      this.options = config.options;
      instances.push(this as unknown as Record<string, unknown>);
    }
    update() {}
    resize() {}
    destroy() {}
  }
  return { default: MockChart };
});

import widget from "../src/index";

function baseState(over: Record<string, unknown> = {}) {
  return {
    chart_type: "line",
    series_data: [{ name: "s", data: [[0, 1], [1, 2]] }],
    chart_options: {},
    width: 800,
    height: 320,
    title: "",
    x_label: "",
    y_label: "",
    animation_enabled: true,
    tooltips_enabled: true,
    legend_enabled: true,
    ...over,
  };
}

describe("Chart", () => {
  it("renders a canvas and creates a chart when series exist", () => {
    const el = mountEl();
    const model = fakeModel(baseState());
    widget.render({ model, el } as never);

    const container = el.querySelector<HTMLElement>(".manywidgets-chart")!;
    expect(container).toBeTruthy();
    expect(el.querySelector("canvas")).toBeTruthy();
    expect(container.style.width).toBe("800px");
    expect(container.style.height).toBe("320px");
    expect(instances.length).toBeGreaterThan(0);
  });

  it("updates container size on height change (static-export link guard)", () => {
    // The bug we fixed: width/height were registered with a space-separated
    // on(), which never fires under the static emitter. The strict fakeModel
    // reproduces that, so this asserts the per-trait onChanges wiring.
    const el = mountEl();
    const model = fakeModel(baseState());
    widget.render({ model, el } as never);

    model.set("height", 460);
    const container = el.querySelector<HTMLElement>(".manywidgets-chart")!;
    expect(container.style.height).toBe("460px");
  });

  it("rebuilds when title changes", () => {
    const el = mountEl();
    const model = fakeModel(baseState());
    widget.render({ model, el } as never);
    const before = instances.length;
    model.set("title", "Hello");
    // createOrUpdate reuses the existing chart instance (no new construction),
    // but does not throw under the strict emitter.
    expect(instances.length).toBe(before);
    expect(model.get("title")).toBe("Hello");
  });
});
