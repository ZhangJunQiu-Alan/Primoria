import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

// deepagents' FilesystemBackend feeds model-chosen patterns to fast-glob and
// micromatch. Both are overridden (root package.json) with picomatch/tinyglobby
// stand-ins so the unpatched `braces` package (GHSA-vfj7-8cjw-p6xm) is not in
// the production tree. These cases pin the stand-ins to fast-glob/micromatch
// semantics for every call shape deepagents uses.

const repoRoot = resolve(import.meta.dirname, "../../..");
const require = createRequire(import.meta.url);
const fastGlob = require(join(repoRoot, "packages/fast-glob-tinyglobby")) as (
  pattern: string,
  options?: Record<string, unknown>,
) => Promise<string[]>;
const micromatch = require(join(repoRoot, "packages/micromatch-picomatch")) as {
  isMatch: (str: string, patterns: string | string[], options?: Record<string, unknown>) => boolean;
};

const FILES = ["a.md", "b.ts", ".env", "docs/x.md", "docs/y.txt", "docs/deep/z.md", "src/app/page.tsx", "src/lib/util.ts", ".hidden/secret.md"];
let root = "";

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "glob-shim-"));
  for (const file of FILES) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), "x");
  }
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

const glob = async (pattern: string, options: Record<string, unknown>) =>
  (await fastGlob(pattern, { cwd: root, dot: true, ...options })).sort();

describe("deepagents glob stand-ins", () => {
  it("resolves deepagents through the stand-ins instead of fast-glob/micromatch", () => {
    const deepagentsDir = dirname(require.resolve("deepagents/package.json", { paths: [join(repoRoot, "apps/agent")] }));
    expect(require.resolve("fast-glob", { paths: [deepagentsDir] })).toBe(join(repoRoot, "packages/fast-glob-tinyglobby/index.js"));
    expect(require.resolve("micromatch", { paths: [deepagentsDir] })).toBe(join(repoRoot, "packages/micromatch-picomatch/index.js"));
  });

  it("matches fast-glob for file listing, dotfiles, and brace patterns", async () => {
    expect(await glob("**/*.md", { onlyFiles: true })).toEqual([".hidden/secret.md", "a.md", "docs/deep/z.md", "docs/x.md"]);
    expect(await glob("*.{md,ts}", { onlyFiles: true })).toEqual(["a.md", "b.ts"]);
    expect(await glob("src/**/*.{ts,tsx}", { onlyFiles: true })).toEqual(["src/app/page.tsx", "src/lib/util.ts"]);
    expect(await glob("**/*", { onlyFiles: true })).toHaveLength(FILES.length);
  });

  it("returns directories without trailing slashes and never expands bare directory names", async () => {
    expect(await glob("*", { onlyDirectories: true })).toEqual([".hidden", "docs", "src"]);
    expect(await glob("docs", { onlyFiles: true })).toEqual([]);
    expect(await glob("docs", { onlyDirectories: true })).toEqual(["docs"]);
  });

  it("returns absolute paths when asked", async () => {
    expect(await glob("docs/*.md", { onlyFiles: true, absolute: true })).toEqual([join(root, "docs/x.md")]);
  });

  it("matches micromatch.isMatch semantics including dot and braces", () => {
    expect(micromatch.isMatch("notes.md", "*.{md,txt}")).toBe(true);
    expect(micromatch.isMatch(".env", "*")).toBe(false);
    expect(micromatch.isMatch(".env", "*", { dot: true })).toBe(true);
    expect(micromatch.isMatch("src/app/page.tsx", "src/**/*.tsx", { dot: true })).toBe(true);
  });

  it("survives deeply nested brace patterns", async () => {
    const nested = `${"{a,".repeat(2000)}b${"}".repeat(2000)}`;
    await expect(glob(nested, { onlyFiles: true })).resolves.toEqual([]);
    expect(() => micromatch.isMatch("a", nested)).not.toThrow();
  });
});
