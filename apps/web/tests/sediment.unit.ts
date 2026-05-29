#!/usr/bin/env tsx
// Deterministic unit test for the capability-library sedimentation pipeline.
// Runs with `pnpm dlx tsx apps/web/tests/sediment.unit.ts` (or via `npx tsx`).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const libraryFile = path.join(repoRoot, ".primoria-capability-library.json");
const backupFile = `${libraryFile}.test-backup`;

import { sedimentWidget } from "../src/lib/capability-library/sedimentation.ts";
import {
  findAppByHtmlSignature,
  getApp,
  hashHtmlSource,
  listApps,
} from "../src/lib/capability-library/store.ts";

function log(...args: unknown[]): void {
  process.stdout.write(`[sediment.unit] ${args.map(String).join(" ")}\n`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`assertion failed: ${message}`);
  }
}

function backupAndClear() {
  if (fs.existsSync(libraryFile)) {
    fs.copyFileSync(libraryFile, backupFile);
    fs.unlinkSync(libraryFile);
  }
}

function restoreBackup() {
  if (fs.existsSync(backupFile)) {
    fs.copyFileSync(backupFile, libraryFile);
    fs.unlinkSync(backupFile);
  } else if (fs.existsSync(libraryFile)) {
    fs.unlinkSync(libraryFile);
  }
}

function makeWidget(title: string, html: string) {
  return { type: "html_widget" as const, title, description: "Test widget", html };
}

function makePlan() {
  return {
    type: "visualization_plan" as const,
    title: "Newton's cradle",
    approach: "Animate momentum transfer across five balls",
    technology: "SVG + JavaScript",
    keyElements: ["five suspended spheres", "elastic collision", "user-adjustable mass"],
  };
}

async function main() {
  backupAndClear();
  let failed = false;
  try {
    const longHtml = `<div class="cradle">${"<span class='ball'/>".repeat(40)}<script>console.log('ok')</script></div>`;
    assert(longHtml.length >= 200, "fixture html long enough");

    // Case 1
    const widget = makeWidget("牛顿摆 momentum demo", longHtml);
    const plan = makePlan();
    const result = await sedimentWidget(widget, plan, { userQuestion: "做一个牛顿摆的可视化" });
    log("case1 saved?", result.saved, result.saved ? result.app.id : (result as { reason: string }).reason);
    assert(result.saved === true, "case1: widget should sediment");
    assert(result.app.displayName === "牛顿摆 momentum demo", "case1: displayName matches");
    assert(result.app.template.type === "html", "case1: template type");
    assert(result.app.template.source === longHtml, "case1: template source");
    assert(result.app.tags.includes("simulation"), "case1: tags include simulation");
    assert(result.app.tags.includes("svg"), "case1: tags derive svg from technology");
    assert(result.app.origin.kind === "agent_generated", "case1: origin kind");
    assert(
      result.app.origin.kind === "agent_generated" && result.app.origin.sourceQuestion === "做一个牛顿摆的可视化",
      "case1: sourceQuestion captured",
    );
    assert(result.app.metadata.usageCount === 1, "case1: initial usage count");

    // Case 2: duplicate
    const dup = await sedimentWidget(widget, plan, {});
    log("case2 dup:", JSON.stringify(dup));
    assert(dup.saved === false && dup.reason === "duplicate", "case2: duplicate rejected");

    // Case 3: too short
    const shortResult = await sedimentWidget(makeWidget("short", "<div>tiny</div>"), null, {});
    log("case3 short:", JSON.stringify(shortResult));
    assert(
      shortResult.saved === false && shortResult.reason === "html_too_short",
      "case3: short rejected",
    );

    // Case 4: empty title
    const noTitleResult = await sedimentWidget(
      makeWidget("   ", longHtml.replace("cradle", "cradle-no-title")),
      null,
      {},
    );
    log("case4 noTitle:", JSON.stringify(noTitleResult));
    assert(
      noTitleResult.saved === false && noTitleResult.reason === "empty_title",
      "case4: empty title rejected",
    );

    // Case 5: listApps + on-disk
    const apps = await listApps();
    log("case5 listApps count:", apps.length);
    assert(apps.length >= 1, "case5: at least one entry");
    assert(
      apps.some((a) => a.displayName === "牛顿摆 momentum demo"),
      "case5: saved app appears",
    );
    assert(fs.existsSync(libraryFile), "case5: JSON file exists");
    const parsed = JSON.parse(fs.readFileSync(libraryFile, "utf8")) as {
      apps?: Array<{ template: { type: string; source: string } }>;
    };
    assert(Array.isArray(parsed.apps) && parsed.apps.length >= 1, "case5: JSON has apps");

    // Case 5b: direct lookup powers workspace app previews
    const loadedApp = await getApp(result.app.id);
    assert(loadedApp?.id === result.app.id, "case5b: getApp locates saved app");
    assert(loadedApp.template.type === "html" && loadedApp.template.source === longHtml, "case5b: getApp returns HTML source");

    // Case 6: hash lookup
    const sig = hashHtmlSource(longHtml);
    const found = await findAppByHtmlSignature(sig);
    log("case6 signature lookup found?", !!found);
    assert(!!found, "case6: findAppByHtmlSignature locates saved app");

    log("ALL UNIT CHECKS PASSED");
  } catch (err) {
    failed = true;
    log("UNIT TEST FAILED:", (err as Error).message);
  } finally {
    restoreBackup();
  }
  process.exit(failed ? 1 : 0);
}

void main().catch((err) => {
  log("fatal:", (err as Error).message);
  process.exit(1);
});
