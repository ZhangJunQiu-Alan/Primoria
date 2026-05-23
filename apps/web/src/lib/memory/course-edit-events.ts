import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getCurrentUser } from "../auth/session";
import { getDb, hasDatabaseUrl } from "../db/client";
import { courseEditEvents } from "../db/schema";
import type { CourseBlock } from "../courses/types";

export type CourseEditEventInput = {
  ownerId?: string | null;
  courseId: string;
  blockId: string;
  instruction: string;
  beforeBlock: CourseBlock;
  afterBlock: CourseBlock;
  metadata?: unknown;
};

export type CourseEditEvent = {
  id: string;
  ownerId: string;
  courseId: string;
  blockId: string;
  instruction: string;
  beforeBlock: CourseBlock;
  afterBlock: CourseBlock;
  metadata?: unknown;
  createdAt: number;
};

export async function recordCourseEditEvent(input: CourseEditEventInput): Promise<CourseEditEvent | null> {
  const ownerId = await resolveOwnerId(input.ownerId);
  if (!ownerId || !hasDatabaseUrl()) return null;

  const id = `cee_${randomBytes(12).toString("base64url")}`;
  const createdAt = new Date();
  await getDb().insert(courseEditEvents).values({
    id,
    ownerId,
    courseId: input.courseId,
    blockId: input.blockId,
    instruction: input.instruction,
    beforeBlock: input.beforeBlock,
    afterBlock: input.afterBlock,
    metadata: input.metadata ?? null,
    createdAt,
  });

  return {
    id,
    ownerId,
    courseId: input.courseId,
    blockId: input.blockId,
    instruction: input.instruction,
    beforeBlock: input.beforeBlock,
    afterBlock: input.afterBlock,
    metadata: input.metadata,
    createdAt: createdAt.getTime(),
  };
}

export async function listCourseEditEvents(courseId: string, ownerId?: string | null): Promise<CourseEditEvent[]> {
  const resolvedOwnerId = await resolveOwnerId(ownerId);
  if (!resolvedOwnerId || !hasDatabaseUrl()) return [];
  const rows = await getDb()
    .select()
    .from(courseEditEvents)
    .where(and(eq(courseEditEvents.courseId, courseId), eq(courseEditEvents.ownerId, resolvedOwnerId)))
    .orderBy(desc(courseEditEvents.createdAt));
  return rows.map((row) => ({
      id: row.id,
      ownerId: row.ownerId,
      courseId: row.courseId,
      blockId: row.blockId,
      instruction: row.instruction,
      beforeBlock: row.beforeBlock as CourseBlock,
      afterBlock: row.afterBlock as CourseBlock,
      metadata: row.metadata ?? undefined,
      createdAt: row.createdAt.getTime(),
    }));
}

async function resolveOwnerId(ownerId?: string | null) {
  if (ownerId) return ownerId;
  if (!hasDatabaseUrl()) return null;
  const user = await getCurrentUser();
  return user?.id ?? null;
}
