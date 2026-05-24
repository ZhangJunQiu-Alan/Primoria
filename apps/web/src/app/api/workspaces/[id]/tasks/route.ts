import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createWorkspaceTask, getWorkspaceView } from "@/lib/workspaces/store";

const TaskSchema = z.object({
  threadId: z.string().min(1),
  title: z.string().min(1).max(160),
  scope: z.string().min(1).max(80).optional(),
  progress: z.string().min(1).max(80).optional(),
  dueAt: z.string().max(80).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;
  const view = await getWorkspaceView(user?.id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const body = TaskSchema.parse(await request.json());
  const task = await createWorkspaceTask(user?.id, {
    workspaceId: id,
    threadId: body.threadId,
    title: body.title,
    scope: body.scope,
    progress: body.progress,
    dueAt: body.dueAt,
  });
  return NextResponse.json({ task });
}
