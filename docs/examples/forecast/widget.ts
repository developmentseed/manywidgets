import { applyThemeVars, type AnyModel } from "@manywidgets/core";
import { createForecastView } from "./view";
import { createForecastController } from "./controller";

export default {
  render({ model, el }: { model: AnyModel; el: HTMLElement }) {
    const cleanupTheme = applyThemeVars(el, model);
    const view = createForecastView(el);
    const controller = createForecastController(model, view);
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
