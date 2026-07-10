import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalAuthUser, requireConfiguredAuthUser } from "@/lib/auth/guard";
import { listCopilotMessages, upsertCopilotMessage } from "@/lib/copilot/thread-repository";
import { recordLearningEvent } from "@/lib/learning-events/store";
import { verifyEventScope } from "@/lib/learning-events/scope";

const MessageSchema = z.object({
  id: z.string(),
  role: z.string(),
  content: z.string(),
  metadata: z.unknown().optional(),
  createdAt: z.number().int().optional(),
  courseId: z.string().nullish(),
  lessonId: z.string().nullish(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { denied, user } = await getOptionalAuthUser("copilot-thread-messages");
  if (denied) return denied;
  if (!user) return NextResponse.json({ messages: [] });
  const { id } = await context.params;
  return NextResponse.json({ messages: await listCopilotMessages(user.id, id) });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { denied, user } = await requireConfiguredAuthUser("copilot-thread-messages");
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = MessageSchema.parse(await request.json());
  await upsertCopilotMessage(user.id, id, body);
  if (body.role === "user") {
    const scope = await verifyEventScope(user.id, body.courseId, body.lessonId);
    await recordLearningEvent({
      type: "chat.question",
      ownerId: user.id,
      id: `cq_${body.id}`,
      threadId: id,
      messageId: body.id,
      courseId: scope.courseId,
      lessonId: scope.lessonId,
    });
  }
  return NextResponse.json({ ok: true });
}
