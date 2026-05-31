import { workspaceAgentApprovals, workspaceAgentRunEvents, workspaceAgentRuns, workspaceMessages } from "../db/schema";
import type {
  WorkspaceAgentApproval,
  WorkspaceAgentRun,
  WorkspaceAgentRunEvent,
  WorkspaceAgentRunStatus,
  WorkspaceAgentRunTrigger,
  WorkspaceMessage,
  WorkspaceMessageArtifact,
} from "./types";

export function rowToWorkspaceMessage(message: typeof workspaceMessages.$inferSelect): WorkspaceMessage {
  return {
    id: message.id,
    workspaceId: message.workspaceId,
    threadId: message.threadId,
    senderName: message.senderName,
    senderKind: message.senderKind as WorkspaceMessage["senderKind"],
    content: message.content,
    artifact: (message.artifact ?? undefined) as WorkspaceMessageArtifact | undefined,
    createdAt: message.createdAt.getTime(),
  };
}

export function rowToWorkspaceAgentRun(run: typeof workspaceAgentRuns.$inferSelect): WorkspaceAgentRun {
  return {
    id: run.id,
    workspaceId: run.workspaceId,
    threadId: run.threadId,
    agentProfileId: run.agentProfileId,
    agentMemberId: run.agentMemberId ?? undefined,
    trigger: run.trigger as WorkspaceAgentRunTrigger,
    status: run.status as WorkspaceAgentRunStatus,
    inputMessageId: run.inputMessageId ?? undefined,
    outputMessageId: run.outputMessageId ?? undefined,
    taskId: run.taskId ?? undefined,
    startedAt: run.startedAt.getTime(),
    completedAt: run.completedAt?.getTime(),
    error: run.error ?? undefined,
  };
}

export function rowToWorkspaceAgentRunEvent(event: typeof workspaceAgentRunEvents.$inferSelect): WorkspaceAgentRunEvent {
  return {
    id: event.id,
    runId: event.runId,
    workspaceId: event.workspaceId,
    threadId: event.threadId,
    type: event.type as WorkspaceAgentRunEvent["type"],
    label: event.label,
    payload: event.payload ?? undefined,
    createdAt: event.createdAt.getTime(),
  };
}

export function rowToWorkspaceAgentApproval(approval: typeof workspaceAgentApprovals.$inferSelect): WorkspaceAgentApproval {
  return {
    id: approval.id,
    workspaceId: approval.workspaceId,
    threadId: approval.threadId,
    runId: approval.runId,
    agentProfileId: approval.agentProfileId,
    agentMemberId: approval.agentMemberId ?? undefined,
    toolName: approval.toolName,
    status: approval.status as WorkspaceAgentApproval["status"],
    input: approval.input ?? undefined,
    policy: approval.policy ?? undefined,
    deepAgentThreadId: approval.deepAgentThreadId ?? undefined,
    requestedAt: approval.requestedAt.getTime(),
    decidedAt: approval.decidedAt?.getTime(),
    decidedBy: approval.decidedBy ?? undefined,
    decisionReason: approval.decisionReason ?? undefined,
  };
}
