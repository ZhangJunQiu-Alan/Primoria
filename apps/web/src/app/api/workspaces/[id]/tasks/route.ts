import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { createWorkspaceTask, getWorkspaceView, runWorkspaceAgentTask } from "@/lib/workspaces/store";

const TaskSchema = z.object({
  threadId: z.string().min(1),
  title: z.string().min(1).max(160),
  scope: z.string().min(1).max(80).optional(),
  progress: z.string().min(1).max(80).optional(),
  assigneeId: z.string().min(1).max(120).optional(),
  dueAt: z.string().max(80).optional(),
  sourceArtifactId: z.string().min(1).max(160).optional(),
  sourceRunId: z.string().min(1).max(160).optional(),
});

function taskErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Task could not be created.";
  const status = message.includes("not found") ? 404 : message.includes("required") ? 400 : 500;
  return NextResponse.json({ error: message || "Task could not be created." }, { status });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const parsed = TaskSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Task request is invalid." }, { status: 400 });
  let task;
  let agentRun;
  try {
    task = await createWorkspaceTask(ownerId, {
      workspaceId: id,
      threadId: parsed.data.threadId,
      title: parsed.data.title,
      scope: parsed.data.scope,
      progress: parsed.data.progress,
      assigneeId: parsed.data.assigneeId,
      dueAt: parsed.data.dueAt,
      sourceArtifactId: parsed.data.sourceArtifactId,
      sourceRunId: parsed.data.sourceRunId,
    });
    agentRun = await runWorkspaceAgentTask(ownerId, { workspaceId: id, task });
  } catch (error) {
    return taskErrorResponse(error);
  }
  return NextResponse.json({
    task: agentRun.task ?? task,
    agentMessages: agentRun.messages,
    agentRuns: agentRun.runs,
    agentRunEvents: agentRun.events,
    agentApprovals: agentRun.approvals ?? [],
    agentMemories: agentRun.memories ?? [],
    agentArtifacts: agentRun.artifacts ?? [],
  });
}
