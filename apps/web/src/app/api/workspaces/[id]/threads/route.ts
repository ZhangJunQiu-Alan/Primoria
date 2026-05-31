import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { createWorkspaceThread, getWorkspaceView, updateWorkspaceThread } from "@/lib/workspaces/store";

const ThreadSchema = z.object({
  type: z.enum(["room", "direct"]),
  name: z.string().min(1).max(80),
  description: z.string().max(140).optional(),
  agentTriggerMode: z.enum(["mention_only", "room_default", "quiet_review"]).optional(),
  allowedAgentProfileIds: z.array(z.string().min(1).max(160)).max(24).optional(),
  participantIds: z.array(z.string().min(1).max(160)).max(8).optional(),
});

const ThreadPatchSchema = z.object({
  threadId: z.string().min(1).max(160),
  agentTriggerMode: z.enum(["mention_only", "room_default", "quiet_review"]).optional(),
  allowedAgentProfileIds: z.array(z.string().min(1).max(160)).max(24).nullable().optional(),
});

function threadErrorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("not found") ? 404 : 400;
  return NextResponse.json({ error: message || fallback }, { status });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const parsed = ThreadSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Thread request is invalid." }, { status: 400 });
  let thread;
  try {
    thread = await createWorkspaceThread(ownerId, {
      workspaceId: id,
      type: parsed.data.type,
      name: parsed.data.name,
      description: parsed.data.description,
      agentTriggerMode: parsed.data.agentTriggerMode,
      allowedAgentProfileIds: parsed.data.allowedAgentProfileIds,
      participantIds: parsed.data.participantIds,
    });
  } catch (error) {
    return threadErrorResponse(error, "Thread could not be created.");
  }
  return NextResponse.json({ thread });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const parsed = ThreadPatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Thread update request is invalid." }, { status: 400 });
  try {
    const thread = await updateWorkspaceThread(ownerId, {
      workspaceId: id,
      threadId: parsed.data.threadId,
      agentTriggerMode: parsed.data.agentTriggerMode,
      allowedAgentProfileIds: parsed.data.allowedAgentProfileIds,
    });
    return NextResponse.json({ thread });
  } catch (error) {
    return threadErrorResponse(error, "Chat could not be updated.");
  }
}
