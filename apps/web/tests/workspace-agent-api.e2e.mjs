#!/usr/bin/env node
// HTTP smoke for workspace agent API error contracts.

import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { startNextDevServer, stopNextDevServer } from "./workspace-e2e-next.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const PORT = process.env.PORT || "3140";
const BASE = process.env.WORKSPACE_E2E_BASE || `http://localhost:${PORT}`;
const SERVER_READY_TIMEOUT_MS = 90_000;
const RUN_ID = Date.now().toString(36);
const NEXT_DIST_DIR = `.next-agent-api-e2e-${RUN_ID}`;
const OWNER_COOKIE = `primoria_workspace_owner=local_agent_api_${RUN_ID.replace(/[^a-z0-9]/gi, "")}`;

function log(...args) {
  process.stdout.write(`[workspace-agent-api.e2e] ${args.join(" ")}\n`);
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
      const response = await fetch(`${BASE}/api/workspaces`, { cache: "no-store", headers: { cookie: OWNER_COOKIE } });
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

async function requestJson(pathname, init = {}) {
  const response = await fetch(`${BASE}${pathname}`, {
    ...init,
    headers: { "content-type": "application/json", cookie: OWNER_COOKIE, ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const text = await response.text();
  return { response, data: text ? JSON.parse(text) : {} };
}

async function main() {
  const server = startServerIfNeeded();
  let failed = false;

  try {
    await waitForServer();

    const invalidWorkspaceCreate = await requestJson("/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
    });
    assert(invalidWorkspaceCreate.response.status === 400, "workspace create returns 400 for invalid body");
    assert(invalidWorkspaceCreate.data.error === "Workspace request is invalid.", "workspace create returns explicit validation JSON");

    const invalidWorkspaceJoin = await requestJson("/api/workspaces/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode: "" }),
    });
    assert(invalidWorkspaceJoin.response.status === 400, "workspace join returns 400 for invalid body");
    assert(invalidWorkspaceJoin.data.error === "Workspace join request is invalid.", "workspace join returns explicit validation JSON");

    const missingWorkspaceJoin = await requestJson("/api/workspaces/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode: "missing_invite_code" }),
    });
    assert(missingWorkspaceJoin.response.status === 404, "workspace join returns 404 for missing invite");
    assert(missingWorkspaceJoin.data.error === "Invite code not found.", "workspace join returns explicit not-found JSON");

    const created = await requestJson("/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name: `Agent API Workspace ${RUN_ID}` }),
    });
    assert(created.response.ok, "workspace creation succeeds");
    const workspaceId = created.data.workspace.id;

    const invalidThreadCreate = await requestJson(`/api/workspaces/${workspaceId}/threads`, {
      method: "POST",
      body: JSON.stringify({ type: "room", name: "" }),
    });
    assert(invalidThreadCreate.response.status === 400, "thread create returns 400 for invalid body");
    assert(invalidThreadCreate.data.error === "Thread request is invalid.", "thread create returns explicit validation JSON");

    const invalidThreadUpdate = await requestJson(`/api/workspaces/${workspaceId}/threads`, {
      method: "PATCH",
      body: JSON.stringify({ threadId: "" }),
    });
    assert(invalidThreadUpdate.response.status === 400, "thread update returns 400 for invalid body");
    assert(invalidThreadUpdate.data.error === "Thread update request is invalid.", "thread update returns explicit validation JSON");

    const invalidMessageCreate = await requestJson(`/api/workspaces/${workspaceId}/messages`, {
      method: "POST",
      body: JSON.stringify({ threadId: "", content: "" }),
    });
    assert(invalidMessageCreate.response.status === 400, "message create returns 400 for invalid body");
    assert(invalidMessageCreate.data.error === "Message request is invalid.", "message create returns explicit validation JSON");

    const invalidTaskCreate = await requestJson(`/api/workspaces/${workspaceId}/tasks`, {
      method: "POST",
      body: JSON.stringify({ threadId: "", title: "" }),
    });
    assert(invalidTaskCreate.response.status === 400, "task create returns 400 for invalid body");
    assert(invalidTaskCreate.data.error === "Task request is invalid.", "task create returns explicit validation JSON");

    const invalidTaskUpdate = await requestJson(`/api/workspaces/${workspaceId}/tasks/missing_task`, {
      method: "PATCH",
      body: JSON.stringify({ status: "" }),
    });
    assert(invalidTaskUpdate.response.status === 400, "task update returns 400 for invalid body");
    assert(invalidTaskUpdate.data.error === "Task update request is invalid.", "task update returns explicit validation JSON");

    const missingTaskUpdate = await requestJson(`/api/workspaces/${workspaceId}/tasks/missing_task`, {
      method: "PATCH",
      body: JSON.stringify({ status: "done" }),
    });
    assert(missingTaskUpdate.response.status === 404, "task update returns 404 for missing task");
    assert(missingTaskUpdate.data.error === "Task not found.", "task update returns explicit not-found JSON");

    const invalidMemberCreate = await requestJson(`/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      body: JSON.stringify({ displayName: "" }),
    });
    assert(invalidMemberCreate.response.status === 400, "member create returns 400 for invalid body");
    assert(invalidMemberCreate.data.error === "Member request is invalid.", "member create returns explicit validation JSON");

    const invalidCreate = await requestJson(`/api/workspaces/${workspaceId}/agents`, {
      method: "POST",
      body: JSON.stringify({ visibility: "not-a-real-visibility" }),
    });
    assert(invalidCreate.response.status === 400, "agent create returns 400 for invalid body");
    assert(invalidCreate.data.error === "Agent request is invalid.", "agent create returns explicit validation JSON");

    const emptyCapabilities = await requestJson(`/api/workspaces/${workspaceId}/agents`, {
      method: "POST",
      body: JSON.stringify({
        displayName: "Empty API Agent",
        description: "Should not save.",
        systemPrompt: "Help only when configured.",
        capabilities: [],
      }),
    });
    assert(emptyCapabilities.response.status === 400, "agent create returns 400 for empty capabilities");
    assert(emptyCapabilities.data.error.includes("at least one enabled"), "agent create returns explicit store validation JSON");

    const weakApprovalCreate = await requestJson(`/api/workspaces/${workspaceId}/agents`, {
      method: "POST",
      body: JSON.stringify({
        displayName: "Weak Approval API Agent",
        description: "Should not save with downgraded approval.",
        systemPrompt: "Help only when approval policy allows it.",
        capabilities: [{ kind: "internal_tool", toolName: "save_agent_memory", approval: "on_risk", enabled: true }],
      }),
    });
    assert(weakApprovalCreate.response.status === 400, "agent create returns 400 for approval policy validation");
    assert(weakApprovalCreate.data.error.includes("approval"), "agent create returns explicit approval policy validation JSON");

    const validAgent = await requestJson(`/api/workspaces/${workspaceId}/agents`, {
      method: "POST",
      body: JSON.stringify({
        displayName: "Patch API Agent",
        description: "Valid agent for update validation.",
        systemPrompt: "Help with a safe skill.",
        capabilities: [{ kind: "skill", source: "system", path: "/skills/project-breakdown", enabled: true }],
      }),
    });
    assert(validAgent.response.ok && validAgent.data.profile?.id, "agent create returns a profile for update validation");
    const generalThreadId = created.data.threads?.[0]?.id;
    assert(generalThreadId && validAgent.data.member?.id, "agent create returns a member and workspace has a seed thread for run retry validation");
    const unrecoverableRunSeed = await requestJson(`/api/workspaces/${workspaceId}/test-seed-agent-run`, {
      method: "POST",
      body: JSON.stringify({
        run: {
          workspaceId,
          threadId: generalThreadId,
          agentProfileId: validAgent.data.profile.id,
          agentMemberId: validAgent.data.member.id,
          trigger: "manual",
          status: "failed",
          error: "Seeded failed run without input.",
        },
        events: [{ type: "status", label: "failed", payload: { error: "Seeded failed run without input." } }],
      }),
    });
    assert(unrecoverableRunSeed.response.ok && unrecoverableRunSeed.data.agentRuns?.[0]?.id, "test seed creates unrecoverable failed agent run");
    const unrecoverableRetry = await requestJson(`/api/workspaces/${workspaceId}/agent-runs/${unrecoverableRunSeed.data.agentRuns[0].id}/retry`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert(unrecoverableRetry.response.status === 400, "agent run retry returns 400 when no recoverable input exists");
    assert(unrecoverableRetry.data.error === "Retry input message not found.", "agent run retry returns clear unrecoverable input JSON");

    const terminalApprovalSeed = await requestJson(`/api/workspaces/${workspaceId}/test-seed-agent-run`, {
      method: "POST",
      body: JSON.stringify({
        run: {
          workspaceId,
          threadId: generalThreadId,
          agentProfileId: validAgent.data.profile.id,
          agentMemberId: validAgent.data.member.id,
          trigger: "manual",
          status: "failed",
          error: "Seeded terminal run with stale approval.",
        },
        events: [
          {
            type: "approval_request",
            label: "create_workspace_task",
            payload: {
              input: { title: "Stale API task" },
              policy: { visibleLabel: "Create task", risk: "write" },
            },
          },
        ],
        createApprovals: true,
      }),
    });
    const terminalApproval = terminalApprovalSeed.data.agentApprovals?.[0];
    assert(terminalApprovalSeed.response.ok && terminalApproval?.id, "test seed creates stale terminal-run approval");
    const rejectedTerminalApproval = await requestJson(`/api/workspaces/${workspaceId}/agent-approvals/${terminalApproval.id}`, {
      method: "PATCH",
      body: JSON.stringify({ decision: "approved" }),
    });
    assert(rejectedTerminalApproval.response.status === 400, "approval decision returns 400 for terminal run approvals");
    assert(rejectedTerminalApproval.data.error.includes("terminal run"), "approval decision returns clear terminal-run JSON");

    const weakApprovalUpdate = await requestJson(`/api/workspaces/${workspaceId}/agents/${validAgent.data.profile.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        capabilities: [{ kind: "internal_tool", toolName: "save_agent_memory", approval: "on_risk", enabled: true }],
      }),
    });
    assert(weakApprovalUpdate.response.status === 400, "agent profile update returns 400 for approval policy validation");
    assert(weakApprovalUpdate.data.error.includes("approval"), "agent profile update returns explicit approval policy validation JSON");

    const missingProfile = await requestJson(`/api/workspaces/${workspaceId}/agents/missing_profile`, {
      method: "PATCH",
      body: JSON.stringify({ displayName: "Missing" }),
    });
    assert(missingProfile.response.status === 404, "agent profile update returns 404 for missing profile");
    assert(missingProfile.data.error === "Agent profile not found.", "agent profile update returns explicit not-found JSON");

    const invalidUpdate = await requestJson(`/api/workspaces/${workspaceId}/agents/missing_profile`, {
      method: "PATCH",
      body: JSON.stringify({ visibility: "team" }),
    });
    assert(invalidUpdate.response.status === 400, "agent profile update returns 400 for invalid body");
    assert(invalidUpdate.data.error === "Agent update request is invalid.", "agent profile update returns explicit validation JSON");

    const invalidConnectionCreate = await requestJson(`/api/workspaces/${workspaceId}/agent-connections`, {
      method: "POST",
      body: JSON.stringify({ transport: "ftp" }),
    });
    assert(invalidConnectionCreate.response.status === 400, "connection create returns 400 for invalid body");
    assert(invalidConnectionCreate.data.error === "Connection request is invalid.", "connection create returns explicit validation JSON");

    const emptyConnectionTools = await requestJson(`/api/workspaces/${workspaceId}/agent-connections`, {
      method: "POST",
      body: JSON.stringify({
        scope: "workspace",
        displayName: "Empty Connection",
        transport: "http",
        configRef: "connection://empty",
        allowedToolNames: [],
      }),
    });
    assert(emptyConnectionTools.response.status === 400, "connection create returns 400 for empty tool allowlist");
    assert(emptyConnectionTools.data.error === "Connection request is invalid.", "connection create validates tool allowlist before store");

    const missingConnectionPatch = await requestJson(`/api/workspaces/${workspaceId}/agent-connections`, {
      method: "PATCH",
      body: JSON.stringify({ connectionId: "missing_connection", status: "disabled" }),
    });
    assert(missingConnectionPatch.response.status === 404, "connection patch returns 404 for missing connection");
    assert(missingConnectionPatch.data.error === "Agent connection not found.", "connection patch returns explicit not-found JSON");

    const invalidConnectionPatch = await requestJson(`/api/workspaces/${workspaceId}/agent-connections`, {
      method: "PATCH",
      body: JSON.stringify({ connectionId: "missing_connection", status: "paused" }),
    });
    assert(invalidConnectionPatch.response.status === 400, "connection patch returns 400 for invalid body");
    assert(invalidConnectionPatch.data.error === "Connection update request is invalid.", "connection patch returns explicit validation JSON");

    const invalidSkillCreate = await requestJson(`/api/workspaces/${workspaceId}/agent-skills`, {
      method: "POST",
      body: JSON.stringify({ name: "" }),
    });
    assert(invalidSkillCreate.response.status === 400, "skill create returns 400 for invalid body");
    assert(invalidSkillCreate.data.error === "Skill request is invalid.", "skill create returns explicit validation JSON");

    const invalidSkillPatch = await requestJson(`/api/workspaces/${workspaceId}/agent-skills`, {
      method: "PATCH",
      body: JSON.stringify({ path: "" }),
    });
    assert(invalidSkillPatch.response.status === 400, "skill patch returns 400 for invalid body");
    assert(invalidSkillPatch.data.error === "Skill update request is invalid.", "skill patch returns explicit validation JSON");

    const missingSkillPatch = await requestJson(`/api/workspaces/${workspaceId}/agent-skills`, {
      method: "PATCH",
      body: JSON.stringify({ path: "/workspace-skills/missing/skill", description: "Updated" }),
    });
    assert(missingSkillPatch.response.status === 404, "skill patch returns 404 for missing skill");
    assert(missingSkillPatch.data.error === "Skill not found", "skill patch returns explicit not-found JSON");

    const invalidSkillDelete = await requestJson(`/api/workspaces/${workspaceId}/agent-skills`, {
      method: "DELETE",
      body: JSON.stringify({ path: "" }),
    });
    assert(invalidSkillDelete.response.status === 400, "skill delete returns 400 for invalid body");
    assert(invalidSkillDelete.data.error === "Skill delete request is invalid.", "skill delete returns explicit validation JSON");

    const invalidArtifactReview = await requestJson(`/api/workspaces/${workspaceId}/artifacts/missing_artifact`, {
      method: "PATCH",
      body: JSON.stringify({ reviewStatus: "done" }),
    });
    assert(invalidArtifactReview.response.status === 400, "artifact review returns 400 for invalid body");
    assert(invalidArtifactReview.data.error === "Artifact review request is invalid.", "artifact review returns explicit validation JSON");

    const missingArtifactReview = await requestJson(`/api/workspaces/${workspaceId}/artifacts/missing_artifact`, {
      method: "PATCH",
      body: JSON.stringify({ reviewStatus: "reviewed" }),
    });
    assert(missingArtifactReview.response.status === 404, "artifact review returns 404 for missing artifact");
    assert(missingArtifactReview.data.error === "Workspace artifact not found.", "artifact review returns explicit not-found JSON");

    const invalidBulkMemoryArchive = await requestJson(`/api/workspaces/${workspaceId}/agent-memories/bulk-archive`, {
      method: "POST",
      body: JSON.stringify({ memoryIds: [] }),
    });
    assert(invalidBulkMemoryArchive.response.status === 400, "memory bulk archive returns 400 for invalid body");
    assert(invalidBulkMemoryArchive.data.error === "Memory archive request is invalid.", "memory bulk archive returns explicit validation JSON");

    const missingBulkMemoryArchive = await requestJson(`/api/workspaces/${workspaceId}/agent-memories/bulk-archive`, {
      method: "POST",
      body: JSON.stringify({ memoryIds: ["missing_memory"] }),
    });
    assert(missingBulkMemoryArchive.response.status === 404, "memory bulk archive returns 404 for missing memory");
    assert(missingBulkMemoryArchive.data.error === "Agent memory not found.", "memory bulk archive returns explicit not-found JSON");

    const unsupportedMemoryAction = await requestJson(`/api/workspaces/${workspaceId}/agent-memories/missing_memory`, {
      method: "POST",
      body: JSON.stringify({ intent: "review" }),
    });
    assert(unsupportedMemoryAction.response.status === 400, "memory action returns 400 for unsupported intent");
    assert(unsupportedMemoryAction.data.error === "Unsupported memory action.", "memory action returns explicit unsupported-action JSON");

    const missingMemoryRestore = await requestJson(`/api/workspaces/${workspaceId}/agent-memories/missing_memory?intent=restore`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert(missingMemoryRestore.response.status === 404, "memory restore returns 404 for missing memory");
    assert(missingMemoryRestore.data.error === "Agent memory not found.", "memory restore returns explicit not-found JSON");

    const missingMemoryDelete = await requestJson(`/api/workspaces/${workspaceId}/agent-memories/missing_memory?intent=delete`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert(missingMemoryDelete.response.status === 404, "memory delete returns 404 for missing memory");
    assert(missingMemoryDelete.data.error === "Agent memory not found.", "memory delete returns explicit not-found JSON");

    const missingMemoryArchive = await requestJson(`/api/workspaces/${workspaceId}/agent-memories/missing_memory`, {
      method: "DELETE",
    });
    assert(missingMemoryArchive.response.status === 404, "memory archive returns 404 for missing memory");
    assert(missingMemoryArchive.data.error === "Agent memory not found.", "memory archive returns explicit not-found JSON");

    const invalidApprovalDecision = await requestJson(`/api/workspaces/${workspaceId}/agent-approvals/missing_approval`, {
      method: "PATCH",
      body: JSON.stringify({ decision: "maybe" }),
    });
    assert(invalidApprovalDecision.response.status === 400, "approval decision returns 400 for invalid body");
    assert(invalidApprovalDecision.data.error === "Approval decision request is invalid.", "approval decision returns explicit validation JSON");

    const missingApprovalDecision = await requestJson(`/api/workspaces/${workspaceId}/agent-approvals/missing_approval`, {
      method: "PATCH",
      body: JSON.stringify({ decision: "denied" }),
    });
    assert(missingApprovalDecision.response.status === 404, "approval decision returns 404 for missing approval");
    assert(missingApprovalDecision.data.error === "Agent approval not found.", "approval decision returns explicit not-found JSON");

    const invalidCancelRun = await requestJson(`/api/workspaces/${workspaceId}/agent-runs/missing_run/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason: "x".repeat(501) }),
    });
    assert(invalidCancelRun.response.status === 400, "agent run cancel returns 400 for invalid body");
    assert(invalidCancelRun.data.error === "Agent run cancel request is invalid.", "agent run cancel returns explicit validation JSON");

    const missingCancelRun = await requestJson(`/api/workspaces/${workspaceId}/agent-runs/missing_run/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason: "not needed" }),
    });
    assert(missingCancelRun.response.status === 404, "agent run cancel returns 404 for missing run");
    assert(missingCancelRun.data.error === "Agent run not found.", "agent run cancel returns explicit not-found JSON");

    log("ALL CHECKS PASSED");
  } catch (error) {
    failed = true;
    log("TEST FAILED:", error.message);
  } finally {
    if (server) await stopNextDevServer({ ...server, log });
  }

  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  log("fatal:", error.message);
  process.exit(1);
});
