import type { RenderProps } from "@anywidget/types";
import { onChanges, safeSaveChanges } from "@manywidgets/core";
import Chart from "chart.js/auto";

interface Series {
  type?: string;
  name?: string;
  color?: string;
  data?: Array<[number, number]> | Array<{ x: number; y: number }> | number[];
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  borderWidth?: number;
}

interface PointEvent {
  series: number;
  index: number;
  x: unknown;
  y: unknown;
  label: string;
}

interface ChartModel {
  chart_type: string;
  series_data: Series[];
  chart_options: Record<string, unknown>;
  width: number;
  height: number;
  title: string;
  x_label: string;
  y_label: string;
  animation_enabled: boolean;
  tooltips_enabled: boolean;
  legend_enabled: boolean;
  clicked_point: PointEvent | Record<string, never>;
  hover_point: PointEvent | Record<string, never>;
}

const PALETTE = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
];

function formatSeriesData(seriesData: Series[], defaultType: string) {
  return (seriesData || []).map((series, index) => {
    const color = series.color || PALETTE[index % PALETTE.length];
    const type = series.type || defaultType || "line";

    let data: unknown;
    if (series.data && series.data.length > 0) {
      if (Array.isArray(series.data[0])) {
        data = (series.data as Array<[number, number]>).map((p) => ({ x: p[0], y: p[1] }));
      } else {
        data = series.data;
      }
    } else {
      data = [];
    }

    const dataset: Record<string, unknown> = {
      label: series.name || `Series ${index + 1}`,
      data,
      borderColor: color,
      backgroundColor: color + "33",
      type,
      fill: series.fill !== undefined ? series.fill : false,
      tension: series.tension ?? 0.1,
      pointRadius: series.pointRadius !== undefined ? series.pointRadius : 3,
      pointHoverRadius: 5,
      borderWidth: series.borderWidth || 2,
    };

    if (type === "scatter") {
      dataset.showLine = false;
      dataset.pointRadius = series.pointRadius || 5;
    }
    if (type === "bar") {
      dataset.backgroundColor = color + "80";
    }
    return dataset;
  });
}

function render({ model, el }: RenderProps<ChartModel>): () => void {
  const container = document.createElement("div");
  container.className = "manywidgets-chart";
  container.style.width = `${model.get("width")}px`;
  container.style.height = `${model.get("height")}px`;
  container.style.position = "relative";

  const canvas = document.createElement("canvas");
  container.appendChild(canvas);
  el.appendChild(container);

  let chart: Chart | null = null;

  const emitPoint = (trait: "clicked_point" | "hover_point") =>
    (_event: unknown, elements: Array<{ datasetIndex: number; index: number }>) => {
      if (!chart || elements.length === 0) return;
      const { datasetIndex, index } = elements[0];
      const dataset = chart.data.datasets[datasetIndex];
      const point = dataset.data[index] as { x: unknown; y: unknown };
      model.set(trait, {
        series: datasetIndex,
        index,
        x: point.x,
        y: point.y,
        label: String(dataset.label ?? ""),
      });
      safeSaveChanges(model);
    };

  function buildOptions(): Record<string, unknown> {
    const options: Record<string, unknown> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: model.get("animation_enabled") ? 750 : 0 },
      interaction: { mode: "nearest", intersect: false, axis: "x" },
      plugins: {
        title: { display: !!model.get("title"), text: model.get("title"), font: { size: 16 } },
        legend: { display: model.get("legend_enabled") !== false, position: "top" },
        tooltip: {
          enabled: model.get("tooltips_enabled") !== false,
          mode: "index",
          intersect: false,
        },
      },
      scales: {
        x: {
          type: "linear",
          position: "bottom",
          title: { display: !!model.get("x_label"), text: model.get("x_label") },
        },
        y: { title: { display: !!model.get("y_label"), text: model.get("y_label") } },
      },
      onClick: emitPoint("clicked_point"),
      onHover: emitPoint("hover_point"),
    };

    const custom = model.get("chart_options") as Record<string, unknown> | undefined;
    if (custom) {
      Object.assign(options, custom);
      if (custom.scales) Object.assign(options.scales as object, custom.scales as object);
      if (custom.plugins) Object.assign(options.plugins as object, custom.plugins as object);
    }
    return options;
  }

  function build(): void {
    chart?.destroy();
    chart = new Chart(canvas, {
      type: (model.get("chart_type") || "line") as never,
      data: { datasets: formatSeriesData(model.get("series_data"), model.get("chart_type")) as never },
      options: buildOptions() as never,
    });
  }

  function createOrUpdate(): void {
    if (!chart) {
      build();
    } else {
      chart.data = { datasets: formatSeriesData(model.get("series_data"), model.get("chart_type")) as never };
      chart.options = buildOptions() as never;
      chart.update();
    }
  }

  if ((model.get("series_data") || []).length > 0) build();

  // NOTE: register one listener per trait — the static-export model emitter does
  // not support space-separated event names (see core's onChanges docstring).
  onChanges(
    model,
    [
      "series_data",
      "chart_options",
      "animation_enabled",
      "tooltips_enabled",
      "legend_enabled",
      "title",
      "x_label",
      "y_label",
    ],
    createOrUpdate,
  );

  // Switching the default series type requires a fresh chart — Chart.js won't
  // re-type existing datasets via update().
  onChanges(model, ["chart_type"], build);

  onChanges(model, ["width", "height"], () => {
    container.style.width = `${model.get("width")}px`;
    container.style.height = `${model.get("height")}px`;
    chart?.resize();
  });

  return () => chart?.destroy();
}

export default { render };
