#!/usr/bin/env node
// Generate src/manywidgets/themes/_radix_tokens.py from the latest Radix Themes
// package. This is intentionally build-time only; manywidgets does not import
// @radix-ui/themes or React at runtime.
//
// Usage:
//   npm run tokens:gen
//   node scripts/generate_radix_tokens.mjs --check
//   node scripts/generate_radix_tokens.mjs --source /path/to/unpacked/radix-ui-themes

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_RADIX_THEMES_SPEC = "latest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutput = path.join(root, "src", "manywidgets", "themes", "_radix_tokens.py");

const colorOrder = [
  "gray", "mauve", "slate", "sage", "olive", "sand",
  "amber", "blue", "bronze", "brown", "crimson", "cyan", "gold", "grass",
  "green", "indigo", "iris", "jade", "lime", "mint", "orange", "pink",
  "plum", "purple", "red", "ruby", "sky", "teal", "tomato", "violet", "yellow",
];

const accentColors = [
  "gray", "gold", "bronze", "brown", "yellow", "amber", "orange", "tomato",
  "red", "ruby", "crimson", "pink", "plum", "purple", "violet", "iris",
  "indigo", "blue", "cyan", "teal", "jade", "green", "grass", "lime", "mint", "sky",
];

const grayColors = ["auto", "gray", "mauve", "slate", "sage", "olive", "sand"];

const matchingGrayColors = {
  tomato: "mauve",
  red: "mauve",
  ruby: "mauve",
  crimson: "mauve",
  pink: "mauve",
  plum: "mauve",
  purple: "mauve",
  violet: "mauve",
  iris: "slate",
  indigo: "slate",
  blue: "slate",
  sky: "slate",
  cyan: "slate",
  teal: "sage",
  jade: "sage",
  mint: "sage",
  green: "sage",
  grass: "olive",
  lime: "olive",
  yellow: "sand",
  amber: "sand",
  orange: "sand",
  brown: "sand",
  gold: "sand",
  bronze: "sand",
  gray: "gray",
};

const args = parseArgs(process.argv.slice(2));
let tempDir = null;

try {
  const packageRoot = args.source
    ? findPackageRoot(path.resolve(args.source))
    : downloadRadixThemesPackage(args.version);

  const tokensRoot = path.join(packageRoot, "tokens");
  const packageVersion = readPackageVersion(packageRoot) ?? args.version;
  const output = generatePythonTokens(tokensRoot, packageVersion);

  if (args.check) {
    const current = readFileSync(args.output, "utf8");
    if (current !== output) {
      console.error(`[manywidgets] ${path.relative(root, args.output)} is out of date.`);
      console.error("[manywidgets] run npm run tokens:gen");
      process.exit(1);
    }
    console.log(`[manywidgets] ${path.relative(root, args.output)} is up to date.`);
  } else {
    writeFileSync(args.output, output);
    console.log(`[manywidgets] wrote ${path.relative(root, args.output)}`);
  }
} finally {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
}

function parseArgs(argv) {
  const parsed = {
    check: false,
    output: defaultOutput,
    source: null,
    version: DEFAULT_RADIX_THEMES_SPEC,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--check") {
      parsed.check = true;
    } else if (arg === "--output") {
      parsed.output = path.resolve(requiredValue(argv, ++i, "--output"));
    } else if (arg === "--source") {
      parsed.source = requiredValue(argv, ++i, "--source");
    } else if (arg === "--version") {
      parsed.version = requiredValue(argv, ++i, "--version");
    } else if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function printHelp() {
  console.log(`Usage: node scripts/generate_radix_tokens.mjs [options]

Options:
  --check             Fail when _radix_tokens.py is out of date
  --output <path>     Output Python file
  --source <path>     Unpacked @radix-ui/themes package root
  --version <value>   Radix Themes npm version/range/tag for npm pack, default ${DEFAULT_RADIX_THEMES_SPEC}
`);
}

function findPackageRoot(source) {
  const candidates = [
    source,
    path.join(source, "package"),
  ];
  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "tokens", "colors"))) {
      return candidate;
    }
  }

  throw new Error(
    `Could not find packaged Radix tokens under ${source}. ` +
      "Use an unpacked @radix-ui/themes npm package with tokens/colors/*.css.",
  );
}

function downloadRadixThemesPackage(version) {
  tempDir = mkdtempSync(path.join(os.tmpdir(), "manywidgets-radix-themes-"));
  const pack = spawnSync(
    "npm",
    ["pack", `@radix-ui/themes@${version}`, "--pack-destination", tempDir, "--silent"],
    { encoding: "utf8" },
  );

  if (pack.status !== 0) {
    throw new Error(
      [
        `Failed to download @radix-ui/themes@${version}.`,
        pack.stderr.trim(),
        pack.stdout.trim(),
      ].filter(Boolean).join("\n"),
    );
  }

  const tarballName = pack.stdout.trim().split(/\s+/).at(-1);
  if (!tarballName) {
    throw new Error("npm pack did not report a tarball name");
  }

  const tarball = path.isAbsolute(tarballName)
    ? tarballName
    : path.join(tempDir, tarballName);
  const extract = spawnSync("tar", ["-xzf", tarball, "-C", tempDir], { encoding: "utf8" });
  if (extract.status !== 0) {
    throw new Error(
      [
        `Failed to extract ${tarball}.`,
        extract.stderr.trim(),
        extract.stdout.trim(),
      ].filter(Boolean).join("\n"),
    );
  }

  return findPackageRoot(path.join(tempDir, "package"));
}

function readPackageVersion(packageRoot) {
  const packageJsonPath = path.join(packageRoot, "package.json");
  if (!existsSync(packageJsonPath)) return null;

  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  return typeof packageJson.version === "string" && packageJson.version
    ? packageJson.version
    : null;
}

function generatePythonTokens(tokensRoot, version) {
  const colorsRoot = path.join(tokensRoot, "colors");
  const light = [];
  const dark = [];

  for (const family of colorOrder) {
    const css = stripAtRules(readFileSync(path.join(colorsRoot, `${family}.css`), "utf8"));
    const common = [];
    const blocks = css.matchAll(/([^{}]+)\{([^{}]*)\}/g);
    for (const block of blocks) {
      const selector = block[1].trim();
      const declarations = parseColorDeclarations(block[2], family);
      if (declarations.length === 0) continue;

      if (selector.includes(".dark") || selector.includes(".dark-theme")) {
        dark.push(...declarations);
      } else if (selector.includes(".light") || selector.includes(":root")) {
        if (selector === ":root") common.push(...declarations);
        else light.push(...declarations);
      }
    }
    light.push(...common);
    dark.push(...common);
  }

  const rootColorTokens = parseRootAlphaTokens(
    stripAtRules(readFileSync(path.join(tokensRoot, "base.css"), "utf8")),
  );

  return `# Generated by scripts/generate_radix_tokens.mjs from @radix-ui/themes@${version}.
# Values are adapted to the manywidgets --mw-* namespace.
# The generator uses the sRGB declarations and skips display-p3 @supports overrides.

from __future__ import annotations

RADIX_COLOR_FAMILIES = ${pyTuple(colorOrder)}

RADIX_ACCENT_COLORS = ${pyTuple(accentColors)}

RADIX_GRAY_COLORS = ${pyTuple(grayColors)}

RADIX_MATCHING_GRAY_COLORS = ${pySimpleDict(matchingGrayColors)}

RADIX_ROOT_COLOR_TOKENS = ${pyDict(rootColorTokens)}

RADIX_LIGHT_COLOR_TOKENS = ${pyDict(light)}

RADIX_DARK_COLOR_TOKENS = ${pyDict(dark)}
`;
}

function stripAtRules(css) {
  let out = "";
  for (let i = 0; i < css.length;) {
    if (css.startsWith("@supports", i)) {
      const open = css.indexOf("{", i);
      if (open === -1) break;
      let depth = 0;
      let j = open;
      for (; j < css.length; j += 1) {
        if (css[j] === "{") depth += 1;
        else if (css[j] === "}") {
          depth -= 1;
          if (depth === 0) {
            j += 1;
            break;
          }
        }
      }
      i = j;
    } else {
      out += css[i];
      i += 1;
    }
  }
  return out;
}

function parseColorDeclarations(body, family) {
  const out = [];
  const re = /--([a-z-]+)-(a?\d+|contrast|surface|indicator|track):\s*([^;]+);/g;
  let match;
  while ((match = re.exec(body))) {
    const name = match[1];
    const suffix = match[2];
    if (name !== family) continue;
    out.push([`--mw-${family}-${suffix}`, normalizeValue(match[3])]);
    if (family === "gray") {
      out.push([`--mw-radix-gray-${suffix}`, normalizeValue(match[3])]);
    }
  }
  return out;
}

function parseRootAlphaTokens(css) {
  const out = [];
  const rootBlocks = css.matchAll(/:root\s*\{([^{}]*)\}/g);
  for (const block of rootBlocks) {
    const re = /--(black|white)-a(\d+):\s*([^;]+);/g;
    let match;
    while ((match = re.exec(block[1]))) {
      out.push([`--mw-${match[1]}-a${match[2]}`, normalizeValue(match[3])]);
    }
  }
  return out;
}

function normalizeValue(value) {
  return value.trim().replace(/var\(--([a-z-]+)(-[a-z0-9]+)?\)/g, (_match, name, suffix = "") => {
    return `var(--mw-${name}${suffix})`;
  });
}

function pyTuple(values) {
  if (values.length === 0) return "()";
  return `(\n${values.map((value) => `    ${JSON.stringify(value)},`).join("\n")}\n)`;
}

function pySimpleDict(obj) {
  const lines = Object.entries(obj).map(([key, value]) => {
    return `    ${JSON.stringify(key)}: ${JSON.stringify(value)},`;
  });
  return `{\n${lines.join("\n")}\n}`;
}

function pyDict(entries) {
  const seen = new Map();
  for (const [key, value] of entries) seen.set(key, value);
  const lines = [];
  for (const [key, value] of seen.entries()) {
    lines.push(`    ${JSON.stringify(key)}: ${JSON.stringify(value)},`);
  }
  return `{\n${lines.join("\n")}\n}`;
}
