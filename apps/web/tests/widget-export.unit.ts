#!/usr/bin/env tsx

import {
  assembleWidgetStandaloneHtml,
} from "../src/components/generative-ui/export-utils.ts";
import { WIDGET_DEPENDENCY_ALLOWLIST, normalizeWidgetDependencies } from "../src/lib/ai/widget-dependencies.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

async function main() {
  const deps = normalizeWidgetDependencies([
    { url: "https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js", global: "d3", kind: "script" },
    { url: "https://evil.example/not-allowed.js", global: "evil", kind: "script" },
    { url: "https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js", global: "d3", kind: "script" },
  ]);
  assert(deps.length === 1, "only whitelisted unique dependencies are preserved");
  assert(deps[0]?.global === "d3", "allowed dependency keeps canonical global");

  const widgetHtml = assembleWidgetStandaloneHtml({
    title: "<Sorting & Search>",
    html: `<div id="demo">ready</div><script>document.getElementById('demo').textContent='ok'</script>`,
    dependencies: deps,
  });
  assert(widgetHtml.startsWith("<!DOCTYPE html>"), "widget export is a complete document");
  assert(widgetHtml.includes("&lt;Sorting &amp; Search&gt;"), "widget title is escaped");
  assert(widgetHtml.includes("https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"), "allowed dependency is emitted");
  assert(!widgetHtml.includes("evil.example"), "blocked dependency is not emitted");
  assert(widgetHtml.includes("Content-Security-Policy") || widgetHtml.includes("importmap"), "widget export carries runtime metadata");

  const threeDeps = normalizeWidgetDependencies([
    WIDGET_DEPENDENCY_ALLOWLIST.THREE,
    { url: "https://cdn.jsdelivr.net/npm/three@0.181.2/build/three.min.js", global: "THREE", kind: "script" },
  ]);
  assert(threeDeps.length === 1, "Three.js keeps only the supported canonical dependency");
  assert(
    threeDeps[0]?.url === "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js",
    "Three.js dependency points at the available UMD build",
  );
  const threeWidgetHtml = assembleWidgetStandaloneHtml({
    title: "Three controls",
    html: `<script>new THREE.OrbitControls(new THREE.PerspectiveCamera(), document.body)</script>`,
    dependencies: threeDeps,
  });
  assert(threeWidgetHtml.includes("installThreeOrbitControlsFallback"), "standalone export includes OrbitControls fallback");

  process.stdout.write("[widget-export.unit] ALL UNIT CHECKS PASSED\n");
}

main().catch((error) => {
  process.stderr.write(`[widget-export.unit] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
