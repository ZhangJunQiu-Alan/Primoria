#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");

const PORT = process.env.PORT || "3117";
const BASE = `http://127.0.0.1:${PORT}`;
const ROUTE = `${BASE}/qa/widget-renderer`;
const READY_TIMEOUT_MS = 90_000;

function log(...args) {
  process.stdout.write(`[widget-renderer.e2e] ${args.join(" ")}\n`);
}

function assert(condition, message) {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < READY_TIMEOUT_MS) {
    try {
      const res = await fetch(ROUTE);
      if (res.status < 500) return;
    } catch {
      // retry
    }
    await delay(750);
  }
  throw new Error(`server did not become ready at ${ROUTE}`);
}

async function main() {
  log("starting Next.js dev server on port", PORT);
  const server = spawn("pnpm", ["--filter", "@primoria/web", "dev"], {
    cwd: repoRoot,
    env: { ...process.env, PORT, PRIMORIA_ENABLE_QA_ROUTES: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.on("data", (chunk) => process.stdout.write(`[next] ${chunk.toString()}`));
  server.stderr.on("data", (chunk) => process.stderr.write(`[next:err] ${chunk.toString()}`));

  let browser;
  let failed = false;
  let screenshotPath = "";

  try {
    await waitForServer();
    log("server ready:", ROUTE);

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      acceptDownloads: true,
      permissions: ["clipboard-read", "clipboard-write"],
    });
    await context.addCookies([{ name: "primoria_session", value: "widget-renderer-e2e", url: BASE }]);
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto(ROUTE, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Widget renderer QA fixture" }).waitFor();

    const streamFrame = page.frameLocator('iframe[title="Streaming fixture"]');
    await streamFrame.locator("#stream-status").waitFor();
    await streamFrame.locator("#stream-status", { hasText: "preview only" }).waitFor();
    await page.getByTestId("push-stream-final").click();
    await streamFrame.locator("#stream-status", { hasText: "final preview" }).waitFor();
    const previewStatus = await streamFrame.locator("#stream-status").textContent();
    assert(previewStatus === "final preview", "streaming preview should update DOM without executing scripts");
    await streamFrame.locator("#stream-status", { hasText: "executed 1" }).waitFor({ timeout: 5000 });
    await streamFrame.locator("#stream-action").click();
    await streamFrame.locator("#stream-action", { hasText: "Clicked 1" }).waitFor();

    const badFrame = page.frameLocator('iframe[title="Bad fixture"]');
    await badFrame.getByText("Widget script error: fixture bad widget").waitFor({ timeout: 5000 });

    await page.getByText("Widget returned empty HTML.").waitFor({ timeout: 5000 });

    const unclosedFrame = page.frameLocator('iframe[title="Unclosed fixture"]');
    await unclosedFrame.getByText("Widget script tag is incomplete").waitFor({ timeout: 5000 });

    const threeFrame = page.frameLocator('iframe[title="Three dependency fixture"]');
    await threeFrame.locator("#three-status", { hasText: "THREE OrbitControls ok" }).waitFor({ timeout: 10000 });

    const isolationFrameElement = page.locator('iframe[title="Isolation fixture"]');
    assert((await isolationFrameElement.getAttribute("sandbox")) === "allow-scripts", "widget iframe should use an opaque-origin script sandbox");
    const isolationFrame = page.frameLocator('iframe[title="Isolation fixture"]');
    await isolationFrame.locator("#parent-access", { hasText: "parent blocked" }).waitFor({ timeout: 5000 });
    await isolationFrame.locator("#storage-access", { hasText: "storage blocked" }).waitFor({ timeout: 5000 });

    const bridgeFrame = page.frameLocator('iframe[title="Bridge fixture"]');
    await bridgeFrame.locator("#prompt-bridge").click();
    await page.getByTestId("bridge-prompt").getByText("Explain the bridge fixture", { exact: true }).waitFor({ timeout: 5000 });

    let unexpectedPopup = null;
    const captureUnexpectedPopup = (popup) => {
      unexpectedPopup = popup;
    };
    context.on("page", captureUnexpectedPopup);
    await bridgeFrame.locator("#invalid-link").click();
    await delay(400);
    context.off("page", captureUnexpectedPopup);
    if (unexpectedPopup) await unexpectedPopup.close();
    assert(unexpectedPopup === null, "non-HTTPS bridge URLs should not open a popup");

    const validPopupPromise = context.waitForEvent("page");
    await bridgeFrame.locator("#valid-link").click();
    const validPopup = await validPopupPromise;
    await delay(200);
    assert(validPopup.url().startsWith("https://example.com/primoria-widget-bridge"), "HTTPS bridge URL should open through the host");
    await validPopup.close();

    const canonicalDependencyFrame = page.frameLocator('iframe[title="Canonical dependency fixture"]');
    await canonicalDependencyFrame.locator("#canonical-chart-status", { hasText: "canonical Chart loaded" }).waitFor({ timeout: 10000 });
    assert(
      (await canonicalDependencyFrame.locator("[data-primoria-widget-error]").count()) === 0,
      "known dependency version drift should use the canonical URL without a widget error",
    );

    const mathFrame = page.frameLocator('iframe[title="Math fixture"]');
    await mathFrame.locator("canvas").first().waitFor({ timeout: 5000 });
    const csFrame = page.frameLocator('iframe[title="CS fixture"]');
    await csFrame.locator("canvas").first().waitFor({ timeout: 5000 });

    const physicsCanvas = page.frameLocator('iframe[title="Physics fixture"]').locator("canvas").first();
    const physicsError = page.getByText("Physics runtime error");
    try {
      await physicsCanvas.waitFor({ timeout: 8000 });
    } catch {
      await physicsError.waitFor({ timeout: 2000 });
    }

    await page.getByTestId("export-menu-streaming-fixture").click();
    await page.getByTestId("copy-standalone-streaming-fixture").click();
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    assert(clipboardText.startsWith("<!DOCTYPE html>"), "copy exports standalone HTML");
    assert(clipboardText.includes("Streaming fixture"), "copied standalone HTML includes widget title");

    await page.getByTestId("export-menu-streaming-fixture").click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("download-standalone-streaming-fixture").click();
    const download = await downloadPromise;
    assert((await download.suggestedFilename()).endsWith(".html"), "download exports an HTML file");

    const screenshotDir = await mkdtemp(path.join(os.tmpdir(), "primoria-widget-e2e-"));
    screenshotPath = path.join(screenshotDir, "widget-renderer-fixture.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const relevantErrors = consoleErrors.filter((message) => !message.includes("fixture bad widget"));
    assert(relevantErrors.length === 0, `unexpected console errors: ${relevantErrors.join(" | ")}`);

    log("ALL CHECKS PASSED");
    log("screenshot:", screenshotPath);
  } catch (error) {
    failed = true;
    log("TEST FAILED:", error instanceof Error ? error.message : String(error));
    if (screenshotPath) log("screenshot:", screenshotPath);
  } finally {
    if (browser) await browser.close();
    log("shutting down dev server");
    server.kill("SIGTERM");
    await delay(500);
    if (!server.killed) server.kill("SIGKILL");
  }

  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  log("fatal:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
