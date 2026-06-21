#!/usr/bin/env node
// Browser/API smoke for agent approval, artifact sharing, and retry flows.
// Usage against an existing dev server:
//   WORKSPACE_E2E_BASE=http://localhost:3000 node apps/web/tests/workspace-agent-approval.e2e.mjs
// Without WORKSPACE_E2E_BASE it starts a Next dev server on PORT or 3130.

import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";
import { startNextDevServer, stopNextDevServer } from "./workspace-e2e-next.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const PORT = process.env.PORT || "3130";
process.env.DATABASE_URL = "";
const BASE = process.env.WORKSPACE_E2E_BASE || `http://localhost:${PORT}`;
const BASE_HOSTNAME = new URL(BASE).hostname;
const SERVER_READY_TIMEOUT_MS = 90_000;
const RUN_ID = Date.now().toString(36);
const NEXT_DIST_DIR = `.next-agent-approval-e2e-${RUN_ID}`;
const WORKSPACE_NAME = `Agent Approval Workspace ${RUN_ID}`;
const AGENT_NAME = `Approval Coach ${RUN_ID}`;
const ROOM_NAME = `Approval Room ${RUN_ID}`;

function log(...args) {
  process.stdout.write(`[workspace-agent-approval.e2e] ${args.join(" ")}\n`);
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
      const response = await fetch(`${BASE}/api/workspaces`, { cache: "no-store" });
      const text = await response.text();
      if (response.ok && text) {
        const data = JSON.parse(text);
        if (data?.workspace?.id) return;
      }
    } catch {
      /* retry */
    }
    await delay(750);
  }
  throw new Error(`server did not become ready within ${SERVER_READY_TIMEOUT_MS}ms`);
}

async function requestJson(pathname, init, cookieHeader) {
  const response = await fetch(`${BASE}${pathname}`, {
    ...init,
    headers: { "content-type": "application/json", ...(cookieHeader ? { cookie: cookieHeader } : {}), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(`${init?.method ?? "GET"} ${pathname} failed: ${response.status} ${text || "<empty response>"}`);
  return data;
}

async function openWorkspaceThread(page, ownerCookieValue, workspaceId, roomName) {
  await page.context().addCookies([{ name: "primoria_workspace_owner", value: ownerCookieValue, domain: BASE_HOSTNAME, path: "/" }]);
  await page.goto(`${BASE}/workspace?workspaceId=${workspaceId}`, { waitUntil: "domcontentloaded" });
  await page.locator(".workspace-switcher").getByRole("button", { name: /Groups/ }).click();
  await page.locator(".workspace-chat-section", { hasText: roomName }).getByText(roomName).click();
}

async function main() {
  const server = startServerIfNeeded();
  let browser;
  let failed = false;

  try {
    await waitForServer();

    const ownerCookieValue = `local_agent_approval_${RUN_ID.replace(/[^a-z0-9]/gi, "")}`;
    let ownerCookie = `primoria_workspace_owner=${ownerCookieValue}`;
    const created = await requestJson("/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name: WORKSPACE_NAME }),
    }, ownerCookie);
    const workspaceId = created.workspace.id;
    log("created workspace", workspaceId, "owner", ownerCookieValue);
    const roomId = created.threads.find((thread) => thread.type === "room")?.id;
    assert(roomId, "created workspace has a room");

    const renamedRoom = await requestJson(`/api/workspaces/${workspaceId}/threads`, {
      method: "POST",
      body: JSON.stringify({ type: "room", name: ROOM_NAME, description: "agent approval e2e" }),
    }, ownerCookie);
    const threadId = renamedRoom.thread.id;

    const agentData = await requestJson(`/api/workspaces/${workspaceId}/agents`, {
      method: "POST",
      body: JSON.stringify({
        displayName: AGENT_NAME,
        description: "Approval and artifact test agent.",
        systemPrompt: "Help the workspace by using approved tools only when requested.",
        visibility: "workspace",
        memoryScope: "thread",
        capabilities: [
          { kind: "skill", source: "system", path: "/skills/project-breakdown", enabled: true },
          { kind: "internal_tool", toolName: "create_workspace_task", approval: "always", enabled: true },
          { kind: "internal_tool", toolName: "save_learning_artifact", approval: "always", enabled: true },
        ],
      }),
    }, ownerCookie);
    assert(agentData.member.agentProfileId === agentData.profile.id, "agent member points at created profile");

    const approvalMessage = await requestJson(`/api/workspaces/${workspaceId}/messages`, {
      method: "POST",
      body: JSON.stringify({ threadId, content: `@${AGENT_NAME} create an approved task ${RUN_ID}` }),
    }, ownerCookie);
    log("DEBUG approvalMessage:", JSON.stringify(approvalMessage, null, 2));
    assert(approvalMessage.agentRuns?.[0]?.status === "completed", "normal message path completes with placeholder runtime");

    const taskRun = await requestJson(`/api/workspaces/${workspaceId}/tasks`, {
      method: "POST",
      body: JSON.stringify({ threadId, title: `Assigned approval task ${RUN_ID}`, assigneeId: agentData.member.id }),
    }, ownerCookie);
    assert(taskRun.agentRuns?.[0]?.trigger === "task_assignment", "task API returns task_assignment run");
    assert(taskRun.agentRuns?.[0]?.taskId === taskRun.task.id, "task run links task id");

    const viewAfterTask = await requestJson(`/api/workspaces/${workspaceId}`, undefined, ownerCookie);
    assert(viewAfterTask.tasks.some((task) => task.id === taskRun.task.id && task.status === "done"), "workspace view shows completed assigned task");

    const profile = agentData.profile;
    const member = agentData.member;
    const sourceMessage = approvalMessage.message;
    const now = Date.now();
    const approvalView = await requestJson(`/api/workspaces/${workspaceId}/test-seed-agent-run`, {
      method: "POST",
      body: JSON.stringify({
        run: {
          workspaceId,
          threadId,
          agentProfileId: profile.id,
          agentMemberId: member.id,
          trigger: "mention",
          status: "waiting_for_approval",
          inputMessageId: sourceMessage.id,
          startedAt: now,
        },
        events: [
          { type: "status", label: "started", payload: { test: true }, createdAt: now },
          {
            type: "approval_request",
            label: "save_learning_artifact",
            payload: {
              input: {
                title: `Approved Artifact ${RUN_ID}`,
                description: "Approved learning artifact from e2e.",
                groups: ["Artifact"],
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
          senderName: member.displayName,
          senderKind: "agent",
          content: `${AGENT_NAME} is waiting for approval before saving an artifact.`,
          createdAt: now + 3,
        },
      }),
    }, ownerCookie);
    const pendingApproval = approvalView.agentApprovals.find((approval) => approval.toolName === "save_learning_artifact" && approval.status === "pending");
    assert(pendingApproval, "seeded workspace exposes pending artifact approval");

    const approved = await requestJson(`/api/workspaces/${workspaceId}/agent-approvals/${pendingApproval.id}`, {
      method: "PATCH",
      body: JSON.stringify({ decision: "approved" }),
    }, ownerCookie);
    assert(approved.run.status === "completed", "approval API completes waiting artifact run");
    assert(approved.message?.artifact?.type === "task", "approval API creates learning artifact message");
    assert(approved.agentRunEvents?.some((event) => event.type === "artifact" && event.label === "save_learning_artifact"), "approval API records artifact event");

    const retrySeed = await requestJson(`/api/workspaces/${workspaceId}/test-seed-agent-run`, {
      method: "POST",
      body: JSON.stringify({
        run: {
          workspaceId,
          threadId,
          agentProfileId: profile.id,
          agentMemberId: member.id,
          trigger: "mention",
          status: "failed",
          inputMessageId: sourceMessage.id,
          startedAt: now + 10,
          completedAt: now + 11,
          error: "seeded retry failure",
        },
        events: [
          { type: "status", label: "started", payload: { test: true }, createdAt: now + 10 },
          { type: "status", label: "failed", payload: { error: "seeded retry failure" }, createdAt: now + 11 },
        ],
        outputMessage: {
          workspaceId,
          threadId,
          senderName: member.displayName,
          senderKind: "agent",
          content: `${AGENT_NAME} could not finish this run. seeded retry failure`,
          createdAt: now + 12,
        },
      }),
    }, ownerCookie);
    const failedRun = retrySeed.agentRuns.find((run) => run.status === "failed" && run.error === "seeded retry failure");
    assert(failedRun, "seeded workspace exposes failed retryable run");

    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1360, height: 860 } });
    await openWorkspaceThread(page, ownerCookieValue, workspaceId, ROOM_NAME);

    const artifactMessage = page.locator(".workspace-message.agent", { hasText: `Approved Artifact ${RUN_ID}` }).last();
    await artifactMessage.waitFor();
    await artifactMessage.locator(".workspace-assignment-card", { hasText: `Approved Artifact ${RUN_ID}` }).waitFor();

    const failedMessage = page.locator(".workspace-message.agent", { hasText: "seeded retry failure" }).last();
    await failedMessage.waitFor();
    await failedMessage.locator(".workspace-agent-run-chip", { hasText: "failed" }).click();
    await Promise.all([
      page.waitForResponse((response) => response.url().includes(`/agent-runs/${failedRun.id}/retry`) && response.status() === 200),
      page.getByRole("button", { name: "Retry run" }).click(),
    ]);
    await page.locator(".workspace-agent-run-chip", { hasText: "completed" }).last().waitFor();

    const finalView = await requestJson(`/api/workspaces/${workspaceId}`, undefined, ownerCookie);
    assert(finalView.agentRuns.some((run) => run.id !== failedRun.id && run.inputMessageId === sourceMessage.id && run.status === "completed"), "retry creates a new completed run from original input");
    assert(finalView.agentRunEvents.some((event) => event.label === "retried"), "retry persists source-run audit event");
    assert(finalView.messages.some((message) => message.artifact?.type === "task" && message.artifact.title === `Approved Artifact ${RUN_ID}`), "final view includes approved learning artifact");

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
