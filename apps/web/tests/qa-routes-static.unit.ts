#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

const here = dirname(fileURLToPath(import.meta.url));
const src = (path: string) => readFileSync(resolve(here, "../src", path), "utf8");

function main() {
  const resultsRoute = src("app/api/qa/batch-visual-mode/results/route.ts");
  assert(resultsRoute.includes("isQaResultsWriteAllowed"), "QA results API has an explicit route gate");
  assert(resultsRoute.includes('process.env.NODE_ENV !== "production"'), "QA results API is disabled in production");
  assert(resultsRoute.includes('process.env.PRIMORIA_ENABLE_QA_ROUTES === "1"'), "QA results API requires the QA env flag");
  assert(resultsRoute.includes("MAX_QA_RESULTS_BODY_BYTES"), "QA results API caps request body size");
  assert(resultsRoute.includes("await request.text()"), "QA results API measures raw body size before parsing");

  for (const pagePath of [
    "app/qa/widget-renderer/page.tsx",
    "app/qa/batch-visual-mode/page.tsx",
    "app/qa/interactive-visual-results/page.tsx",
  ]) {
    const page = src(pagePath);
    assert(page.includes('process.env.NODE_ENV === "production"'), `${pagePath} is hidden in production`);
    assert(page.includes('process.env.PRIMORIA_ENABLE_QA_ROUTES !== "1"'), `${pagePath} requires the QA env flag`);
    assert(page.includes("notFound()"), `${pagePath} returns notFound when QA routes are disabled`);
  }

  process.stdout.write("[qa-routes-static.unit] ALL CHECKS PASSED\n");
}

main();
