import { describe, expect, it } from "vitest";
import { applyThemeVars } from "@manywidgets/core";
import { fakeModel, mountEl } from "@manywidgets/test-utils";
import { readChartTheme } from "../src/theme";

describe("readChartTheme", () => {
  it("composes core's resolution primitives into the chart theme shape", () => {
    const el = mountEl();
    const m = fakeModel({
      theme_vars: {
        "--mw-palette-size": "2",
        "--mw-palette-1": "#123456",
        "--mw-palette-2": "#abcdef",
      },
    });
    applyThemeVars(el, m as never);

    const theme = readChartTheme(el);
    expect(theme.palette).toEqual(["#123456", "#abcdef"]);
    expect(typeof theme.textColor).toBe("string");
    expect(typeof theme.fontFamily).toBe("string");
  });
});
