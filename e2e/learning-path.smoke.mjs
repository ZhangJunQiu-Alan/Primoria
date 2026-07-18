#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const requireFromWeb = createRequire(new URL("../apps/web/package.json", import.meta.url));
const postgres = requireFromWeb("postgres");

const PORT = process.env.PORT || "3120";
const BASE_URL = `http://localhost:${PORT}`;
const COURSE_ID = "crs_ci_learning_smoke";
const LESSON_ID = "lsn_ci_learning_smoke";
const EMAIL = "ci-learning-smoke@example.com";
const PASSWORD = "CiLearningSmoke123!";
const screenshotPath = path.resolve("test-results/learning-path-failure.png");

const databaseName = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL).pathname.replace(/^\//, "")
  : "";
if (process.env.CI_LEARNING_SMOKE !== "1" || !/test/i.test(databaseName)) {
  throw new Error("CI_LEARNING_SMOKE=1 and a test DATABASE_URL are required");
}

function assert(condition, message) {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

async function waitForServer(server) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Next.js exited with code ${server.exitCode}`);
    try {
      const response = await fetch(`${BASE_URL}/auth/sign-in`);
      if (response.status < 500) return;
    } catch {
      // retry until the dev server is listening
    }
    await delay(750);
  }
  throw new Error(`server did not become ready at ${BASE_URL}`);
}

async function fillPasswordAfterHydration(page, value) {
  const input = page.locator('input[type="password"]');
  const visibilityButton = page.locator(".auth-password-control button");
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    await input.fill("");
    await input.fill(value);
    if (await visibilityButton.isEnabled()) return input;
    await delay(100);
  }

  throw new Error("authentication form did not hydrate");
}

async function verifyPersistence() {
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, onnotice: () => {} });
  try {
    const [result] = await sql`
      select
        (select count(*)::int from quiz_attempts where course_id = ${COURSE_ID}) as attempts,
        (select progress from lessons where id = ${LESSON_ID}) as progress,
        (select count(*)::int from learning_progress_jobs where course_id = ${COURSE_ID}) as progress_jobs,
        (select count(*)::int from extractor_jobs where course_id = ${COURSE_ID}) as extractor_jobs
    `;
    assert(result.attempts === 1, "one quiz attempt should be persisted");
    assert(result.progress === "completed", "the only lesson should be completed");
    assert(result.progress_jobs === 1, "a learning-progress job should be queued");
    assert(result.extractor_jobs === 1, "an extractor job should be queued");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const server = spawn("pnpm", ["--filter", "@primoria/web", "dev"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT, NEXT_DIST_DIR: process.env.NEXT_DIST_DIR || ".next-learning-smoke" },
  stdio: ["ignore", "pipe", "pipe"],
  detached: process.platform !== "win32",
});
server.stdout.on("data", (chunk) => process.stdout.write(`[next] ${chunk}`));
server.stderr.on("data", (chunk) => process.stderr.write(`[next:err] ${chunk}`));

let browser;
let page;
try {
  await waitForServer(server);
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`${BASE_URL}/auth/sign-in?next=/course/${COURSE_ID}`, { waitUntil: "domcontentloaded" });
  const passwordInput = await fillPasswordAfterHydration(page, PASSWORD);
  await page.locator('input[type="email"]').fill(EMAIL);
  await passwordInput.fill(PASSWORD);
  const [signInResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/auth/sign-in") && response.request().method() === "POST"),
    page.locator('button[type="submit"]').click(),
  ]);
  assert(signInResponse.ok(), "sign-in API should succeed");

  await page.waitForURL(`**/course/${COURSE_ID}`, { timeout: 20_000 });
  await page.locator(".course-quiz-question").waitFor({ timeout: 90_000 });
  await page.locator(".course-quiz-choices button").filter({ hasText: "attempt and lesson progress" }).click();
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) => candidate.url().endsWith(`/api/courses/${COURSE_ID}/quiz`) && candidate.request().method() === "POST",
      { timeout: 60_000 },
    ),
    page.locator(".course-reader-primary").click(),
  ]);
  assert(response.ok(), `quiz API should succeed (got ${response.status()})`);
  await page.locator(".course-quiz-score").filter({ hasText: "1 / 1" }).waitFor();

  await verifyPersistence();
  assert(pageErrors.length === 0, `unexpected page errors: ${pageErrors.join(" | ")}`);
  process.stdout.write("[learning-path.smoke] ALL CHECKS PASSED\n");
} catch (error) {
  await mkdir(path.dirname(screenshotPath), { recursive: true });
  if (page) await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  process.stderr.write(`[learning-path.smoke] FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  const signalServer = (signal) => {
    try {
      if (process.platform === "win32") server.kill(signal);
      else process.kill(-server.pid, signal);
    } catch {
      // process already exited
    }
  };
  signalServer("SIGTERM");
  await delay(1_000);
  if (server.exitCode === null) signalServer("SIGKILL");
}
