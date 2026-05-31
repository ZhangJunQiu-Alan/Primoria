import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { workspaceAgentRuns, workspaceArtifacts, workspaceTasks } from "../db/schema";
import type { WorkspaceTask, WorkspaceView } from "./types";

export type WorkspaceTaskServiceContext = {
  requireDbThread(ownerId: string, workspaceId: string, threadId: string): Promise<void>;
};

export function buildTaskMetadata(task: WorkspaceTask) {
  if (!task.assigneeId && !task.assigneeName && !task.resultSummary && !task.submittedAt && !task.sourceArtifactId && !task.sourceRunId) return null;
  return {
    assigneeId: task.assigneeId,
    assigneeName: task.assigneeName,
    resultSummary: task.resultSummary,
    submittedAt: task.submittedAt,
    sourceArtifactId: task.sourceArtifactId,
    sourceRunId: task.sourceRunId,
  };
}

export function readTaskMetadata(metadata: unknown): Pick<WorkspaceTask, "assigneeId" | "assigneeName" | "resultSummary" | "submittedAt" | "sourceArtifactId" | "sourceRunId"> {
  if (!metadata || typeof metadata !== "object") return {};
  const record = metadata as Record<string, unknown>;
  return {
    assigneeId: typeof record.assigneeId === "string" ? record.assigneeId : undefined,
    assigneeName: typeof record.assigneeName === "string" ? record.assigneeName : undefined,
    resultSummary: typeof record.resultSummary === "string" ? record.resultSummary : undefined,
    submittedAt: typeof record.submittedAt === "number" ? record.submittedAt : undefined,
    sourceArtifactId: typeof record.sourceArtifactId === "string" ? record.sourceArtifactId : undefined,
    sourceRunId: typeof record.sourceRunId === "string" ? record.sourceRunId : undefined,
  };
}

export function rowToWorkspaceTask(task: typeof workspaceTasks.$inferSelect): WorkspaceTask {
  return {
    id: task.id,
    workspaceId: task.workspaceId,
    threadId: task.threadId,
    title: task.title,
    scope: task.scope,
    status: task.status,
    progress: task.progress,
    ...readTaskMetadata(task.metadata),
    dueAt: task.dueAt ?? undefined,
    createdAt: task.createdAt.getTime(),
    updatedAt: task.updatedAt.getTime(),
  };
}

export function assertLocalWorkspaceTaskSourceVisibility(view: WorkspaceView, task: WorkspaceTask) {
  if (task.sourceArtifactId) {
    const artifact = view.artifacts.find((entry) => entry.id === task.sourceArtifactId && entry.workspaceId === task.workspaceId);
    if (!artifact) throw new Error("Workspace artifact not found.");
    if (artifact.sourceRunId && task.sourceRunId && artifact.sourceRunId !== task.sourceRunId) throw new Error("Task source run does not match source artifact.");
  }
  if (task.sourceRunId) {
    const run = view.agentRuns.find((entry) => entry.id === task.sourceRunId && entry.workspaceId === task.workspaceId);
    if (!run && !task.sourceArtifactId) throw new Error("Agent run not found.");
  }
}

export async function assertDbWorkspaceTaskSourceVisibility(
  context: WorkspaceTaskServiceContext,
  ownerId: string,
  workspaceId: string,
  task: WorkspaceTask,
) {
  if (task.sourceArtifactId) {
    const artifactRows = await getDb()
      .select()
      .from(workspaceArtifacts)
      .where(and(eq(workspaceArtifacts.id, task.sourceArtifactId), eq(workspaceArtifacts.workspaceId, workspaceId)))
      .limit(1);
    const artifact = artifactRows[0];
    if (!artifact) throw new Error("Workspace artifact not found.");
    await context.requireDbThread(ownerId, workspaceId, artifact.threadId);
    if (artifact.sourceRunId && task.sourceRunId && artifact.sourceRunId !== task.sourceRunId) throw new Error("Task source run does not match source artifact.");
  }
  if (task.sourceRunId) {
    const runRows = await getDb()
      .select()
      .from(workspaceAgentRuns)
      .where(and(eq(workspaceAgentRuns.id, task.sourceRunId), eq(workspaceAgentRuns.workspaceId, workspaceId)))
      .limit(1);
    const run = runRows[0];
    if (!run && !task.sourceArtifactId) throw new Error("Agent run not found.");
    if (run) await context.requireDbThread(ownerId, workspaceId, run.threadId);
  }
}
