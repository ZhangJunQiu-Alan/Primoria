#!/usr/bin/env node
// Browser smoke for the workspace app-card flow.
// Usage against an existing dev server:
//   WORKSPACE_E2E_BASE=http://localhost:3000 node apps/web/tests/workspace-preview.e2e.mjs
// Without WORKSPACE_E2E_BASE it starts a Next dev server on PORT or 3110.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const libraryFile = path.join(repoRoot, ".primoria-capability-library.json");
const backupFile = `${libraryFile}.workspace-preview-backup`;
const PORT = process.env.PORT || "3110";
const BASE = process.env.WORKSPACE_E2E_BASE || `http://127.0.0.1:${PORT}`;
const SERVER_READY_TIMEOUT_MS = 90_000;
const RUN_ID = Date.now().toString(36);
const FIXTURE_APP_ID = `app_workspace_preview_${RUN_ID}`;
const FIXTURE_TITLE = `Workspace Preview Fixture ${RUN_ID}`;
const DIRECT_TITLE = `Direct Fixture ${RUN_ID}`;

function log(...args) {
  process.stdout.write(`[workspace-preview.e2e] ${args.join(" ")}\n`);
}

function assert(condition, message) {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function backupAndWriteLibraryFixture() {
  if (fs.existsSync(backupFile)) {
    throw new Error(`stale backup exists at ${backupFile}; restore or remove it before rerunning`);
  }
  if (fs.existsSync(libraryFile)) {
    fs.copyFileSync(libraryFile, backupFile);
  }

  const now = Date.now();
  const fixture = {
    id: FIXTURE_APP_ID,
    name: "workspace_preview_fixture",
    displayName: FIXTURE_TITLE,
    description: "A deterministic app used to verify workspace sharing and sandbox preview.",
    tags: ["workspace", "preview"],
    template: {
      type: "html",
      source: `
        <section style="padding:20px;font-family:system-ui">
          <h1>Workspace Preview Fixture Ready</h1>
          <p>This app rendered inside the sandboxed workspace preview.</p>
          <button data-prompt="Summarize the workspace preview fixture.">Send prompt</button>
        </section>
      `,
    },
    origin: { kind: "system_seed", seedId: "workspace-preview-e2e" },
    metadata: { createdAt: now, lastUsedAt: now, usageCount: 1 },
    archivedAt: null,
    version: 1,
  };

  fs.writeFileSync(libraryFile, `${JSON.stringify({ apps: [fixture] }, null, 2)}\n`, "utf8");
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
      const response = await fetch(`${BASE}/workspace`, { cache: "no-store" });
      if (response.status < 500) {
        log("server is ready");
        return;
      }
    } catch {
      /* retry */
    }
    await delay(750);
  }
  throw new Error(`server did not become ready within ${SERVER_READY_TIMEOUT_MS}ms`);
}

async function waitForFixtureApp() {
  const start = Date.now();
  while (Date.now() - start < SERVER_READY_TIMEOUT_MS) {
    try {
      const response = await fetch(`${BASE}/api/apps`, { cache: "no-store" });
      const data = await response.json();
      if (Array.isArray(data.apps) && data.apps.some((app) => app.id === FIXTURE_APP_ID)) return;
    } catch {
      /* retry */
    }
    await delay(250);
  }
  throw new Error(`fixture app ${FIXTURE_APP_ID} did not appear in /api/apps`);
}

function startServerIfNeeded() {
  if (process.env.WORKSPACE_E2E_BASE) return null;
  log("starting Next.js dev server on port", PORT);
  const server = spawn("pnpm", ["--filter", "@primoria/web", "dev"], {
    cwd: repoRoot,
    env: { ...process.env, PORT },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => process.stdout.write(`[next] ${chunk.toString()}`));
  server.stderr.on("data", (chunk) => process.stderr.write(`[next:err] ${chunk.toString()}`));
  return server;
}

async function main() {
  backupAndWriteLibraryFixture();
  const server = startServerIfNeeded();
  let browser;
  let failed = false;

  try {
    await waitForServer();
    await waitForFixtureApp();
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1360, height: 860 } });
    await page.goto(`${BASE}/workspace`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Attach" }).waitFor();

    const detailsClosed = await page.locator("details.workspace-side-drawer").evaluate((node) => !node.open);
    assert(detailsClosed, "workspace details drawer should be collapsed by default");
    await page.getByRole("button", { name: "Private" }).click();
    await page.getByRole("button", { name: "New chat" }).click();
    await page.locator(".workspace-mini-switcher").getByRole("button", { name: "Private" }).click();
    await page.getByLabel("Chat name").fill(DIRECT_TITLE);
    const participantSelect = page.getByLabel("Direct participant");
    const participantValue = await participantSelect.locator("option").nth(1).getAttribute("value");
    assert(participantValue, "direct participant select should expose workspace members");
    await participantSelect.selectOption(participantValue);
    await page.locator("form.workspace-quick-form").filter({ hasText: "Private" }).getByRole("button", { name: "Create" }).click();
    await page.locator(".workspace-chat-section", { hasText: "Private" }).getByText(DIRECT_TITLE).waitFor();

    await page.getByRole("button", { name: "Groups" }).click();

    await page.getByRole("button", { name: "Attach" }).click();
    await page.locator(`select[aria-label="Saved application"] option[value="${FIXTURE_APP_ID}"]`).waitFor({ state: "attached" });
    await page.locator('select[aria-label="Saved application"]').selectOption(FIXTURE_APP_ID);
    await page.getByRole("button", { name: "Share app" }).click();
    const appCard = page.locator(".workspace-app-card", { hasText: FIXTURE_TITLE }).last();
    await appCard.waitFor();
    fs.writeFileSync(libraryFile, `${JSON.stringify({ apps: [] }, null, 2)}\n`, "utf8");

    await appCard.getByRole("button", { name: "Open app" }).click();
    const dialog = page.getByRole("dialog", { name: FIXTURE_TITLE });
    await dialog.waitFor();
    await page.frameLocator(".workspace-preview-dialog iframe.widget-frame").getByText("Workspace Preview Fixture Ready").waitFor();

    const focusedLabel = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent || "");
    assert(/Close app preview|Close/.test(focusedLabel), "preview dialog should move focus to the close button");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });

    log("ALL CHECKS PASSED");
  } catch (error) {
    failed = true;
    log("TEST FAILED:", error.message);
  } finally {
    if (browser) await browser.close();
    if (server) {
      log("shutting down dev server");
      server.kill("SIGTERM");
      await delay(500);
      if (!server.killed) server.kill("SIGKILL");
    }
    restoreLibraryFile();
  }

  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  log("fatal:", error.message);
  restoreLibraryFile();
  process.exit(1);
});
