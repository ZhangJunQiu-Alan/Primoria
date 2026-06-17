import { randomBytes } from "node:crypto";
import type {
  WorkspaceAgentApproval,
  WorkspaceAgentProfile,
  WorkspaceAgentRun,
  WorkspaceAgentRunEvent,
  WorkspaceAgentRunStatus,
  WorkspaceMessage,
} from "./types";

export function buildAgentRunEvent(
  run: WorkspaceAgentRun,
  type: WorkspaceAgentRunEvent["type"],
  label: string,
  payload?: unknown,
  createdAt = Date.now(),
): WorkspaceAgentRunEvent {
  return {
    id: `warevt_${randomBytes(10).toString("base64url")}`,
    runId: run.id,
    workspaceId: run.workspaceId,
    threadId: run.threadId,
    type,
    label,
    payload,
    createdAt,
  };
}

export function buildWorkspaceAgentProfileRunSnapshot(profile: WorkspaceAgentProfile) {
  return {
    id: profile.id,
    displayName: profile.displayName,
    handle: profile.handle,
    description: profile.description,
    visibility: profile.visibility,
    templateKey: profile.templateKey,
    memoryScope: profile.memoryScope,
    defaultModel: profile.defaultModel,
    capabilities: profile.capabilities
      .filter((capability) => capability.enabled)
      .map((capability) => {
        if (capability.kind === "skill") {
          return { kind: capability.kind, source: capability.source, path: capability.path };
        }
        if (capability.kind === "internal_tool") {
          return { kind: capability.kind, toolName: capability.toolName, approval: capability.approval };
        }
        if (capability.kind === "mcp_tool") {
          return { kind: capability.kind, connectionId: capability.connectionId, toolName: capability.toolName, approval: capability.approval };
        }
        return { kind: capability.kind, agentProfileId: capability.agentProfileId };
      }),
  };
}

export function isTerminalAgentRunStatus(status: WorkspaceAgentRunStatus) {
  return status === "completed" || status === "failed" || status === "cancelled";
}

export function buildWorkspaceRuntimeVisibleMessages(messages: WorkspaceMessage[]) {
  return messages.map((message) => ({
    id: message.id,
    threadId: message.threadId,
    senderName: message.senderName,
    content: message.content,
    createdAt: message.createdAt,
  }));
}

export function buildPendingWorkspaceAgentApprovals(
  run: WorkspaceAgentRun,
  events: WorkspaceAgentRunEvent[],
  deepAgentThreadId: string,
  requestedAt: number,
): WorkspaceAgentApproval[] {
  return events.flatMap((event) => {
    if (event.type !== "approval_request") return [];
    const payload = readObject(event.payload);
    const policy = buildWorkspaceApprovalPolicyPayload(payload);
    const input = "input" in payload ? payload.input : stripApprovalEnvelope(payload);
    const eventThreadId = typeof payload.deepAgentThreadId === "string" ? payload.deepAgentThreadId : deepAgentThreadId;
    return [
      {
        id: `waapr_${randomBytes(10).toString("base64url")}`,
        workspaceId: run.workspaceId,
        threadId: run.threadId,
        runId: run.id,
        agentProfileId: run.agentProfileId,
        agentMemberId: run.agentMemberId,
        toolName: event.label,
        status: "pending",
        input,
        policy,
        deepAgentThreadId: eventThreadId,
        requestedAt: event.createdAt || requestedAt,
      },
    ];
  });
}

export function createWorkspaceAgentRunId() {
  return `warun_${randomBytes(10).toString("base64url")}`;
}

export function readObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function buildWorkspaceApprovalPolicyPayload(payload: Record<string, unknown>) {
  const basePolicy = readObject(payload.policy);
  const reviewConfig = readObject(payload.reviewConfig);
  const actionDescription = readOptionalString(payload.actionDescription);
  const hasReviewConfig = Object.keys(reviewConfig).length > 0;
  if (!hasReviewConfig && !actionDescription) return Object.keys(basePolicy).length ? basePolicy : undefined;
  return {
    ...basePolicy,
    ...(hasReviewConfig ? { reviewConfig } : {}),
    ...(actionDescription ? { actionDescription } : {}),
  };
}

function stripApprovalEnvelope(payload: Record<string, unknown>) {
  const { policy: _policy, deepAgentThreadId: _deepAgentThreadId, reviewConfig: _reviewConfig, actionDescription: _actionDescription, ...input } = payload;
  return Object.keys(input).length ? input : undefined;
}

export function readOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

export function readOptionalNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function readStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const strings = value.flatMap((entry) => {
    const next = readOptionalString(entry);
    return next ? [next] : [];
  });
  return strings.length ? strings : fallback;
}
