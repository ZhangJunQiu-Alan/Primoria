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
  const body = TaskUpdateSchema.parse(await request.json());
  const task = await updateWorkspaceTask(ownerId, {
    workspaceId: id,
    taskId,
    status: body.status,
    progress: body.progress,
    assigneeId: body.assigneeId,
    resultSummary: body.resultSummary,
  });
  return NextResponse.json({ task });
}
