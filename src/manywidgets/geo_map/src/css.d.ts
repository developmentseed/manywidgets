// esbuild bundles `.css` imports as strings (scripts/build.mjs `loader`); vitest
// resolves them through its own CSS pipeline (mocked in tests).
declare module "*.css" {
  const text: string;
  export default text;
}
