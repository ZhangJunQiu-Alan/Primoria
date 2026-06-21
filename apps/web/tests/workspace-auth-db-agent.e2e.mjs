#!/usr/bin/env node
// Authenticated DB-mode smoke for workspace agents, approvals, artifacts, and retry.
// Requires DATABASE_URL. Usage against an existing dev server:
//   WORKSPACE_E2E_BASE=http://localhost:3000 node apps/web/tests/workspace-auth-db-agent.e2e.mjs
// Without WORKSPACE_E2E_BASE it starts a Next dev server on PORT or 3140.

import { existsSync, readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";
import { startNextDevServer, stopNextDevServer } from "./workspace-e2e-next.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const PORT = process.env.PORT || "3140";
const BASE = process.env.WORKSPACE_E2E_BASE || `http://localhost:${PORT}`;
const BASE_HOSTNAME = new URL(BASE).hostname;
const SERVER_READY_TIMEOUT_MS = 90_000;
const RUN_ID = Date.now().toString(36);
const NEXT_DIST_DIR = `.next-auth-db-agent-e2e-${RUN_ID}`;
const EMAIL = `workspace-auth-db-agent-${RUN_ID}@example.test`;
const PASSWORD = `Primoria-${RUN_ID}-password`;
const DISPLAY_NAME = `DB Agent Owner ${RUN_ID}`;
const WORKSPACE_NAME = `Auth DB Agent Workspace ${RUN_ID}`;
const AGENT_NAME = `DB Approval Coach ${RUN_ID}`;
const ROOM_NAME = `DB Agent Room ${RUN_ID}`;

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
  process.stdout.write(`[workspace-auth-db-agent.e2e] ${args.join(" ")}\n`);
}

function assert(condition, message) {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function startServerIfNeeded() {
  if (process.env.WORKSPACE_E2E_BASE) return null;
  return startNextDevServer({ repoRoot, port: PORT, distDir: NEXT_DIST_DIR, log });
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
  return { user: data.user, cookie };
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
    const { user, cookie } = await signUpAndGetCookie();
    log("signed up DB user", user.id);

    const created = (await requestJson("/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name: WORKSPACE_NAME }),
    }, cookie)).data;
    const workspaceId = created.workspace.id;
    assert(created.persisted === true, "authenticated workspace view is persisted in DB mode");
    assert(created.workspace.name === WORKSPACE_NAME, "created authenticated DB workspace");

    const roomData = (await requestJson(`/api/workspaces/${workspaceId}/threads`, {
      method: "POST",
      body: JSON.stringify({ type: "room", name: ROOM_NAME, description: "authenticated DB agent e2e" }),
    }, cookie)).data;
    const threadId = roomData.thread.id;

    const agentData = (await requestJson(`/api/workspaces/${workspaceId}/agents`, {
      method: "POST",
      body: JSON.stringify({
        displayName: AGENT_NAME,
        description: "Authenticated DB approval and artifact test agent.",
        systemPrompt: "Help the workspace by using approved tools only when requested.",
        visibility: "workspace",
        memoryScope: "thread",
        capabilities: [
          { kind: "skill", source: "system", path: "/skills/project-breakdown", enabled: true },
          { kind: "internal_tool", toolName: "create_workspace_task", approval: "always", enabled: true },
          { kind: "internal_tool", toolName: "save_learning_artifact", approval: "always", enabled: true },
        ],
      }),
    }, cookie)).data;
    assert(agentData.member.agentProfileId === agentData.profile.id, "authenticated agent member points at created profile");

    const mentionData = (await requestJson(`/api/workspaces/${workspaceId}/messages`, {
      method: "POST",
      body: JSON.stringify({ threadId, content: `@${AGENT_NAME} prepare authenticated DB approval ${RUN_ID}` }),
    }, cookie)).data;
    assert(mentionData.message.senderName === DISPLAY_NAME, "message API uses authenticated display name");
    assert(mentionData.agentRuns?.[0]?.trigger === "mention", "authenticated mention creates a persisted run");
    assert(mentionData.agentMessages?.[0]?.senderName === AGENT_NAME, "authenticated mention creates agent response with agent identity");

    const taskData = (await requestJson(`/api/workspaces/${workspaceId}/tasks`, {
      method: "POST",
      body: JSON.stringify({ threadId, title: `Authenticated assigned task ${RUN_ID}`, assigneeId: agentData.member.id }),
    }, cookie)).data;
    assert(taskData.agentRuns?.[0]?.trigger === "task_assignment", "authenticated task API returns task_assignment run");
    assert(taskData.task.status === "done", "authenticated DB task assignment completes through agent path");

    const now = Date.now();
    const approvalSeed = (await requestJson(`/api/workspaces/${workspaceId}/test-seed-agent-run`, {
      method: "POST",
      body: JSON.stringify({
        run: {
          workspaceId,
          threadId,
          agentProfileId: agentData.profile.id,
          agentMemberId: agentData.member.id,
          trigger: "mention",
          status: "waiting_for_approval",
          inputMessageId: mentionData.message.id,
          startedAt: now,
        },
        events: [
          { type: "status", label: "started", payload: { authDb: true }, createdAt: now },
          {
            type: "approval_request",
            label: "save_learning_artifact",
            payload: {
              input: {
                title: `Authenticated DB Artifact ${RUN_ID}`,
                description: "Saved artifact from authenticated DB e2e.",
                groups: ["Plan", "Review"],
              },
              policy: { visibleLabel: "Save artifact", risk: "write" },
            },
            createdAt: now + 1,
          },
          { type: "status", label: "waiting_for_approval", payload: {}, createdAt: now + 2 },
        ],
        outputMessage: {
          workspaceId,
          threadId,
          senderName: agentData.member.displayName,
          senderKind: "agent",
          content: `${AGENT_NAME} is waiting for approval before saving an artifact.`,
        },
      }),
    }, cookie)).data;
    const pendingApproval = approvalSeed.agentApprovals.find((approval) => approval.toolName === "save_learning_artifact" && approval.status === "pending");
    assert(pendingApproval, "authenticated seeded DB run exposes pending approval");

    const approved = (await requestJson(`/api/workspaces/${workspaceId}/agent-approvals/${pendingApproval.id}`, {
      method: "PATCH",
      body: JSON.stringify({ decision: "approved" }),
    }, cookie)).data;
    assert(approved.run.status === "completed", "authenticated approval API completes waiting run");
    assert(approved.message?.artifact?.type === "task", "authenticated approval API creates compatibility artifact message");
    assert(approved.artifact?.kind === "saved_artifact", "authenticated approval API returns first-class saved artifact");
    const artifactEventPayload = approved.agentRunEvents?.find((event) => event.type === "artifact" && event.label === "save_learning_artifact")?.payload ?? {};
    assert(artifactEventPayload.artifactKind === "saved_artifact", "authenticated approval API returns compact artifact event metadata");
    assert(!("artifact" in artifactEventPayload), "authenticated artifact event does not embed full artifact record");

    const retrySeed = (await requestJson(`/api/workspaces/${workspaceId}/test-seed-agent-run`, {
      method: "POST",
      body: JSON.stringify({
        run: {
          workspaceId,
          threadId,
          agentProfileId: agentData.profile.id,
          agentMemberId: agentData.member.id,
          trigger: "mention",
          status: "failed",
          inputMessageId: mentionData.message.id,
          error: "authenticated seeded retry failure",
        },
        events: [
          { type: "status", label: "started", payload: { authDb: true }, createdAt: now + 10 },
          { type: "status", label: "failed", payload: { error: "authenticated seeded retry failure" }, createdAt: now + 11 },
        ],
        outputMessage: {
          workspaceId,
          threadId,
          senderName: agentData.member.displayName,
          senderKind: "agent",
          content: `${AGENT_NAME} could not finish this run. authenticated seeded retry failure`,
        },
      }),
    }, cookie)).data;
    const failedRun = retrySeed.agentRuns.find((run) => run.status === "failed" && run.error === "authenticated seeded retry failure");
    assert(failedRun, "authenticated seeded DB run exposes failed retryable run");

    const retryResult = (await requestJson(`/api/workspaces/${workspaceId}/agent-runs/${failedRun.id}/retry`, {
      method: "POST",
      body: JSON.stringify({}),
    }, cookie)).data;
    assert(retryResult.agentRuns?.[0]?.id !== failedRun.id, "authenticated retry creates a new run");
    assert(retryResult.agentRuns?.[0]?.status === "completed", "authenticated retry completes through persisted DB path");
    assert(retryResult.agentRunEvents?.some((event) => event.label === "retried"), "authenticated retry persists source-run audit event");

    const finalView = (await requestJson(`/api/workspaces/${workspaceId}`, {}, cookie)).data;
    assert(finalView.persisted === true, "final authenticated workspace view is DB-backed");
    assert(finalView.agentRuns.some((run) => run.id === approved.run.id && run.status === "completed"), "final DB view includes approved run");
    assert(finalView.agentRuns.some((run) => run.id === retryResult.agentRuns[0].id && run.status === "completed"), "final DB view includes retried run");
    assert(finalView.artifacts.some((artifact) => artifact.sourceRunId === approved.run.id && artifact.kind === "saved_artifact"), "final DB view indexes first-class approved artifact");
    assert(finalView.messages.some((message) => message.artifact?.title === `Authenticated DB Artifact ${RUN_ID}`), "final DB view keeps compatibility artifact message");

    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1360, height: 860 } });
    await openWorkspaceThread(page, cookie, WORKSPACE_NAME, ROOM_NAME);
    await page.locator(".workspace-message.agent", { hasText: `Authenticated DB Artifact ${RUN_ID}` }).last().waitFor();
    await page.locator(".workspace-agent-run-chip", { hasText: "completed" }).last().waitFor();
    await page.locator(".workspace-artifact-message-card", { hasText: `Authenticated DB Artifact ${RUN_ID}` }).last().waitFor();

    log("ALL CHECKS PASSED");
  } catch (error) {
    failed = true;
    log("TEST FAILED:", error.message);
    if (error.cause) log("CAUSE:", error.cause.message ?? String(error.cause));
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
