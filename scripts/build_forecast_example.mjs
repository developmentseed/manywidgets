import { build } from "esbuild";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
await build({
  absWorkingDir: root,
  entryPoints: ["docs/examples/forecast/widget.ts"],
  outfile: "docs/examples/forecast/dist/widget.js",
  bundle: true, format: "esm", platform: "browser", target: "es2022", minify: true,
  loader: { ".css": "text" },
  alias: { "@manywidgets/core": `${root}packages/core/src/index.ts` },
  logLevel: "info",
});
