#!/usr/bin/env tsx

import { readFileSync } from "node:fs";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

async function main() {
  const source = readFileSync(new URL("../src/components/generative-ui/widget-renderer.tsx", import.meta.url), "utf8");

  assert(
    source.includes("WIDGET_DEPENDENCY_PRELOAD_TIMEOUT_MS = 8000"),
    "widget dependencies have a bounded preload timeout",
  );
  assert(source.includes("function preloadWidgetDependency"), "widget dependencies are preloaded on demand");
  assert(source.includes('link.rel = "preload"'), "preload hint uses browser resource preloading");
  assert(source.includes("DEPENDENCY_LOAD_TIMEOUT_MS = 8000"), "iframe dependency loader has a bounded timeout");
  assert(source.includes("Dependency timed out"), "dependency timeout is surfaced inside the iframe");
  assert(source.includes("Script timed out"), "external script timeout is surfaced inside the iframe");
  assert(source.includes("data-primoria-dep-loaded"), "loaded dependency tags are marked for reuse");
  assert(
    source.includes("Visual resources are taking longer than expected"),
    "slow preload fallback gives the learner a friendly status",
  );

  process.stdout.write("[widget-renderer-preload.unit] ALL UNIT CHECKS PASSED\n");
}

main().catch((error) => {
  process.stderr.write(`[widget-renderer-preload.unit] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
