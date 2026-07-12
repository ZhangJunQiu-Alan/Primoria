import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = resolve(import.meta.dirname, "../../..");
const globalsCssPath = resolve(repoRoot, "apps/web/src/app/globals.css");

// Classes that never appear verbatim in source code:
// - built dynamically from template literals (`course-outline-${tone}`, `is-${status}`, ...)
// - rendered at runtime by third-party libraries (CodeMirror, CopilotKit, KaTeX)
// When adding a new dynamic class family, add its prefix here with the construction site.
const ALIVE_PREFIXES = [
  "course-outline-", // course-outline-view.tsx / tool-card.tsx: `course-outline-${...}`
  "library-status-", // course-library-grid.tsx: `library-status-${tone}`
  "is-", // code-block-view.tsx: `is-${output.status}`
  "cm-", // CodeMirror editor DOM
  "copilotKit", // CopilotKit UI DOM
  "cpk", // CopilotKit Tailwind prefix (`cpk:*`)
  "katex", // KaTeX math rendering DOM
];

const SOURCE_DIRS = ["apps/web/src", "apps/agent/src", "packages"];
const SOURCE_EXTS = new Set([".ts", ".tsx", ".mts", ".js", ".jsx", ".mjs", ".html"]);

function collectSourceText(dir: string, chunks: string[]) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      collectSourceText(path, chunks);
    } else if (SOURCE_EXTS.has(entry.slice(entry.lastIndexOf(".")))) {
      chunks.push(readFileSync(path, "utf8"));
    }
  }
}

function extractClassSelectors(css: string): Set<string> {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const classNames = new Set<string>();
  const selectorRe = /([^{}]+)\{/g;
  let selectorMatch: RegExpExecArray | null;
  while ((selectorMatch = selectorRe.exec(noComments))) {
    const selector = selectorMatch[1];
    if (selector.includes("@")) continue;
    const classRe = /\.(-?[_a-zA-Z][\w-]*)/g;
    let classMatch: RegExpExecArray | null;
    while ((classMatch = classRe.exec(selector))) classNames.add(classMatch[1]);
  }
  return classNames;
}

describe("globals.css class usage", () => {
  it("only styles classes that exist in source code or on the dynamic/library allowlist", () => {
    const chunks: string[] = [];
    for (const dir of SOURCE_DIRS) collectSourceText(resolve(repoRoot, dir), chunks);
    const haystack = chunks.join("\n");

    const unused = [...extractClassSelectors(readFileSync(globalsCssPath, "utf8"))]
      .filter((name) => !ALIVE_PREFIXES.some((prefix) => name.startsWith(prefix)))
      .filter((name) => !haystack.includes(name))
      .sort();

    expect(
      unused,
      `globals.css styles classes with no reference anywhere in source. ` +
        `If a class is built dynamically or rendered by a library, add its prefix to ALIVE_PREFIXES; ` +
        `otherwise delete the dead rules.`,
    ).toEqual([]);
  });
});
