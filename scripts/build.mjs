// One root build for every manywidgets widget.
//
// Each widget lives at src/manywidgets/<…>/ and exposes a src/index.ts entry
// point (nested, e.g. lonboard/<name>/, is supported). We esbuild-bundle each
// into that widget's dist/widget.js (ESM, browser, es2020 — the typed_counter
// golden-example invocation, iterated). The shared @manywidgets/core TS module
// is resolved via an esbuild alias and bundled directly into each widget, so it
// is never published separately and every widget carries its own copy of the
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

// Recursively discover every widget directory that has a src/index.ts entry
// point (skips dist/, node_modules/, tests/, __pycache__). Returns absolute dirs.
function findWidgetDirs(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (["dist", "node_modules", "tests", "__pycache__", "src"].includes(entry.name)) {
      continue;
    }
    const child = path.join(dir, entry.name);
    if (existsSync(path.join(child, "src", "index.ts"))) {
      found.push(child);
    }
    found.push(...findWidgetDirs(child));
  }
  return found;
}

const widgetDirs = findWidgetDirs(widgetsDir).sort();

if (widgetDirs.length === 0) {
  console.error(`[manywidgets] no widgets found under ${widgetsDir}`);
  process.exit(1);
}

function optionsFor(dir) {
  return {
    entryPoints: [path.join(dir, "src", "index.ts")],
    outfile: path.join(dir, "dist", "widget.js"),
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

const names = widgetDirs.map((d) => path.relative(widgetsDir, d));
console.log(`[manywidgets] building ${widgetDirs.length} widget(s): ${names.join(", ")}`);

if (watch) {
  const contexts = await Promise.all(widgetDirs.map((d) => context(optionsFor(d))));
  await Promise.all(contexts.map((c) => c.watch()));
  console.log("[manywidgets] watching for changes…");
} else {
  await Promise.all(widgetDirs.map((d) => build(optionsFor(d))));
  console.log("[manywidgets] build complete.");
}
