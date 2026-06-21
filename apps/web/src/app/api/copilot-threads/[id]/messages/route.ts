import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { listCopilotMessages, upsertCopilotMessage } from "@/lib/copilot/thread-repository";
import { recordLearningEvent } from "@/lib/learning-events/store";

const MessageSchema = z.object({
  id: z.string(),
  role: z.string(),
  content: z.string(),
  metadata: z.unknown().optional(),
  createdAt: z.number().int().optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAuthEnabled()) return NextResponse.json({ messages: [] });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ messages: [] });
  const { id } = await context.params;
  return NextResponse.json({ messages: await listCopilotMessages(user.id, id) });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAuthEnabled()) return NextResponse.json({ ok: false, error: "Auth is not configured" }, { status: 503 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = MessageSchema.parse(await request.json());
  await upsertCopilotMessage(user.id, id, body);
  if (body.role === "user") {
    await recordLearningEvent({
      type: "chat.question",
      ownerId: user.id,
      id: `cq_${body.id}`,
      threadId: id,
      messageId: body.id,
    });
  }
  return NextResponse.json({ ok: true });
}
