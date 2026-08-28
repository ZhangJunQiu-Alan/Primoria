#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import * as playwright from "playwright";

const requireFromWeb = createRequire(new URL("../apps/web/package.json", import.meta.url));
const postgres = requireFromWeb("postgres");

const PORT = process.env.PORT || "3120";
const BASE_URL = `http://localhost:${PORT}`;
const COURSE_ID = "crs_ci_learning_smoke";
const LESSON_ID = "lsn_ci_learning_smoke";
const EMAIL = "ci-learning-smoke@example.com";
const PASSWORD = "CiLearningSmoke123!";
const screenshotPath = path.resolve("test-results/learning-path-failure.png");
const browserName = process.env.REGRESSION_BROWSER || "chromium";
const browserType = playwright[browserName];

if (!browserType || typeof browserType.launch !== "function") {
  throw new Error(`Unsupported REGRESSION_BROWSER: ${browserName}`);
}

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
    const deadline = Date.now() + 30_000;
    let result;
    while (Date.now() < deadline) {
      [result] = await sql`
        select
          (select count(*)::int from quiz_attempts where course_id = ${COURSE_ID}) as attempts,
          (select progress from lessons where id = ${LESSON_ID}) as progress,
          (select count(*)::int from learning_progress_jobs where course_id = ${COURSE_ID}) as progress_jobs,
          (select status from learning_progress_jobs where course_id = ${COURSE_ID}) as progress_status,
          (select decision->>'kind' from learning_progress_jobs where course_id = ${COURSE_ID}) as decision_kind,
          (select count(*)::int from extractor_jobs where course_id = ${COURSE_ID}) as extractor_jobs,
          (select count(*)::int from user_concept_mastery where owner_id = 'usr_ci_learning_smoke' and status = 'mastered') as mastered,
          (select count(*)::int from learning_events where course_id = ${COURSE_ID} and type = 'course.completed') as completion_events,
          (select count(*)::int from achievement_unlocks where owner_id = 'usr_ci_learning_smoke' and code = 'questline_complete') as completion_achievements
      `;
      if (result.progress_status === "completed") break;
      await delay(250);
    }
    assert(result.attempts === 1, "one quiz attempt should be persisted");
    assert(result.progress === "completed", "the only lesson should be completed");
    assert(result.progress_jobs === 1, "a learning-progress job should be queued");
    assert(result.progress_status === "completed", "the learning-progress worker should complete the job");
    assert(result.decision_kind === "course_complete", "the final mastery decision should complete the course");
    assert(result.extractor_jobs === 1, "an extractor job should be queued");
    assert(result.mastered === 1, "three correct concept questions should produce mastered state");
    assert(result.completion_events === 1, "course completion should be recorded after mastery is decided");
    assert(result.completion_achievements === 1, "course completion achievement should be awarded once");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function verifyRecommendationResolved() {
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, onnotice: () => {} });
  try {
    const [result] = await sql`
      select decision_status from learning_progress_jobs where course_id = ${COURSE_ID}
    `;
    assert(result.decision_status === "accepted", "course-complete recommendation should be accepted");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const server = spawn("pnpm", ["--filter", "@primoria/web", "dev"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT },
  stdio: ["ignore", "pipe", "pipe"],
  detached: process.platform !== "win32",
});
server.stdout.on("data", (chunk) => process.stdout.write(`[next] ${chunk}`));
server.stderr.on("data", (chunk) => process.stderr.write(`[next:err] ${chunk}`));

const progressWorker = spawn("pnpm", ["--filter", "@primoria/web", "worker:learning-progress"], {
  cwd: process.cwd(),
  env: { ...process.env },
  stdio: ["ignore", "pipe", "pipe"],
  detached: process.platform !== "win32",
});
progressWorker.stdout.on("data", (chunk) => process.stdout.write(`[progress] ${chunk}`));
progressWorker.stderr.on("data", (chunk) => process.stderr.write(`[progress:err] ${chunk}`));

let browser;
let page;
try {
  await waitForServer(server);
  browser = await browserType.launch({ headless: true });
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
  await page.locator(".course-quiz-question").first().waitFor({ timeout: 90_000 });
  const correctChoices = page.locator(".course-quiz-choices button").filter({ hasText: "Persisted result" });
  assert(await correctChoices.count() === 3, "three deterministic concept questions should render");
  for (let index = 0; index < 3; index += 1) await correctChoices.nth(index).click();
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) => candidate.url().endsWith(`/api/courses/${COURSE_ID}/quiz`) && candidate.request().method() === "POST",
      { timeout: 60_000 },
    ),
    page.locator(".course-reader-primary").click(),
  ]);
  assert(response.ok(), `quiz API should succeed (got ${response.status()})`);
  await page.locator(".course-quiz-score").filter({ hasText: "3 / 3" }).waitFor();

  await verifyPersistence();
  await page.locator(".learning-progress-popup-card").waitFor({ timeout: 30_000 });
  const [confirmation] = await Promise.all([
    page.waitForResponse(
      (candidate) => candidate.url().includes(`/api/courses/${COURSE_ID}/learning-progress/`)
        && candidate.request().method() === "POST",
      { timeout: 60_000 },
    ),
    page.locator(".learning-progress-popup-card button").click(),
  ]);
  assert(confirmation.ok(), `course completion confirmation should succeed (got ${confirmation.status()})`);
  await page.waitForURL((url) => url.pathname === "/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator(".onboarding-goal-input").waitFor({ state: "visible", timeout: 30_000 });
  await verifyRecommendationResolved();
  assert(pageErrors.length === 0, `unexpected page errors: ${pageErrors.join(" | ")}`);
  process.stdout.write("[learning-path.smoke] ALL CHECKS PASSED\n");
} catch (error) {
  await mkdir(path.dirname(screenshotPath), { recursive: true });
  if (page) await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  process.stderr.write(`[learning-path.smoke] FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  const signalProcess = (processHandle, signal) => {
    try {
      if (process.platform === "win32") processHandle.kill(signal);
      else process.kill(-processHandle.pid, signal);
    } catch {
      // process already exited
    }
  };
  signalProcess(server, "SIGTERM");
  signalProcess(progressWorker, "SIGTERM");
  await delay(1_000);
  if (server.exitCode === null) signalProcess(server, "SIGKILL");
  if (progressWorker.exitCode === null) signalProcess(progressWorker, "SIGKILL");
}
