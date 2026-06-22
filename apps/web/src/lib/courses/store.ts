import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { Course, CourseBlock, CourseSummary, Lesson, LessonProgress, LessonRole, LessonStatus } from "./types";
import { summarizeCourse } from "./types";
import { getCurrentUser } from "../auth/session";
import { getDb, hasDatabaseUrl } from "../db/client";
import { courses as coursesTable, lessons as lessonsTable } from "../db/schema";

export async function saveCourse(course: Course, ownerId?: string | null): Promise<Course> {
  const resolvedOwnerId = await requireOwnerId(ownerId, "save course");
  await saveCourseToDb(course, resolvedOwnerId);
  return course;
}

export async function getCourse(id: string, ownerId?: string | null): Promise<Course | undefined> {
  const resolvedOwnerId = await resolveOwnerId(ownerId);
  if (!resolvedOwnerId) return undefined;
  return getCourseFromDb(id, resolvedOwnerId);
}

/** The user's single Course instance for a subject KG, if one exists (uniqueness
 * enforced by courses_owner_graph_uidx). Used to reuse/extend an existing outline. */
export async function getCourseByGraph(ownerId: string | null | undefined, graphId: string): Promise<Course | undefined> {
  const resolvedOwnerId = await resolveOwnerId(ownerId);
  if (!resolvedOwnerId) return undefined;
  const rows = await getDb()
    .select()
    .from(coursesTable)
    .where(and(eq(coursesTable.ownerId, resolvedOwnerId), eq(coursesTable.graphId, graphId)))
    .limit(1);
  const row = rows[0];
  if (!row) return undefined;
  const lessonRows = await getDb().select().from(lessonsTable).where(eq(lessonsTable.courseId, row.id));
  return rowToCourse(row, lessonRows);
}

export async function listCourses(ownerId?: string | null, options: { includeArchived?: boolean } = {}): Promise<CourseSummary[]> {
  const resolvedOwnerId = await resolveOwnerId(ownerId);
  if (!resolvedOwnerId) return [];
  return listCourseSummariesFromDb(resolvedOwnerId, options);
}

export async function updateBlock(courseId: string, blockId: string, next: CourseBlock, ownerId?: string | null): Promise<Course | undefined> {
  return mutateBlocks(courseId, ownerId, (lesson) => {
    if (!lesson.blocks?.some((block) => block.id === blockId)) return null;
    return { ...lesson, blocks: lesson.blocks.map((block) => (block.id === blockId ? next : block)) };
  });
}

export async function insertBlock(courseId: string, block: CourseBlock, atIndex?: number, ownerId?: string | null): Promise<Course | undefined> {
  const course = await getCourse(courseId, ownerId);
  if (!course) return undefined;
  // Only materialized lessons can hold blocks.
  const generated = sortLessons(course.lessons).filter((lesson) => lesson.blocks !== null);
  if (generated.length === 0) return undefined;
  // Resolve the flattened insert position to a (lesson, localIndex) pair.
  const target = resolveInsertTarget(generated, atIndex);
  const updatedLessons = course.lessons.map((lesson) =>
    lesson.id === target.lessonId ? bumpLesson({ ...lesson, blocks: spliceBlock(lesson.blocks ?? [], block, target.localIndex) }) : lesson,
  );
  return saveCourse(bumpCourse({ ...course, lessons: updatedLessons }), ownerId);
}

export async function removeBlock(courseId: string, blockId: string, ownerId?: string | null): Promise<Course | undefined> {
  return mutateBlocks(courseId, ownerId, (lesson) => {
    if (!lesson.blocks) return null;
    const blocks = lesson.blocks.filter((block) => block.id !== blockId);
    if (blocks.length === lesson.blocks.length) return null;
    return { ...lesson, blocks };
  });
}

export async function moveBlock(courseId: string, blockId: string, toIndex: number, ownerId?: string | null): Promise<Course | undefined> {
  return mutateBlocks(courseId, ownerId, (lesson) => {
    if (!lesson.blocks) return null;
    const from = lesson.blocks.findIndex((block) => block.id === blockId);
    if (from === -1) return null;
    const blocks = [...lesson.blocks];
    const [moved] = blocks.splice(from, 1);
    const dest = Math.max(0, Math.min(blocks.length, toIndex));
    blocks.splice(dest, 0, moved);
    return { ...lesson, blocks };
  });
}

export async function archiveCourse(id: string, ownerId?: string | null): Promise<Course | undefined> {
  const course = await getCourse(id, ownerId);
  if (!course) return undefined;
  const archived: Course = { ...course, archivedAt: Date.now(), version: (course.version ?? 1) + 1, updatedAt: Date.now() };
  return saveCourse(archived, ownerId);
}

export async function unarchiveCourse(id: string, ownerId?: string | null): Promise<Course | undefined> {
  const course = await getCourse(id, ownerId);
  if (!course) return undefined;
  const unarchived: Course = { ...course, archivedAt: null, version: (course.version ?? 1) + 1, updatedAt: Date.now() };
  return saveCourse(unarchived, ownerId);
}

/** Apply a transform to the lesson owning a block; returns the saved course or undefined if no lesson matched. */
async function mutateBlocks(
  courseId: string,
  ownerId: string | null | undefined,
  transform: (lesson: Lesson) => Lesson | null,
): Promise<Course | undefined> {
  const course = await getCourse(courseId, ownerId);
  if (!course) return undefined;
  let changed = false;
  const lessons = course.lessons.map((lesson) => {
    const next = transform(lesson);
    if (!next) return lesson;
    changed = true;
    return bumpLesson(next);
  });
  if (!changed) return undefined;
  return saveCourse(bumpCourse({ ...course, lessons }), ownerId);
}

function sortLessons(lessons: Lesson[]): Lesson[] {
  return [...lessons].sort((a, b) => a.sortKey - b.sortKey);
}

function spliceBlock(blocks: CourseBlock[], block: CourseBlock, localIndex: number): CourseBlock[] {
  const next = [...blocks];
  const idx = localIndex < 0 || localIndex > next.length ? next.length : localIndex;
  next.splice(idx, 0, block);
  return next;
}

// `sortedLessons` must already be filtered to materialized lessons (blocks set).
function resolveInsertTarget(sortedLessons: Lesson[], atIndex?: number): { lessonId: string; localIndex: number } {
  const last = sortedLessons[sortedLessons.length - 1];
  const len = (lesson: Lesson) => lesson.blocks?.length ?? 0;
  if (atIndex === undefined || atIndex < 0) {
    return { lessonId: last.id, localIndex: len(last) };
  }
  let remaining = atIndex;
  for (const lesson of sortedLessons) {
    if (remaining <= len(lesson)) {
      return { lessonId: lesson.id, localIndex: remaining };
    }
    remaining -= len(lesson);
  }
  return { lessonId: last.id, localIndex: len(last) };
}

function bumpLesson(lesson: Lesson): Lesson {
  return { ...lesson, version: (lesson.version ?? 1) + 1, updatedAt: Date.now() };
}

function bumpCourse(course: Course): Course {
  return { ...course, version: (course.version ?? 1) + 1, updatedAt: Date.now() };
}

async function resolveOwnerId(ownerId?: string | null) {
  if (ownerId) return ownerId;
  if (!hasDatabaseUrl()) return null;
  const user = await getCurrentUser();
  return user?.id ?? null;
}

async function requireOwnerId(ownerId: string | null | undefined, action: string) {
  if (!hasDatabaseUrl()) throw new Error("DATABASE_URL is not configured. Primoria persistence requires Postgres.");
  const resolvedOwnerId = await resolveOwnerId(ownerId);
  if (!resolvedOwnerId) throw new Error(`You must sign in to ${action}.`);
  return resolvedOwnerId;
}

async function saveCourseToDb(course: Course, ownerId: string) {
  const courseRow = courseToRow(course, ownerId);
  const lessonRows = course.lessons.map((lesson) => lessonToRow(lesson, course.id, ownerId));
  await getDb().transaction(async (tx) => {
    await tx
      .insert(coursesTable)
      .values(courseRow)
      .onConflictDoUpdate({
        target: coursesTable.id,
        set: {
          ownerId: courseRow.ownerId,
          title: courseRow.title,
          topic: courseRow.topic,
          summary: courseRow.summary,
          estimatedMinutes: courseRow.estimatedMinutes,
          anchorConceptId: courseRow.anchorConceptId,
          graphId: courseRow.graphId,
          archivedAt: courseRow.archivedAt,
          version: courseRow.version,
          updatedAt: courseRow.updatedAt,
        },
      });
    // Lessons are fully owned by the course; replace the set wholesale.
    await tx.delete(lessonsTable).where(eq(lessonsTable.courseId, course.id));
    if (lessonRows.length > 0) {
      await tx.insert(lessonsTable).values(lessonRows);
    }
  });
}

async function getCourseFromDb(id: string, ownerId: string): Promise<Course | undefined> {
  const rows = await getDb().select().from(coursesTable).where(eq(coursesTable.id, id)).limit(1);
  const row = rows[0];
  if (!row || row.ownerId !== ownerId) return undefined;
  const lessonRows = await getDb().select().from(lessonsTable).where(eq(lessonsTable.courseId, id));
  return rowToCourse(row, lessonRows);
}

async function listCourseSummariesFromDb(ownerId: string, options: { includeArchived?: boolean } = {}): Promise<CourseSummary[]> {
  const whereClause = options.includeArchived
    ? eq(coursesTable.ownerId, ownerId)
    : and(eq(coursesTable.ownerId, ownerId), isNull(coursesTable.archivedAt));
  const rows = await getDb().select().from(coursesTable).where(whereClause).orderBy(desc(coursesTable.updatedAt));
  if (rows.length === 0) return [];
  const lessonRows = await getDb()
    .select()
    .from(lessonsTable)
    .where(inArray(lessonsTable.courseId, rows.map((row) => row.id)));
  const lessonsByCourse = new Map<string, (typeof lessonsTable.$inferSelect)[]>();
  for (const lesson of lessonRows) {
    const list = lessonsByCourse.get(lesson.courseId) ?? [];
    list.push(lesson);
    lessonsByCourse.set(lesson.courseId, list);
  }
  return rows.map((row) => summarizeCourse(rowToCourse(row, lessonsByCourse.get(row.id) ?? [])));
}

function courseToRow(course: Course, ownerId: string) {
  return {
    id: course.id,
    ownerId,
    title: course.title,
    topic: course.topic,
    summary: course.summary,
    estimatedMinutes: course.estimatedMinutes,
    anchorConceptId: course.anchorConceptId ?? null,
    graphId: course.graphId ?? null,
    archivedAt: course.archivedAt ? new Date(course.archivedAt) : null,
    version: course.version ?? 1,
    createdAt: new Date(course.createdAt),
    updatedAt: new Date(course.updatedAt),
  };
}

function lessonToRow(lesson: Lesson, courseId: string, ownerId: string) {
  return {
    id: lesson.id,
    courseId,
    ownerId,
    topicId: lesson.topicId ?? null,
    title: lesson.title,
    role: lesson.role,
    progress: lesson.progress,
    status: lesson.status,
    sortKey: lesson.sortKey,
    triggeredFrom: lesson.triggeredFrom ?? null,
    blocks: lesson.blocks ?? null,
    estimatedMinutes: lesson.estimatedMinutes ?? null,
    version: lesson.version ?? 1,
    createdAt: new Date(lesson.createdAt),
    updatedAt: new Date(lesson.updatedAt),
  };
}

function rowToCourse(row: typeof coursesTable.$inferSelect, lessonRows: (typeof lessonsTable.$inferSelect)[]): Course {
  return {
    id: row.id,
    title: row.title,
    topic: row.topic,
    summary: row.summary,
    estimatedMinutes: Number(row.estimatedMinutes),
    anchorConceptId: row.anchorConceptId ?? null,
    graphId: row.graphId ?? null,
    lessons: sortLessons(lessonRows.map(rowToLesson)),
    archivedAt: row.archivedAt?.getTime() ?? null,
    version: row.version ?? 1,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

function rowToLesson(row: typeof lessonsTable.$inferSelect): Lesson {
  return {
    id: row.id,
    title: row.title,
    role: row.role as LessonRole,
    progress: row.progress as LessonProgress,
    status: row.status as LessonStatus,
    sortKey: Number(row.sortKey),
    topicId: row.topicId ?? null,
    triggeredFrom: row.triggeredFrom ?? null,
    blocks: (row.blocks as CourseBlock[] | null) ?? null,
    estimatedMinutes: row.estimatedMinutes === null ? null : Number(row.estimatedMinutes),
    version: row.version ?? 1,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}
