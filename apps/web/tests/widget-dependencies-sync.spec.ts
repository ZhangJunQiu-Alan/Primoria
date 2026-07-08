import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { WIDGET_DEPENDENCY_ALLOWLIST } from "../src/lib/ai/widget-dependencies";

type DependencyRecord = Record<string, { global: string; url: string; kind: string }>;

const graphSource = readFileSync(
  fileURLToPath(new URL("../../agent/src/graph.mjs", import.meta.url)),
  "utf8",
);

const widgetRendererSource = readFileSync(
  fileURLToPath(new URL("../src/components/generative-ui/widget-renderer.tsx", import.meta.url)),
  "utf8",
);

function extractDependencyObject(source: string, declaration: string): DependencyRecord {
  const start = source.indexOf(declaration);
  expect(start, `missing ${declaration}`).toBeGreaterThanOrEqual(0);
  const blockStart = source.indexOf("{", start);
  const blockEnd = source.indexOf("\n};", blockStart);
  expect(blockStart, `missing object start for ${declaration}`).toBeGreaterThanOrEqual(0);
  expect(blockEnd, `missing object end for ${declaration}`).toBeGreaterThan(blockStart);

  const block = source.slice(blockStart, blockEnd);
  const entries: DependencyRecord = {};
  for (const match of block.matchAll(
    /(\w+): \{ global: ["']([^"']+)["'], url: ["']([^"']+)["'], kind: ["']([^"']+)["'] \}/g,
  )) {
    entries[match[1]!] = { global: match[2]!, url: match[3]!, kind: match[4]! };
  }
  return entries;
}

describe("widget dependency allowlists", () => {
  it("keeps the web normalizer, agent allowlist, and iframe runtime in sync", () => {
    const web = WIDGET_DEPENDENCY_ALLOWLIST as DependencyRecord;
    const agent = extractDependencyObject(graphSource, "const WIDGET_DEPENDENCY_ALLOWLIST =");
    const iframe = extractDependencyObject(widgetRendererSource, "var COMMON_DEPENDENCIES =");

    expect(agent).toEqual(web);
    expect(iframe).toEqual(web);
  });
});
