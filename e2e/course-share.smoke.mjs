#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import * as playwright from "playwright";

const requireFromWeb = createRequire(new URL("../apps/web/package.json", import.meta.url));
const postgres = requireFromWeb("postgres");
const PORT = process.env.COURSE_SHARE_WEB_PORT || "3124";
const BASE_URL = `http://localhost:${PORT}`;
const COURSE_ID = "crs_ci_share_smoke";
const RECEIVER_ID = "usr_ci_share_receiver";
const PASSWORD = "CiShareSmoke123!";
const screenshotPath = path.resolve("test-results/course-share-failure.png");
const browserName = process.env.REGRESSION_BROWSER || "chromium";
const browserType = playwright[browserName];

if (!browserType || typeof browserType.launch !== "function") {
  throw new Error(`Unsupported REGRESSION_BROWSER: ${browserName}`);
}

const databaseName = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL).pathname.replace(/^\//, "")
  : "";
if (process.env.CI_SHARE_SMOKE !== "1" || !/test/i.test(databaseName)) {
  throw new Error("CI_SHARE_SMOKE=1 and a test DATABASE_URL are required");
}

function assert(condition, message) {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

async function waitForWeb(server) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Next.js exited with code ${server.exitCode}`);
    try {
      const response = await fetch(`${BASE_URL}/auth/sign-in`);
      if (response.status < 500) return;
    } catch {}
    await delay(500);
  }
  throw new Error(`web server did not become ready at ${BASE_URL}`);
}

async function signIn(page, email, next) {
  await page.goto(`${BASE_URL}/auth/sign-in?next=${encodeURIComponent(next)}`, { waitUntil: "domcontentloaded" });
  const passwordInput = page.locator('input[type="password"]');
  const visibilityButton = page.locator(".auth-password-control button");
  const deadline = Date.now() + 30_000;
  let hydrated = false;
  while (Date.now() < deadline) {
    await passwordInput.fill("");
    await passwordInput.fill(PASSWORD);
    if (await visibilityButton.isEnabled()) {
      hydrated = true;
      break;
    }
    await delay(100);
  }
  if (!hydrated) throw new Error("authentication form did not hydrate");
  await page.locator('input[type="email"]').fill(email);
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => candidate.url().endsWith("/api/auth/sign-in") && candidate.request().method() === "POST"),
    page.locator('button[type="submit"]').click(),
  ]);
  assert(response.ok(), `sign-in should succeed for ${email}`);
}

async function verifyImport(shareId) {
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, onnotice: () => {} });
  try {
    const rows = await sql`
      select id, owner_id, imported_from_share_id
      from courses
      where owner_id = ${RECEIVER_ID} and imported_from_share_id = ${shareId}
    `;
    assert(rows.length === 1, "receiver should own exactly one imported course for the share series");
    assert(rows[0].owner_id === RECEIVER_ID, "import must remain owner-scoped");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const web = spawn("pnpm", ["--filter", "@primoria/web", "dev"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT },
  stdio: ["ignore", "pipe", "pipe"],
  detached: process.platform !== "win32",
});
web.stdout.on("data", (chunk) => process.stdout.write(`[next] ${chunk}`));
web.stderr.on("data", (chunk) => process.stderr.write(`[next:err] ${chunk}`));

let browser;
let page;
try {
  await waitForWeb(web);
  browser = await browserType.launch({ headless: true });

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  page = ownerPage;
  await signIn(ownerPage, "ci-share-owner@example.com", "/");
  await ownerPage.waitForURL((url) => url.pathname === "/", { timeout: 20_000 });
  const shareResult = await ownerPage.evaluate(async (courseId) => {
    const response = await fetch(`/api/courses/${encodeURIComponent(courseId)}/share`, { method: "POST" });
    return { ok: response.ok, status: response.status, body: await response.json().catch(() => null) };
  }, COURSE_ID);
  assert(shareResult.ok, `share creation should succeed (got ${shareResult.status})`);
  const { share } = shareResult.body;
  assert(typeof share?.sharePath === "string", "share API should return a capability path");
  await ownerContext.close();

  const anonymousContext = await browser.newContext();
  const anonymousPage = await anonymousContext.newPage();
  page = anonymousPage;
  await anonymousPage.goto(`${BASE_URL}${share.sharePath}`, { waitUntil: "domcontentloaded" });
  await anonymousPage.getByRole("heading", { name: "Immutable Share Regression Course" }).waitFor();
  await anonymousPage.getByText("This content must be visible without reading the owner's live course.").waitFor();
  const importLink = anonymousPage.locator("a.share-import");
  assert((await importLink.getAttribute("href"))?.includes("/login"), "anonymous import should require sign-in");
  await anonymousContext.close();

  const receiverContext = await browser.newContext();
  const receiverPage = await receiverContext.newPage();
  page = receiverPage;
  await signIn(receiverPage, "ci-share-receiver@example.com", share.sharePath);
  await receiverPage.waitForURL((url) => url.pathname === share.sharePath, { timeout: 20_000 });
  await receiverPage.locator("button.share-import").click();
  await receiverPage.waitForURL((url) => url.pathname.startsWith("/course/"), { timeout: 20_000 });
  await receiverPage.getByText("This content must be visible without reading the owner's live course.", { exact: true }).waitFor();
  await verifyImport(share.id);
  await receiverContext.close();
  process.stdout.write("[course-share.smoke] ALL CHECKS PASSED\n");
} catch (error) {
  await mkdir(path.dirname(screenshotPath), { recursive: true });
  if (page) await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  process.stderr.write(`[course-share.smoke] FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  try {
    if (process.platform === "win32") web.kill("SIGTERM");
    else process.kill(-web.pid, "SIGTERM");
  } catch {}
  await delay(750);
  if (web.exitCode === null) {
    try {
      if (process.platform === "win32") web.kill("SIGKILL");
      else process.kill(-web.pid, "SIGKILL");
    } catch {}
  }
}
