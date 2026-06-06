// One root build for every manywidgets widget.
//
// Each widget lives at src/manywidgets/<name>/ and exposes a src/index.ts
// entry point. We esbuild-bundle each into that widget's dist/widget.js
// (ESM, browser, es2020 — the typed_counter golden-example invocation,
// iterated). The shared @manywidgets/core TS module is resolved via an
// esbuild alias and bundled directly into each widget, so it is never
// published separately and every widget carries its own copy of the
// static-export-safety helpers.
//
// Usage: node scripts/build.mjs [--watch]

import { build, context } from "esbuild";
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const widgetsDir = path.join(root, "src", "manywidgets");
const coreEntry = path.join(root, "packages", "core", "src", "index.ts");

const watch = process.argv.includes("--watch");

// Discover every widget directory that has a src/index.ts entry point.
const widgets = readdirSync(widgetsDir, { withFileTypes: true })
  .filter(
    (d) =>
      d.isDirectory() &&
      existsSync(path.join(widgetsDir, d.name, "src", "index.ts")),
  )
  .map((d) => d.name)
  .sort();

if (widgets.length === 0) {
  console.error(`[manywidgets] no widgets found under ${widgetsDir}`);
  process.exit(1);
}

function optionsFor(name) {
  return {
    entryPoints: [path.join(widgetsDir, name, "src", "index.ts")],
    outfile: path.join(widgetsDir, name, "dist", "widget.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2020",
    sourcemap: false,
    // Resolve `import ... from "@manywidgets/core"` to the shared TS source.
    alias: { "@manywidgets/core": coreEntry },
    logLevel: "info",
  };
}

console.log(`[manywidgets] building ${widgets.length} widget(s): ${widgets.join(", ")}`);

if (watch) {
  const contexts = await Promise.all(
    widgets.map((name) => context(optionsFor(name))),
  );
  await Promise.all(contexts.map((c) => c.watch()));
  console.log("[manywidgets] watching for changes…");
} else {
  await Promise.all(widgets.map((name) => build(optionsFor(name))));
  console.log("[manywidgets] build complete.");
}
