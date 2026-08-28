#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import * as playwright from "playwright";
import { startScriptedOpenAIServer } from "../apps/agent/tests/helpers/scripted-openai-server.mjs";

const requireFromWeb = createRequire(new URL("../apps/web/package.json", import.meta.url));
const postgres = requireFromWeb("postgres");

const PORT = process.env.PORT || "3126";
const BASE_URL = `http://localhost:${PORT}`;
const USER_ID = "usr_ci_onboarding";
const EMAIL = "ci-onboarding@example.com";
const PASSWORD = "CiOnboarding123!";
const AGENT_PORT = process.env.ONBOARDING_AGENT_PORT || "3218";
const INTERNAL_SECRET = "onboarding-test-secret";
const screenshotPath = path.resolve("test-results/onboarding-failure.png");
const browserName = process.env.REGRESSION_BROWSER || "chromium";
const browserType = playwright[browserName];

if (!browserType || typeof browserType.launch !== "function") {
  throw new Error(`Unsupported REGRESSION_BROWSER: ${browserName}`);
}

const databaseName = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL).pathname.replace(/^\//, "")
  : "";
if (process.env.CI_ONBOARDING_SMOKE !== "1" || !/test/i.test(databaseName)) {
  throw new Error("CI_ONBOARDING_SMOKE=1 and a test DATABASE_URL are required");
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

async function postJson(page, pathname, body) {
  return page.evaluate(async ({ pathname: requestPath, body: requestBody }) => {
    const response = await fetch(requestPath, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    return { status: response.status, body: await response.json() };
  }, { pathname, body });
}

async function verifyPersistence(courseId, lessonId) {
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, onnotice: () => {} });
  try {
    const deadline = Date.now() + 60_000;
    let result;
    while (Date.now() < deadline) {
      [result] = await sql`
        select
        p.learning_goal,
        p.goal_graph_id,
        p.goal_positioning_status,
        p.facts_intake_status,
        p.education_stage,
        p.curriculum_system,
        p.education_context_source,
        p.tutor_style,
        p.onboarding_completed_at,
        p.onboarding_course_status,
        (select count(*)::int from courses c where c.owner_id = ${USER_ID} and c.id = ${courseId}) as courses,
        (select count(*)::int from courses c where c.owner_id = ${USER_ID} and c.archived_at is null and c.scope_key is not null) as active_scopes,
        (select count(*)::int from lessons l where l.owner_id = ${USER_ID} and l.course_id = ${courseId}) as lessons,
        (select status from lessons l where l.id = ${lessonId} and l.owner_id = ${USER_ID}) as lesson_status,
        (select jsonb_array_length(blocks) from lessons l where l.id = ${lessonId} and l.owner_id = ${USER_ID}) as block_count,
        (select count(*)::int from lesson_generation_jobs j where j.owner_id = ${USER_ID} and j.course_id = ${courseId} and j.lesson_id = ${lessonId}) as jobs,
        (select status from lesson_generation_jobs j where j.owner_id = ${USER_ID} and j.lesson_id = ${lessonId}) as job_status
        from learner_profiles p
        where p.owner_id = ${USER_ID}
      `;
      if (result.job_status === "completed") break;
      await delay(250);
    }
    assert(result.learning_goal === "Understand derivatives from first principles", "learning goal should persist");
    assert(result.goal_graph_id === "mit_calculus", "explicit KG anchor should persist");
    assert(result.goal_positioning_status === "positioned", "goal positioning should complete");
    assert(result.facts_intake_status === "skipped", "optional facts text should be skipped explicitly");
    assert(result.education_stage === "undergraduate", "education stage should persist");
    assert(result.curriculum_system === "course_specific", "curriculum should persist");
    assert(result.education_context_source === "user_selected", "curriculum source should persist");
    assert(result.tutor_style === "feynman", "tutor style should persist");
    assert(result.onboarding_completed_at, "onboarding should be complete");
    assert(result.onboarding_course_status === "ready", "course build should complete");
    assert(result.courses === 1, "exactly one owner-scoped course should exist");
    assert(result.active_scopes === 1, "onboarding should create one active scope");
    assert(result.lessons >= 1, "course outline should contain lessons");
    assert(result.lesson_status === "generated", "the real lesson worker should publish the first lesson");
    assert(result.block_count >= 13, "the generated first lesson should contain validated readable blocks");
    assert(result.jobs === 1, "first lesson should have exactly one generation job");
    assert(result.job_status === "completed", "first lesson generation job should complete");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const modelServer = await startScriptedOpenAIServer();
const runtimeEnv = {
  ...process.env,
  PRIMORIA_DISABLE_OUTLINE_ENRICHMENT: "1",
  AI_PROVIDER: "openai-compatible",
  OPENAI_API_KEY: "fake",
  OPENAI_BASE_URL: modelServer.baseUrl,
  OPENAI_MODEL: "test",
  AI_MODEL_FAST: "test",
  LESSON_WORKER_CONCURRENCY: "1",
  LESSON_BATCH_CONCURRENCY: "1",
  PRIMORIA_DISABLE_LOCAL_ENV: "1",
  PRIMORIA_AGENT_URL: `http://127.0.0.1:${AGENT_PORT}`,
  PRIMORIA_AGENT_INTERNAL_SECRET: INTERNAL_SECRET,
};

Object.assign(process.env, runtimeEnv, { PORT: AGENT_PORT, HOST: "127.0.0.1" });
const { migrateAgentRuntime } = await import("../apps/agent/src/runtime/migrate.mjs");
await migrateAgentRuntime(process.env.DATABASE_URL);
const { startAgentServer } = await import("../apps/agent/src/server.mjs");
const agentRuntime = await startAgentServer();

const server = spawn("pnpm", ["--filter", "@primoria/web", "dev"], {
  cwd: process.cwd(),
  env: { ...runtimeEnv, PORT },
  stdio: ["ignore", "pipe", "pipe"],
  detached: process.platform !== "win32",
});
server.stdout.on("data", (chunk) => process.stdout.write(`[next] ${chunk}`));
server.stderr.on("data", (chunk) => process.stderr.write(`[next:err] ${chunk}`));

const lessonWorker = spawn("pnpm", ["--filter", "@primoria/web", "worker:lesson-generation"], {
  cwd: process.cwd(),
  env: runtimeEnv,
  stdio: ["ignore", "pipe", "pipe"],
  detached: process.platform !== "win32",
});
lessonWorker.stdout.on("data", (chunk) => process.stdout.write(`[lesson] ${chunk}`));
lessonWorker.stderr.on("data", (chunk) => process.stderr.write(`[lesson:err] ${chunk}`));

let browser;
let page;
try {
  await waitForServer(server);
  browser = await browserType.launch({ headless: true });
  page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));
  page.on("console", (message) => {
    if (message.type() === "error") process.stderr.write(`[browser:error] ${message.text()}\n`);
  });

  await page.goto(`${BASE_URL}/auth/sign-in?next=/`, { waitUntil: "domcontentloaded" });
  const passwordInput = await fillPasswordAfterHydration(page, PASSWORD);
  await page.locator('input[type="email"]').fill(EMAIL);
  await passwordInput.fill(PASSWORD);
  const [signInResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/auth/sign-in") && response.request().method() === "POST"),
    page.locator('button[type="submit"]').click(),
  ]);
  assert(signInResponse.ok(), "sign-in API should succeed");
  await page.waitForURL((url) => url.pathname === "/", { timeout: 20_000 });
  await page.locator('.onboarding-progress[aria-label="Step 1 of 3"]').waitFor();
  assert(await page.locator(".onboarding-goal-input").isVisible(), "goal step should render");

  const goal = await postJson(page, "/api/onboarding/goal", {
    learningGoal: "Understand derivatives from first principles",
    graphId: "mit_calculus",
  });
  assert(goal.status === 200, `goal API should succeed (got ${goal.status})`);
  assert(goal.body.anchor?.graphId === "mit_calculus", "goal API should return the selected KG anchor");
  assert(goal.body.nextStep === "facts", "goal completion should advance to facts");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('.onboarding-progress[aria-label="Step 2 of 3"]').waitFor();
  assert(await page.locator("#education-stage-question").isVisible(), "facts step should render after reload");

  const facts = await postJson(page, "/api/onboarding/facts", {
    educationStage: "undergraduate",
    curriculumSystem: "course_specific",
    educationContextSource: "user_selected",
  });
  assert(facts.status === 200, `facts API should succeed (got ${facts.status})`);
  assert(facts.body.nextStep === "style", "facts completion should advance to style");
  const { courseId, lessonId } = facts.body.course || {};
  assert(courseId && lessonId, "facts completion should create a course outline and first lesson");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('.onboarding-progress[aria-label="Step 3 of 3"]').waitFor();
  assert(await page.locator(".tutor-style-list").isVisible(), "style step should render after reload");

  const style = await postJson(page, "/api/onboarding/style", { tutorStyle: "feynman" });
  assert(style.status === 200, `style API should succeed (got ${style.status})`);
  assert(style.body.complete === true && style.body.nextStep === "done", "style completion should finish onboarding");

  const [connection] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/copilotkit")
      && response.request().postDataJSON()?.method === "agent/connect", { timeout: 60_000 }),
    page.reload({ waitUntil: "domcontentloaded" }),
  ]);
  assert(connection.ok(), `workspace Agent connection should succeed (got ${connection.status()})`);
  assert(await connection.finished() === null, "workspace Agent connection should finish without interruption");
  await page.waitForURL((url) => url.pathname === "/", { timeout: 20_000 });
  assert(await page.locator("section.workspace").isVisible(), "completed learner should enter the workspace");
  await verifyPersistence(courseId, lessonId);
  await page.goto(`${BASE_URL}/course/${courseId}`, { waitUntil: "domcontentloaded" });
  await page.locator(".course-reader:not(.course-route-loading)").waitFor({ timeout: 30_000 });
  assert(await page.locator(".course-block-wrapper").count() >= 1, "generated first lesson should render readable content");
  assert(pageErrors.length === 0, `unexpected page errors: ${pageErrors.join(" | ")}`);
  process.stdout.write("[onboarding.smoke] ALL CHECKS PASSED\n");
} catch (error) {
  await mkdir(path.dirname(screenshotPath), { recursive: true });
  if (page) await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  process.stderr.write(`[onboarding.smoke] FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
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
  signalProcess(lessonWorker, "SIGTERM");
  await delay(1_000);
  if (server.exitCode === null) signalProcess(server, "SIGKILL");
  if (lessonWorker.exitCode === null) signalProcess(lessonWorker, "SIGKILL");
  await agentRuntime.close("onboarding smoke complete");
  await modelServer.close();
}
