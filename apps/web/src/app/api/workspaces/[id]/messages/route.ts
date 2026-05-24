import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createWorkspaceMessage, getWorkspaceView } from "@/lib/workspaces/store";

const MessageSchema = z.object({
  threadId: z.string().min(1),
  content: z.string().min(1).max(4000),
  senderName: z.string().min(1).max(80).optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;
  const view = await getWorkspaceView(user?.id);
  if (view.workspace.id !== id) return NextResponse.json({ messages: [] }, { status: 404 });
  return NextResponse.json({ messages: view.messages });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;
  const body = MessageSchema.parse(await request.json());
  const message = await createWorkspaceMessage(user?.id, {
    workspaceId: id,
    threadId: body.threadId,
    content: body.content,
    senderName: body.senderName ?? user?.displayName ?? "You",
    senderKind: "human",
  });
  return NextResponse.json({ message });
}
