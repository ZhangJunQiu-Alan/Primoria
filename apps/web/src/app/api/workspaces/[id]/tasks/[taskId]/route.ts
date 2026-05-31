import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { getWorkspaceView, updateWorkspaceTask } from "@/lib/workspaces/store";

const TaskUpdateSchema = z.object({
  status: z.string().min(1).max(40),
  progress: z.string().min(1).max(80).optional(),
  assigneeId: z.string().min(1).max(120).optional(),
  resultSummary: z.string().max(500).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string; taskId: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id, taskId } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const parsed = TaskUpdateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Task update request is invalid." }, { status: 400 });
  let task;
  try {
    task = await updateWorkspaceTask(ownerId, {
      workspaceId: id,
      taskId,
      status: parsed.data.status,
      progress: parsed.data.progress,
      assigneeId: parsed.data.assigneeId,
      resultSummary: parsed.data.resultSummary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Task could not be updated.";
    if (message.includes("not found")) return NextResponse.json({ error: "Task not found." }, { status: 404 });
    const status = message.includes("required") || message.includes("Invalid") ? 400 : 500;
    return NextResponse.json({ error: message || "Task could not be updated." }, { status });
  }
  return NextResponse.json({ task });
}
