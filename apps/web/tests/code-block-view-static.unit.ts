#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function main() {
  const view = read("src/components/course/code-block-view.tsx");
  const blockRenderer = read("src/components/course/block-renderer.tsx");
  const detail = read("src/components/course/course-detail-client.tsx");
  const route = read("src/app/api/courses/[id]/blocks/[blockId]/route.ts");
  const store = read("src/lib/courses/store.ts");
  const worker = read("src/lib/code-runner/worker.ts");
  const index = read("src/lib/code-runner/index.ts");
  const types = read("src/lib/courses/types.ts");

  // CodeBlock type carries originalCode for restore.
  assert(types.includes("originalCode?: string"), "CodeBlock type has originalCode field");

  // Run button only appears for runnable languages.
  assert(view.includes("runnableLanguage(block.language)"), "view gates on runnable language");
  assert(view.includes("keep the read-only view"), "non-runnable languages stay read-only");

  // Editor + the three actions exist.
  assert(view.includes("@uiw/react-codemirror"), "view uses CodeMirror editor");
  assert(view.includes("▶ 运行") || view.includes("运行"), "view has Run button");
  assert(view.includes("恢复初始代码"), "view has restore-original button");
  assert(view.includes("handleSave"), "view has save handler");
  assert(view.includes("正在加载运行环境"), "view surfaces the Pyodide loading status");

  // Save persists via PATCH and tracks dirty/baseline.
  assert(view.includes("method: \"PATCH\""), "save uses PATCH");
  assert(view.includes("const dirty = code !== savedCode"), "view tracks unsaved edits");
  // External block.code changes are adopted only when the editor is clean.
  assert(view.includes("block.code !== syncedCode"), "view syncs external block.code updates");
  assert(view.includes("if (code === savedCode)"), "external sync preserves unsaved edits");
  assert(view.includes("beforeunload"), "view warns on unsaved leave");

  // Saved code is lifted into the parent course state (Copilot context + remount).
  assert(view.includes("onSaved?.(") , "view notifies parent on save");
  assert(blockRenderer.includes("onBlockUpdated") && blockRenderer.includes("onSaved={onBlockUpdated}"), "block-renderer threads the save callback");
  assert(detail.includes("updateBlockInCourse") && detail.includes("onBlockUpdated={updateBlockInCourse}"), "course detail updates course state on block save");

  // Output panel renders stdout/stderr/images.
  assert(view.includes("course-code-output-image"), "view renders matplotlib images");
  assert(view.includes("course-code-output-stderr"), "view renders stderr");

  // Runner kernel: 5s timeout + worker terminate.
  assert(index.includes("EXEC_TIMEOUT_MS = 5000"), "runner enforces a 5s execution timeout");
  assert(index.includes("killWorker()"), "runner terminates the worker on timeout");
  // Execution clock starts only when the worker reports "running" — Pyodide
  // cold-load must not count toward the 5s exec timeout.
  assert(index.includes('data.phase === "running") armExecTimer()'), "exec timer starts at running, not at dispatch");
  assert(index.includes("LOAD_TIMEOUT_MS"), "runtime load has its own generous watchdog");
  // Concurrent runs must be serialized (shared worker + timeout correctness).
  assert(index.includes("queue.then(exec, exec)"), "runner serializes concurrent runs on a queue");

  // Worker: blocks input(), forces AGG backend, captures console.
  assert(worker.includes("暂不支持输入"), "python harness blocks input()");
  assert(worker.includes("MPLBACKEND") && worker.includes("AGG"), "matplotlib forced to AGG backend");
  assert(worker.includes("loadPackagesFromImports"), "python auto-loads imported packages");
  // Unimplemented console.* methods must be no-ops, not crashes.
  assert(worker.includes("new Proxy(sink"), "JS console proxies unknown methods to a no-op");

  // PATCH route: code branch + auth + originalCode backfill.
  assert(route.includes('z.literal("code")'), "route accepts code patches");
  assert(route.includes("getCurrentUser"), "route resolves the owner for auth scoping");
  assert(route.includes("requireAuth") && route.includes("if (denied) return denied"), "route returns 401 on expired session, not 404");
  assert(route.includes("not a code block") && route.includes("status: 400"), "route maps not_code to 400");
  // Single-read save: backfill lives in the store helper, route calls it once.
  assert(route.includes("saveCodeBlockSource"), "route uses the single-read save helper");
  assert(!route.includes("getCourse"), "route no longer double-reads the course");
  assert(store.includes("export async function saveCodeBlockSource"), "store exposes single-read code-block save");
  assert(store.includes("prev.originalCode ?? prev.code"), "store backfills originalCode on first save");

  console.log("code-block-view-static.unit: OK");
}

main();
