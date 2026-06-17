#!/usr/bin/env tsx

import {
  assembleStemStandaloneHtml,
  assembleWidgetStandaloneHtml,
} from "../src/components/generative-ui/export-utils.ts";
import { WIDGET_DEPENDENCY_ALLOWLIST, normalizeWidgetDependencies } from "../src/lib/agent-os/index.ts";

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

  const stemHtml = assembleStemStandaloneHtml({
    subject: "math",
    title: "Sine curve",
    description: "A small math fixture",
    code: "const scene = MathGL.scene({ title: 'sine' }); scene.plot(x => Math.sin(x)); scene.run();",
  });
  assert(stemHtml.startsWith("<!DOCTYPE html>"), "STEM export is a complete document");
  assert(stemHtml.includes("MathGL"), "STEM export includes the runtime");
  assert(stemHtml.includes("runStemCode"), "STEM export includes the execution wrapper");

  const blockedStemHtml = assembleStemStandaloneHtml({
    subject: "cs",
    title: "Blocked",
    description: "Should not execute",
    code: "fetch('/api/secret'); const scene = AlgoViz.scene({ title: 'x' }); scene.run();",
  });
  assert(blockedStemHtml.includes("STEM renderer code was blocked"), "blocked STEM export displays a safety error");
  assert(!blockedStemHtml.includes("fetch('/api/secret')"), "blocked STEM export does not embed unsafe code");

  const threeDeps = normalizeWidgetDependencies([
    WIDGET_DEPENDENCY_ALLOWLIST.THREE,
    { url: "https://cdn.jsdelivr.net/npm/three@0.181.2/build/three.min.js", global: "THREE", kind: "script" },
  ]);
  assert(threeDeps.length === 1, "Three.js keeps only the supported canonical dependency");
  assert(
    threeDeps[0]?.url === WIDGET_DEPENDENCY_ALLOWLIST.THREE.url,
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
