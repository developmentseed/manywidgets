import { applyThemeVars, type AnyModel } from "@manywidgets/core";
import { createForecastView } from "./view";
import { DEFAULT_CONFIG, type ForecastConfig } from "./config";
import { createForecastController } from "./controller";

export default {
  render({ model, el }: { model: AnyModel; el: HTMLElement }) {
    const cleanupTheme = applyThemeVars(el, model);
    const config: ForecastConfig = (model.get("config") as ForecastConfig | undefined) ?? DEFAULT_CONFIG;
    const view = createForecastView(el, config);
    const controller = createForecastController(model, view, config);
    const resize = new ResizeObserver(() => controller.resize());

    resize.observe(el);
    controller.start();

    return () => {
      resize.disconnect();
      controller.dispose();
      view.dispose();
      cleanupTheme();
    };
  },
};
