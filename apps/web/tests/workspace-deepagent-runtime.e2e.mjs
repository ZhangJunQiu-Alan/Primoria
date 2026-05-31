#!/usr/bin/env node
// Authenticated DB-mode smoke for the real opt-in DeepAgent runtime path.
// Uses a test-only fake model/tool harness, so it exercises DeepAgent/HITL/checkpoint
// wiring without external model or MCP credentials.

import { existsSync, readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";
import { startNextDevServer, stopNextDevServer } from "./workspace-e2e-next.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const PORT = process.env.PORT || "3150";
const BASE = process.env.WORKSPACE_E2E_BASE || `http://localhost:${PORT}`;
const BASE_HOSTNAME = new URL(BASE).hostname;
const SERVER_READY_TIMEOUT_MS = 90_000;
const RUN_ID = Date.now().toString(36);
const NEXT_DIST_DIR = `.next-deepagent-runtime-e2e-${RUN_ID}`;
const DEV_LOCK_PATH = path.join(repoRoot, "apps", "web", NEXT_DIST_DIR, "dev", "lock");
const EMAIL = `workspace-deepagent-runtime-${RUN_ID}@example.test`;
const PASSWORD = `Primoria-${RUN_ID}-password`;
const DISPLAY_NAME = `DeepAgent Owner ${RUN_ID}`;
const WORKSPACE_NAME = `DeepAgent Runtime Workspace ${RUN_ID}`;
const AGENT_NAME = `Deep Runtime Coach ${RUN_ID}`;
const ROOM_NAME = `Deep Runtime Room ${RUN_ID}`;
const FINAL_RESPONSE = `DeepAgent approved source result ${RUN_ID}`;

function loadLocalEnv() {
  const envFile = path.join(repoRoot, "apps", "web", ".env.local");
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
  }
}

function log(...args) {
  process.stdout.write(`[workspace-deepagent-runtime.e2e] ${args.join(" ")}\n`);
}

function assert(condition, message) {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function startServerIfNeeded() {
  if (process.env.WORKSPACE_E2E_BASE) return null;
  if (existsSync(DEV_LOCK_PATH)) {
    log(`SKIPPED: Next dev lock exists at ${DEV_LOCK_PATH}`);
    log("Stop the existing dev server, or rerun against a server started with the DeepAgent test env via WORKSPACE_E2E_BASE.");
    process.exit(0);
  }
  log("starting Next.js dev server on port", PORT);
  return startNextDevServer({
    repoRoot,
    port: PORT,
    distDir: NEXT_DIST_DIR,
    log,
    env: {
      PRIMORIA_WORKSPACE_DEEPAGENT: "1",
      PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE: "postgres",
      PRIMORIA_WORKSPACE_DEEPAGENT_TEST_FAKE_MODEL: "1",
      PRIMORIA_WORKSPACE_DEEPAGENT_TEST_TOOL_CALL: "external_approval",
      PRIMORIA_WORKSPACE_DEEPAGENT_TEST_FINAL_RESPONSE: FINAL_RESPONSE,
    },
  });
}

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < SERVER_READY_TIMEOUT_MS) {
    try {
      const response = await fetch(`${BASE}/workspace`, { cache: "no-store" });
      if (response.status < 500) return;
    } catch {
      /* retry */
    }
    await delay(750);
  }
  throw new Error(`server did not become ready within ${SERVER_READY_TIMEOUT_MS}ms`);
}

function cookieHeaderFromResponse(response) {
  const raw = response.headers.get("set-cookie");
  if (!raw) return "";
  return raw
    .split(/,(?=\s*[^;,=]+=[^;,]+)/)
    .map((cookie) => cookie.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

async function requestJson(pathname, init = {}, cookieHeader = "") {
  const response = await fetch(`${BASE}${pathname}`, {
    ...init,
    headers: { "content-type": "application/json", ...(cookieHeader ? { cookie: cookieHeader } : {}), ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${pathname} failed: ${response.status} ${JSON.stringify(data)}`);
  return { data, response };
}

async function signUpAndGetCookie() {
  const { data, response } = await requestJson("/api/auth/sign-up", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, displayName: DISPLAY_NAME }),
  });
  assert(data.user?.id && !data.user.id.startsWith("local_"), "auth signup returns a DB user id");
  const cookie = cookieHeaderFromResponse(response);
  assert(cookie.includes("primoria_session="), "auth signup sets primoria_session cookie");
  return cookie;
}

async function openWorkspaceThread(page, sessionCookie, workspaceName, roomName) {
  const sessionCookieValue = /primoria_session=([^;]+)/.exec(sessionCookie)?.[1];
  assert(sessionCookieValue, "session cookie value exists for browser smoke");
  await page.context().addCookies([{ name: "primoria_session", value: sessionCookieValue, domain: BASE_HOSTNAME, path: "/" }]);
  await page.goto(`${BASE}/workspace`, { waitUntil: "domcontentloaded" });
  await page.locator(".workspace-list", { hasText: workspaceName }).getByText(workspaceName).click();
  await page.locator(".workspace-switcher").getByRole("button", { name: /Groups/ }).click();
  await page.locator(".workspace-chat-section", { hasText: roomName }).getByText(roomName).click();
}

async function main() {
  loadLocalEnv();
  if (!process.env.DATABASE_URL) {
    log("SKIPPED: DATABASE_URL is not configured");
    return;
  }

  const server = startServerIfNeeded();
  let browser;
  let failed = false;

  try {
    await waitForServer();
    const runtimeHealth = (await requestJson("/api/workspaces/agent-runtime/health")).data;
    assert(runtimeHealth.ok === true, "DeepAgent runtime health endpoint reports ready in e2e env");
    assert(runtimeHealth.runtimeMode === "deepagent", "DeepAgent runtime health endpoint reports enabled runtime mode");
    assert(runtimeHealth.deepAgent?.persistenceMode === "postgres", "DeepAgent runtime health endpoint reports postgres persistence");
    assert(!JSON.stringify(runtimeHealth).includes(process.env.DATABASE_URL), "DeepAgent runtime health endpoint does not expose DATABASE_URL");

    const cookie = await signUpAndGetCookie();

    const created = (await requestJson("/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name: WORKSPACE_NAME }),
    }, cookie)).data;
    const workspaceId = created.workspace.id;

    const roomData = (await requestJson(`/api/workspaces/${workspaceId}/threads`, {
      method: "POST",
      body: JSON.stringify({ type: "room", name: ROOM_NAME, description: "real DeepAgent runtime e2e" }),
    }, cookie)).data;
    const threadId = roomData.thread.id;

    const agentData = (await requestJson(`/api/workspaces/${workspaceId}/agents`, {
      method: "POST",
      body: JSON.stringify({
        displayName: AGENT_NAME,
        description: "Exercises the real opt-in DeepAgent runtime path.",
        systemPrompt: "Use available tools when useful and keep the final answer short.",
        visibility: "workspace",
        memoryScope: "thread",
        capabilities: [{ kind: "skill", source: "system", path: "/skills/source-grounded-research", enabled: true }],
      }),
    }, cookie)).data;

    const messageData = (await requestJson(`/api/workspaces/${workspaceId}/messages`, {
      method: "POST",
      body: JSON.stringify({ threadId, content: `@${AGENT_NAME} search approved sources ${RUN_ID}` }),
    }, cookie)).data;
    assert(messageData.agentRuns?.[0]?.status === "waiting_for_approval", "real DeepAgent mention waits for HITL approval");
    assert(messageData.agentRunEvents?.some((event) => event.label === "deepagent_started"), "real DeepAgent run records runtime start event");
    const pendingApproval = messageData.agentApprovals?.[0];
    assert(pendingApproval?.toolName === "mcp_test_search_sources", "real DeepAgent HITL creates test external approval");
    assert(pendingApproval.deepAgentThreadId, "approval stores DeepAgent thread id for resume");
    assert(pendingApproval.agentProfileId === agentData.profile.id, "approval is linked to the created agent profile");

    const approved = (await requestJson(`/api/workspaces/${workspaceId}/agent-approvals/${pendingApproval.id}`, {
      method: "PATCH",
      body: JSON.stringify({ decision: "approved" }),
    }, cookie)).data;
    assert(approved.run.status === "completed", "approval resumes real DeepAgent run to completion");
    assert(approved.message?.content === FINAL_RESPONSE, "approval resume persists real DeepAgent final message");
    assert(approved.agentRunEvents?.some((event) => event.label === "deepagent_resumed"), "approval resume records DeepAgent resumed event");
    assert(approved.agentRunEvents?.some((event) => event.type === "tool_end" && event.label === "mcp_test_search_sources"), "approval resume records approved external tool output");

    const view = (await requestJson(`/api/workspaces/${workspaceId}`, {}, cookie)).data;
    assert(view.agentRuns.some((run) => run.id === approved.run.id && run.status === "completed"), "workspace view exposes completed real DeepAgent run");
    assert(view.messages.some((message) => message.content === FINAL_RESPONSE), "workspace view exposes resumed DeepAgent message");

    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1360, height: 860 } });
    await openWorkspaceThread(page, cookie, WORKSPACE_NAME, ROOM_NAME);
    await page.locator(".workspace-message.agent", { hasText: FINAL_RESPONSE }).waitFor();
    await page.locator(".workspace-agent-run-chip", { hasText: "completed" }).last().waitFor();

    log("ALL CHECKS PASSED");
  } catch (error) {
    failed = true;
    log("TEST FAILED:", error.message);
  } finally {
    if (browser) await browser.close();
    if (server) await stopNextDevServer({ ...server, log });
  }

  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  log("fatal:", error.message);
  process.exit(1);
});
