import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const resolve = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Mirror the esbuild alias in scripts/build.mjs and the tsconfig path.
      "@manywidgets/core": resolve("./packages/core/src/index.ts"),
      "@manywidgets/test-utils": resolve("./tests/js/index.ts"),
    },
  },
  test: {
    environment: "jsdom",
    include: [
      "src/manywidgets/**/tests/*.test.ts",
      "packages/core/**/*.test.ts",
    ],
  },
});
