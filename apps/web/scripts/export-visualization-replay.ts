import { build } from "esbuild";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { AcceptanceManifestSchema, validateAcceptanceDistribution } from "../src/lib/interactive/acceptance";
import { parseInteractivePayload } from "../src/lib/interactive/payload";
import { reportReferenceCoverage } from "@primoria/contracts/artifacts/visualization-reference";
import { INTERACTIVE_CATALOG_HASH } from "@primoria/contracts/artifacts/interactive-catalog";
import { visualizationSourceFingerprint } from "./visualization-source-fingerprint";
import { assembleOfflineWidget } from "./visualization-replay/offline-widget";
import { normalizeInteractiveDiscipline } from "@primoria/contracts/artifacts/interactive-search";
import { referenceInventoryPath } from "../../../scripts/visualization-reference-path.mjs";

async function main() {
  const web = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const root = resolve(web, "../..");
  const args = process.argv.slice(2);
  const argument = (name: string) => { const index = args.indexOf(name); return index < 0 ? null : args[index + 1]; };
  const manifestPath = argument("--manifest");
  if (!manifestPath && !args.includes("--gallery-only")) throw new Error("Use --manifest <results.json> or --gallery-only; output is always a replay, never a new model request");
  const git = (...values: string[]) => execFileSync("git", values, { cwd: root, encoding: "utf8" }).trim();
  const manifest = AcceptanceManifestSchema.parse(manifestPath ? JSON.parse(await readFile(resolve(root, manifestPath), "utf8")) : {
    schemaVersion: 1, runId: `gallery-${new Date().toISOString().replace(/[:.]/g, "-")}`, seed: 0,
    frozenAt: new Date().toISOString(), scope: "platform-baseline", catalogHash: INTERACTIVE_CATALOG_HASH,
    codeRevision: git("rev-parse", "HEAD"), workingTreeHash: await visualizationSourceFingerprint(root),
    cases: [], checks: [{ name: "真实 20 条 Prompt", status: "not_run", detail: "组件样例页面，不是模型实测证据" }],
  });
  if (manifest.catalogHash !== INTERACTIVE_CATALOG_HASH) throw new Error("Captured catalog hash differs from the current production catalog; use the matching code revision for replay");
  if (manifest.cases.length || manifest.scope === "full-reference") {
    const errors = validateAcceptanceDistribution(manifest);
    if (errors.length) throw new Error(errors.join("\n"));
  }
  for (const entry of manifest.cases) for (const attempt of entry.attempts) if (attempt.payload) attempt.payload = parseInteractivePayload(attempt.payload);
  const catalog = JSON.parse(await readFile(resolve(root, "data/visualization-components/catalog.v1.json"), "utf8"));
  const gallery = catalog.components.filter((entry: { implementation: { status: string } }) => entry.implementation.status === "implemented").map((entry: { componentId: string; version: number; name: Record<string, string>; teachingPurpose: Record<string, string>; disciplineTags: string[]; configSchema: { default: Record<string, unknown> } }) => ({
    title: entry.name["zh-CN"], description: entry.teachingPurpose["zh-CN"], subject: normalizeInteractiveDiscipline(entry.disciplineTags[0]),
    payload: parseInteractivePayload({ componentId: entry.componentId, configVersion: entry.version, config: entry.configSchema.default }),
  }));
  let coverage = null;
  try {
    coverage = reportReferenceCoverage(JSON.parse(await readFile(referenceInventoryPath(), "utf8")), JSON.parse(await readFile(resolve(root, "data/visualization-components/reference-coverage.v1.json"), "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (manifest.scope === "full-reference" && (!coverage?.complete || manifest.cases.some((entry) => entry.attempts.at(-1)?.status !== "passed")
    || !manifest.checks.some((check) => check.name === "20 real-model prompts" && check.status === "passed")
    || manifest.checks.some((check) => check.status !== "passed"))) throw new Error("Full-reference replay requires verified coverage, all 20 cases passing, and no unresolved acceptance gates");
  const out = resolve(root, argument("--out") ?? resolve(root, "artifacts/visualization-acceptance", manifest.runId));
  await mkdir(out, { recursive: true });
  const fallbackWidgets: Record<string, { title: string; url: string }[]> = {};
  await mkdir(resolve(out, "fallbacks"), { recursive: true });
  for (const entry of manifest.cases) for (const [attemptIndex, attempt] of entry.attempts.entries()) {
    for (const call of attempt.toolCalls.filter((item) => item.name === "widgetRenderer")) {
      const widget = assembleOfflineWidget(call.args);
      if (!widget) continue;
      const url = `fallbacks/${createHash("sha256").update(`${entry.caseId}:${attemptIndex}:${call.id}`).digest("hex").slice(0, 24)}.html`;
      await writeFile(resolve(out, url), widget.html);
      (fallbackWidgets[`${entry.caseId}:${attemptIndex}`] ??= []).push({ title: widget.title, url });
    }
  }
  if (manifestPath) {
    const source = dirname(resolve(root, manifestPath));
    for (const entry of manifest.cases) for (const attempt of entry.attempts) if (attempt.screenshot && source !== out) {
      await copyFile(resolve(source, attempt.screenshot), resolve(out, attempt.screenshot));
    }
  }
  await build({
    entryPoints: [resolve(web, "scripts/visualization-replay/main.tsx")], outdir: resolve(out, "assets"),
    entryNames: "replay", chunkNames: "chunks/[name]-[hash]", bundle: true, splitting: true,
    format: "esm", platform: "browser", target: "es2022", minify: true, jsx: "automatic",
    tsconfig: resolve(web, "tsconfig.json"), define: { "process.env.NODE_ENV": '"production"' },
  });
  const rendererSource = { exportedAt: new Date().toISOString(), codeRevision: git("rev-parse", "HEAD"), workingTreeHash: await visualizationSourceFingerprint(root), catalogHash: INTERACTIVE_CATALOG_HASH };
  const results = { manifest, gallery, coverage, rendererSource, fallbackWidgets };
  await writeFile(resolve(out, "results.json"), JSON.stringify(results, null, 2));
  const encoded = JSON.stringify(results).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  await writeFile(resolve(out, "index.html"), `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' data: blob:; frame-src 'self'; connect-src 'none'"><title>Primoria · 可视化验收记录</title><link rel="stylesheet" href="./assets/replay.css"></head><body><div id="root"></div><script id="replay-data" type="application/json">${encoded}</script><script type="module" src="./assets/replay.js"></script></body></html>`);
  async function files(path: string): Promise<string[]> {
    const entries = await readdir(path, { withFileTypes: true });
    return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(resolve(path, entry.name)) : [resolve(path, entry.name)]))).flat();
  }
  const hashes = await Promise.all((await files(out)).filter((path) => !path.endsWith("hashes.json")).map(async (path) => ({ path: relative(out, path), sha256: createHash("sha256").update(await readFile(path)).digest("hex") })));
  await writeFile(resolve(out, "hashes.json"), JSON.stringify(hashes, null, 2));
  console.log(`[visualization-replay] ${out}/index.html (${manifest.cases.length} frozen inputs, ${manifest.cases.filter((entry) => entry.attempts.length).length} executed cases, ${gallery.length} components; scope=${manifest.scope})`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
