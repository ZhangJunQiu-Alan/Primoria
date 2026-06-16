#!/usr/bin/env tsx

import { normalizeWidgetHtml, repairYieldGenerators } from "../src/lib/agent-os/index.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`assertion failed: ${message}`);
  }
}

async function main() {
  const brokenMinimaxScript = `
    function bubbleStepsGenerator(initArr) {
      var arr = initArr.slice();
      yield { type: 'compare', arr: arr.slice() };
    }
    function label() { return 'yield should not matter inside this string'; }
  `;
  const repaired = repairYieldGenerators(brokenMinimaxScript);
  assert(
    repaired.includes("function* bubbleStepsGenerator(initArr)"),
    "repairs a normal function containing yield into a generator",
  );
  assert(
    repaired.includes("function label()"),
    "does not rewrite functions that only contain yield inside a string",
  );

  const html = `<!DOCTYPE html>
    <html>
      <head><style>.bar{height:20px}</style></head>
      <body>
        <div id="chartArea"></div>
        <script>${brokenMinimaxScript}</script>
      </body>
    </html>`;
  const normalized = normalizeWidgetHtml(html);
  assert(!/<!doctype|<\/?html|<\/?head|<\/?body/i.test(normalized), "strips full-document wrappers");
  assert(normalized.includes("<style>.bar{height:20px}</style>"), "preserves head style assets");
  assert(
    normalized.includes("function* bubbleStepsGenerator(initArr)"),
    "repairs generator syntax inside script tags",
  );

  process.stdout.write("[widget-html.unit] ALL UNIT CHECKS PASSED\n");
}

main().catch((error) => {
  process.stderr.write(`[widget-html.unit] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
