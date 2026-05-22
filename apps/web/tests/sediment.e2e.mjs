#!/usr/bin/env node
// Real end-to-end test for capability-library sedimentation.
// Boots the Next.js dev server, sends a visualization chat request through the
// streaming API, waits for an html_widget artifact, then verifies the widget
// was sedimented into the on-disk capability library and surfaces in /library?tab=apps.
//
// Usage: node apps/web/tests/sediment.e2e.mjs

import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const libraryFile = path.join(repoRoot, ".primoria-capability-library.json");
const backupFile = `${libraryFile}.e2e-backup`;

const PORT = process.env.PORT || "3105";
const BASE = `http://127.0.0.1:${PORT}`;
const PROMPT = "做一个牛顿摆动量传递的可视化 demo";
const MODEL_OVERRIDE = process.env.E2E_MODEL || "google/gemini-2.0-flash-exp:free";
const STREAM_TIMEOUT_MS = 120_000;
const SERVER_READY_TIMEOUT_MS = 90_000;

function log(...args) {
  process.stdout.write(`[sediment.e2e] ${args.join(" ")}\n`);
}

function backupAndClearLibraryFile() {
  if (fs.existsSync(backupFile)) {
    throw new Error(`stale backup exists at ${backupFile}; restore or remove it before rerunning`);
  }
  if (fs.existsSync(libraryFile)) {
    log("backing up pre-existing library file at", libraryFile);
    fs.copyFileSync(libraryFile, backupFile);
    fs.unlinkSync(libraryFile);
  }
}

function restoreLibraryFile() {
  if (fs.existsSync(backupFile)) {
    fs.copyFileSync(backupFile, libraryFile);
    fs.unlinkSync(backupFile);
  } else if (fs.existsSync(libraryFile)) {
    fs.unlinkSync(libraryFile);
  }
}

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < SERVER_READY_TIMEOUT_MS) {
    try {
      const res = await fetch(`${BASE}/library`, { method: "GET" });
      if (res.status < 500) {
        log("server is up after", Math.round((Date.now() - start) / 1000), "s");
        return;
      }
    } catch {
      /* retry */
    }
    await delay(750);
  }
  throw new Error(`server did not become ready within ${SERVER_READY_TIMEOUT_MS}ms`);
}

async function streamChat() {
  const controller = new AbortController();
  const hardTimeout = setTimeout(() => {
    log(`hard timeout after ${STREAM_TIMEOUT_MS}ms — aborting`);
    controller.abort(new Error("hard_timeout"));
  }, STREAM_TIMEOUT_MS);
  const heartbeat = setInterval(() => {
    log("…still waiting for stream chunks");
  }, 15_000);
  try {
    const res = await fetch(`${BASE}/api/tutor/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: PROMPT }],
        stream: true,
        settings: { provider: "openai-compatible", model: MODEL_OVERRIDE },
      }),
      signal: controller.signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`chat endpoint returned ${res.status}`);
    }

    const decoder = new TextDecoder();
    const reader = res.body.getReader();
    let buffer = "";
    const events = [];
    let widgetSeen = null;
    let finalSeen = false;
    let errorSeen = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl = buffer.indexOf("\n");
      while (nl !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        nl = buffer.indexOf("\n");
        if (!line) continue;
        let parsed;
        try {
          parsed = JSON.parse(line);
        } catch {
          continue;
        }
        events.push(parsed);
        if (parsed.type === "artifact" && parsed.artifact?.type === "html_widget") {
          widgetSeen = parsed.artifact;
          log("widget artifact streamed:", parsed.artifact.title, `(${parsed.artifact.html?.length ?? 0} bytes)`);
        } else if (parsed.type === "artifact_delta" && parsed.artifact?.type === "html_widget") {
          widgetSeen = parsed.artifact;
        } else if (parsed.type === "final") {
          finalSeen = true;
        } else if (parsed.type === "error") {
          errorSeen = parsed.reply;
        }
      }
    }
    return { events, widgetSeen, finalSeen, errorSeen };
  } finally {
    clearTimeout(hardTimeout);
    clearInterval(heartbeat);
  }
}

async function fetchLibraryAppsHtml() {
  const res = await fetch(`${BASE}/library?tab=apps`);
  if (!res.ok) throw new Error(`/library?tab=apps returned ${res.status}`);
  return res.text();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`assertion failed: ${message}`);
  }
}

async function main() {
  backupAndClearLibraryFile();

  log("starting Next.js dev server on port", PORT);
  const server = spawn("pnpm", ["--filter", "@primoria/web", "dev"], {
    cwd: repoRoot,
    env: { ...process.env, PORT },
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.on("data", (chunk) => {
    process.stdout.write(`[next] ${chunk.toString()}`);
  });
  server.stderr.on("data", (chunk) => {
    process.stderr.write(`[next:err] ${chunk.toString()}`);
  });

  let failed = false;
  let widgetSeen = null;
  let errorSeen = null;
  let libraryEntries = [];
  let libraryHtml = "";

  try {
    await waitForServer();

    log("sending chat request:", PROMPT);
    const result = await streamChat();
    widgetSeen = result.widgetSeen;
    errorSeen = result.errorSeen;

    if (errorSeen) throw new Error(`stream emitted error event: ${errorSeen}`);
    if (!result.finalSeen) throw new Error("stream did not emit a final event");
    assert(widgetSeen, "no html_widget artifact arrived in the stream — the LLM did not call render_interactive_widget");
    assert(widgetSeen.html && widgetSeen.html.length >= 200, `widget html was too short (${widgetSeen.html?.length ?? 0} bytes)`);

    // Give sedimentation fire-and-forget a moment to flush to disk.
    await delay(1000);

    assert(fs.existsSync(libraryFile), `expected library file to exist at ${libraryFile}`);
    const parsed = JSON.parse(fs.readFileSync(libraryFile, "utf8"));
    libraryEntries = Array.isArray(parsed?.apps) ? parsed.apps : [];
    log("library entries on disk:", libraryEntries.length);
    assert(libraryEntries.length >= 1, "expected at least one sedimented app entry");

    const newest = libraryEntries[0];
    assert(newest.template?.type === "html", "sedimented app template type should be 'html'");
    assert(newest.template.source?.length >= 200, "sedimented app html source should match widget html");
    assert(Array.isArray(newest.tags) && newest.tags.length > 0, "sedimented app should have at least one tag");

    libraryHtml = await fetchLibraryAppsHtml();
    assert(libraryHtml.includes("My Apps"), "/library?tab=apps should render the 'My Apps' tab");
    assert(libraryHtml.includes(newest.displayName), `/library?tab=apps should list sedimented app displayName "${newest.displayName}"`);

    log("ALL CHECKS PASSED");
    log("  widget title:", widgetSeen.title);
    log("  sedimented app id:", newest.id);
    log("  tags:", JSON.stringify(newest.tags));
  } catch (error) {
    failed = true;
    log("TEST FAILED:", error.message);
    if (widgetSeen) log("  observed widget:", widgetSeen.title);
    if (errorSeen) log("  observed stream error:", errorSeen);
    if (libraryEntries.length) log("  library had entries:", libraryEntries.length);
  } finally {
    log("shutting down dev server");
    try {
      server.stdout?.destroy();
      server.stderr?.destroy();
    } catch {
      /* ignore */
    }
    server.kill("SIGTERM");
    await delay(500);
    if (!server.killed) server.kill("SIGKILL");
    restoreLibraryFile();
  }

  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  log("fatal error:", err.message);
  process.exit(1);
});
