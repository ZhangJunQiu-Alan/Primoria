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

const WEB_PORT = process.env.TUTOR_RUNTIME_WEB_PORT || "3122";
const AGENT_PORT = process.env.TUTOR_RUNTIME_AGENT_PORT || "3216";
const BASE_URL = `http://localhost:${WEB_PORT}`;
const AGENT_URL = `http://127.0.0.1:${AGENT_PORT}`;
const USER_ID = "usr_ci_tutor_runtime";
const EMAIL = "ci-tutor-runtime@example.com";
const PASSWORD = "CiTutorRuntime123!";
const INTERNAL_SECRET = "tutor-runtime-test-secret";
const screenshotPath = path.resolve("test-results/tutor-runtime-failure.png");
const tracePath = path.resolve("test-results/tutor-runtime-trace.zip");
const browserName = process.env.REGRESSION_BROWSER || "chromium";
const browserType = playwright[browserName];

if (!browserType || typeof browserType.launch !== "function") {
  throw new Error(`Unsupported REGRESSION_BROWSER: ${browserName}`);
}

const databaseName = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL).pathname.replace(/^\//, "")
  : "";
if (process.env.CI_TUTOR_RUNTIME_SMOKE !== "1" || !/test/i.test(databaseName)) {
  throw new Error("CI_TUTOR_RUNTIME_SMOKE=1 and a test DATABASE_URL are required");
}

function assert(condition, message) {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function signalProcess(processHandle, signal) {
  if (!processHandle?.pid) return;
  try {
    if (process.platform === "win32") processHandle.kill(signal);
    else process.kill(-processHandle.pid, signal);
  } catch {
    // already stopped
  }
}

async function waitForWeb(server) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Next.js exited with code ${server.exitCode}`);
    try {
      const response = await fetch(`${BASE_URL}/auth/sign-in`);
      if (response.status < 500) return;
    } catch {
      // retry
    }
    await delay(500);
  }
  throw new Error(`web server did not become ready at ${BASE_URL}`);
}

async function fillPasswordAfterHydration(page, value) {
  const input = page.locator('input[type="password"]');
  const button = page.getByRole("button", { name: /^(Show password|显示密码)$/ });
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    await input.fill("");
    await input.fill(value);
    if (await button.isEnabled()) return input;
    await delay(100);
  }
  throw new Error("authentication form did not hydrate");
}

async function sendMessage(page, message) {
  const input = page.locator('[data-testid="copilot-chat-textarea"]');
  await input.waitFor({ state: "visible", timeout: 30_000 });
  await input.fill(message);
  await page.locator('[data-testid="copilot-send-button"]').click();
}

async function assertOwnerReachedAgentRuntime() {
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, onnotice: () => {} });
  try {
    const rows = await sql`
      select owner_id, status
      from agent_runtime.runs
      where owner_id = ${USER_ID}
      order by created_at desc
    `;
    assert(rows.length >= 2, "Web requests should create owner-scoped Agent runs");
    assert(rows.every((row) => row.owner_id === USER_ID), "Agent runs must retain the authenticated owner");
    assert(rows.every((row) => row.status === "completed"), "Tutor smoke runs should complete");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const modelServer = await startScriptedOpenAIServer();
Object.assign(process.env, {
  PORT: AGENT_PORT,
  HOST: "127.0.0.1",
  AI_PROVIDER: "openai-compatible",
  OPENAI_API_KEY: "fake",
  OPENAI_BASE_URL: modelServer.baseUrl,
  OPENAI_MODEL: "test",
  PRIMORIA_AGENT_INTERNAL_SECRET: INTERNAL_SECRET,
});

const { migrateAgentRuntime } = await import("../apps/agent/src/runtime/migrate.mjs");
await migrateAgentRuntime(process.env.DATABASE_URL);
const { startAgentServer } = await import("../apps/agent/src/server.mjs");
const agentRuntime = await startAgentServer();

const web = spawn("pnpm", ["--filter", "@primoria/web", process.env.REGRESSION_WEB_MODE === "production" ? "start" : "dev"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: WEB_PORT,
    PRIMORIA_AGENT_URL: AGENT_URL,
    PRIMORIA_AGENT_INTERNAL_SECRET: INTERNAL_SECRET,
  },
  stdio: ["ignore", "pipe", "pipe"],
  detached: process.platform !== "win32",
});
web.stdout.on("data", (chunk) => process.stdout.write(`[next] ${chunk}`));
web.stderr.on("data", (chunk) => process.stderr.write(`[next:err] ${chunk}`));

let browser;
let context;
let page;
try {
  await waitForWeb(web);
  browser = await browserType.launch({ headless: true });
  context = await browser.newContext();
  await context.addCookies([{ name: "primoria_ui_language", value: "en", url: BASE_URL }]);
  page = await context.newPage();
  const pageErrors = [];
  const streamContentTypes = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    const contentType = response.headers()["content-type"] ?? "";
    if (new URL(response.url()).pathname === "/api/copilotkit" && contentType.includes("text/event-stream")) streamContentTypes.push(contentType);
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
  await context.tracing.start({ screenshots: true, snapshots: false, sources: false });

  await sendMessage(page, "TEXT_RUNTIME_MARKER");
  await page.getByText("runtime ok", { exact: true }).waitFor({ timeout: 45_000 });

  await sendMessage(page, "TOOL_DIAGRAM_MARKER");
  await page.getByText("Regression path", { exact: true }).waitFor({ timeout: 45_000 });

  const gateResponse = await page.request.post(`${BASE_URL}/api/learning/course`, { headers: { origin: BASE_URL }, data: { topic: "Python" } });
  assert(gateResponse.status() === 409, `a direct course request must not bypass background preparation (got ${gateResponse.status()}: ${await gateResponse.text()})`);
  await sendMessage(page, "I want to learn Python COURSE_INTAKE_MARKER");
  const intake = page.locator(".course-intake-form");
  await intake.waitFor({ state: "visible", timeout: 45_000 });
  assert(await intake.locator("fieldset").count() === 3, "vague goals must show exactly three option questions");
  assert(await intake.locator('button[type="submit"]').isDisabled(), "unanswered background questions cannot build a course");
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, onnotice: () => {} });
  try {
    const countCourses = async () => Number((await sql`select count(*) as count from courses where owner_id = ${USER_ID}`)[0].count);
    assert(await countCourses() === 0, "presenting questions must not create a course");
    await delay(1000);
    await page.reload({ waitUntil: "domcontentloaded" });
    await intake.waitFor({ state: "visible", timeout: 30_000 });
    assert(await intake.locator("fieldset").count() === 3, "question cards must restore from saved chat history");
    await page.route("**/api/knowledge-graph/position", (route) => route.fulfill({ json: { plan: { branch: "positioned", courseContext: { graphId: "linear_algebra", startTopic: { topicId: "t_mit1806_linear_equations_mit1806_matrix_ops" }, targetConceptId: null, targetConceptIds: [], scope: "canonical", learningGoal: null } } } }));
    for (const fieldset of await intake.locator("fieldset").all()) await fieldset.locator('input[type="radio"]').first().check();
    const built = page.waitForResponse((response) => response.url().endsWith("/api/learning/course") && response.request().method() === "POST");
    await intake.getByRole("button", { name: "Build my course", exact: true }).click();
    assert((await built).status() === 202, "confirmed answers must allow course creation");
    await page.getByRole("link", { name: "Open course", exact: true }).waitFor({ timeout: 30_000 });
    assert(await page.getByRole("link", { name: "View library", exact: true }).isVisible(), "course actions must follow English interface language");
    assert(await countCourses() === 1, "one submission creates one course");
    const language = (await sql`select language from courses where owner_id = ${USER_ID}`)[0].language;
    assert(language === "en", "English auto-detect must carry into the persisted course");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Open course", exact: true }).waitFor({ timeout: 30_000 });
    assert(await countCourses() === 1, "restoring submitted preparation must reuse its course");
  } finally { await sql.end({ timeout: 5 }); }
  assert(modelServer.requests.some((body) => JSON.stringify(body.messages).includes("REPLY LANGUAGE: English")), "server-resolved English must reach the model prompt");

  await assertOwnerReachedAgentRuntime();
  assert(pageErrors.length === 0, `unexpected page errors: ${pageErrors.join(" | ")}`);
  assert(streamContentTypes.length > 0 && streamContentTypes.every((value) => /charset=utf-8/i.test(value)), "Web SSE must declare UTF-8 for faithful multilingual capture");
  process.stdout.write("[tutor-runtime.smoke] ALL CHECKS PASSED\n");
} catch (error) {
  await mkdir(path.dirname(screenshotPath), { recursive: true });
  if (page) await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  if (context) await context.tracing.stop({ path: tracePath }).catch(() => {});
  context = null;
  process.stderr.write(`[tutor-runtime.smoke] FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  if (context) await context.tracing.stop().catch(() => {});
  if (browser) await browser.close();
  signalProcess(web, "SIGTERM");
  await delay(750);
  if (web.exitCode === null) signalProcess(web, "SIGKILL");
  await agentRuntime.close("tutor runtime smoke complete");
  await modelServer.close();
}
