import { and, eq } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "../db/client";
import { lessons } from "../db/schema";

// Server-side validation of client-supplied lesson/course scope on learning
// events. The client tells us which lesson a chat happened in, but a forged or
// stale scope would poison that lesson's extraction window. We never trust it:
// a lessonId is kept ONLY when that lesson actually belongs to the given course
// AND the current owner. Anything that fails verification degrades to null
// (the event is still recorded, just without a lesson anchor) — this is
// best-effort scope, not an auth boundary (the processor already owner-filters).

export type EventScope = { courseId: string | null; lessonId: string | null };

export async function verifyEventScope(
  ownerId: string,
  courseId: string | null | undefined,
  lessonId: string | null | undefined,
): Promise<EventScope> {
  if (!lessonId || !courseId || !hasDatabaseUrl()) return { courseId: courseId ?? null, lessonId: null };
  const rows = await getDb()
    .select({ id: lessons.id })
    .from(lessons)
    .where(and(eq(lessons.id, lessonId), eq(lessons.courseId, courseId), eq(lessons.ownerId, ownerId)))
    .limit(1);
  if (rows.length === 0) return { courseId: courseId ?? null, lessonId: null };
  return { courseId, lessonId };
}
