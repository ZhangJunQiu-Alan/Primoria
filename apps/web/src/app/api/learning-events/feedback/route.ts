import { NextResponse } from "next/server";
import { z } from "zod";
import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { recordLearningEvent } from "@/lib/learning-events/store";
import { verifyEventScope } from "@/lib/learning-events/scope";

// Records feedback on one assistant reply (thumbs up/down today; typed "懂了/
// 没懂" can post via:"text" later). The id is deterministic per (message,
// signal) so re-clicking the same thumb counts once, while switching from up to
// down still records the new signal.
const FeedbackSchema = z.object({
  targetMessageId: z.string().min(1),
  signal: z.enum(["positive", "negative"]),
  via: z.enum(["thumb", "text"]).default("thumb"),
  courseId: z.string().nullish(),
  lessonId: z.string().nullish(),
});

export async function POST(request: Request) {
  const { denied, user } = await requireConfiguredAuthUser("learning-feedback");
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = FeedbackSchema.parse(await request.json());
  const scope = await verifyEventScope(user.id, body.courseId, body.lessonId);
  await recordLearningEvent({
    type: "chat.feedback",
    ownerId: user.id,
    id: `cf_${body.targetMessageId}_${body.signal}`,
    targetMessageId: body.targetMessageId,
    via: body.via,
    signal: body.signal,
    courseId: scope.courseId,
    lessonId: scope.lessonId,
  });
  return NextResponse.json({ ok: true });
}
