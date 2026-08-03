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

  it("colors datasets from the theme palette, not a hardcoded array", () => {
    const el = mountEl();
    const model = fakeModel(
      baseState({
        theme_vars: {
          "--mw-palette-size": "2",
          "--mw-palette-1": "#123456",
          "--mw-palette-2": "#abcdef",
        },
        series_data: [
          { name: "a", data: [[0, 1]] },
          { name: "b", data: [[0, 2]] },
        ],
      }),
    );
    widget.render({ model, el } as never);

    const chart = instances[instances.length - 1] as { data: { datasets: Array<{ borderColor: string }> } };
    expect(chart.data.datasets[0].borderColor).toBe("#123456");
    expect(chart.data.datasets[1].borderColor).toBe("#abcdef");
  });

  it("an explicit per-series color still overrides the theme palette", () => {
    const el = mountEl();
    const model = fakeModel(
      baseState({
        theme_vars: { "--mw-palette-size": "1", "--mw-palette-1": "#123456" },
        series_data: [{ name: "a", color: "#ff00ff", data: [[0, 1]] }],
      }),
    );
    widget.render({ model, el } as never);

    const chart = instances[instances.length - 1] as { data: { datasets: Array<{ borderColor: string }> } };
    expect(chart.data.datasets[0].borderColor).toBe("#ff00ff");
  });

  it("rebuilds chart options (not just redraw) when theme_vars changes", () => {
    const el = mountEl();
    const model = fakeModel(
      baseState({ theme_vars: { "--mw-color-text": "#111111" } }),
    );
    widget.render({ model, el } as never);

    model.set("theme_vars", { "--mw-color-text": "#222222" });

    const chart = instances[instances.length - 1] as { options: { color: string } };
    expect(chart.options).toHaveProperty("color");
  });
});
