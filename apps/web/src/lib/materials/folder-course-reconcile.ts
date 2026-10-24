import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import type { DbOrTx } from "../db/client";
import { courses, lessons } from "../db/schema";
import type { TopicGraph } from "../knowledge-graph/topic-graph";

// Keeps courses built on a subject-folder graph consistent with it after every
// re-assembly (docs/product/subject-folders.md §4.3). Folder topic ids are
// per lecture, so a concept's topic changes when the first lecture teaching
// it changes (reorder, delete, role change): each lesson's topic anchor
// follows its first concept. Planned, never-generated lessons whose concepts
// all left the graph are removed; generated lessons always stay.

export type LessonAnchor = { id: string; topicId: string | null; conceptIds: string[]; status: string; hasBlocks: boolean };

export function reconcileFolderLessons(
  lessonAnchors: LessonAnchor[],
  graph: TopicGraph,
): { reanchor: { id: string; topicId: string }[]; remove: string[] } {
  const topicOf = new Map<string, string>();
  for (const topic of graph.topics) for (const concept of topic.conceptIds) topicOf.set(concept.conceptId, topic.topicId);
  const reanchor: { id: string; topicId: string }[] = [];
  const remove: string[] = [];
  for (const lesson of lessonAnchors) {
    const present = lesson.conceptIds.filter((id) => topicOf.has(id));
    if (present.length === 0) {
      if (lesson.conceptIds.length > 0 && lesson.status === "planned" && !lesson.hasBlocks) remove.push(lesson.id);
      continue;
    }
    const topicId = topicOf.get(present[0])!;
    if (topicId !== lesson.topicId) reanchor.push({ id: lesson.id, topicId });
  }
  return { reanchor, remove };
}

export async function reconcileFolderCourses(db: DbOrTx, ownerId: string, graph: TopicGraph): Promise<{ reanchored: number; removed: number }> {
  const courseRows = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.ownerId, ownerId), eq(courses.graphId, graph.graphId)));
  if (courseRows.length === 0) return { reanchored: 0, removed: 0 };
  const rows = await db
    .select({
      id: lessons.id,
      topicId: lessons.topicId,
      conceptIds: lessons.conceptIds,
      status: lessons.status,
      hasBlocks: sql<boolean>`${lessons.blocks} is not null`,
    })
    .from(lessons)
    .where(and(eq(lessons.ownerId, ownerId), inArray(lessons.courseId, courseRows.map((row) => row.id))));
  const plan = reconcileFolderLessons(rows.map((row) => ({ ...row, conceptIds: row.conceptIds ?? [] })), graph);
  const now = new Date();
  for (const { id, topicId } of plan.reanchor) {
    await db.update(lessons).set({ topicId, updatedAt: now }).where(and(eq(lessons.ownerId, ownerId), eq(lessons.id, id)));
  }
  if (plan.remove.length > 0) {
    await db
      .delete(lessons)
      .where(and(eq(lessons.ownerId, ownerId), inArray(lessons.id, plan.remove), eq(lessons.status, "planned"), isNull(lessons.blocks)));
  }
  return { reanchored: plan.reanchor.length, removed: plan.remove.length };
}
