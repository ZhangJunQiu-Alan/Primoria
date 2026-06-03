import { and, desc, eq, isNull } from "drizzle-orm";
import type { Course, CourseBlock, CourseSummary } from "./types";
import { summarizeCourse } from "./types";
import { getCurrentUser } from "../auth/session";
import { getDb, hasDatabaseUrl } from "../db/client";
import { courses as coursesTable } from "../db/schema";

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

export async function listCourses(ownerId?: string | null, options: { includeArchived?: boolean } = {}): Promise<CourseSummary[]> {
  const resolvedOwnerId = await resolveOwnerId(ownerId);
  if (!resolvedOwnerId) return [];
  return listCourseSummariesFromDb(resolvedOwnerId, options);
}

export async function updateBlock(courseId: string, blockId: string, next: CourseBlock, ownerId?: string | null): Promise<Course | undefined> {
  const course = await getCourse(courseId, ownerId);
  if (!course) return undefined;
  const blocks = course.blocks.map((block) => (block.id === blockId ? next : block));
  const updated: Course = { ...course, blocks, version: (course.version ?? 1) + 1, updatedAt: Date.now() };
  return saveCourse(updated, ownerId);
}

export async function insertBlock(courseId: string, block: CourseBlock, atIndex?: number, ownerId?: string | null): Promise<Course | undefined> {
  const course = await getCourse(courseId, ownerId);
  if (!course) return undefined;
  const blocks = [...course.blocks];
  const idx = atIndex === undefined || atIndex < 0 || atIndex > blocks.length ? blocks.length : atIndex;
  blocks.splice(idx, 0, block);
  const updated: Course = { ...course, blocks, version: (course.version ?? 1) + 1, updatedAt: Date.now() };
  return saveCourse(updated, ownerId);
}

export async function removeBlock(courseId: string, blockId: string, ownerId?: string | null): Promise<Course | undefined> {
  const course = await getCourse(courseId, ownerId);
  if (!course) return undefined;
  const blocks = course.blocks.filter((block) => block.id !== blockId);
  if (blocks.length === course.blocks.length) return undefined;
  const updated: Course = { ...course, blocks, version: (course.version ?? 1) + 1, updatedAt: Date.now() };
  return saveCourse(updated, ownerId);
}

export async function moveBlock(courseId: string, blockId: string, toIndex: number, ownerId?: string | null): Promise<Course | undefined> {
  const course = await getCourse(courseId, ownerId);
  if (!course) return undefined;
  const from = course.blocks.findIndex((block) => block.id === blockId);
  if (from === -1) return undefined;
  const blocks = [...course.blocks];
  const [moved] = blocks.splice(from, 1);
  const dest = Math.max(0, Math.min(blocks.length, toIndex));
  blocks.splice(dest, 0, moved);
  const updated: Course = { ...course, blocks, version: (course.version ?? 1) + 1, updatedAt: Date.now() };
  return saveCourse(updated, ownerId);
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
  const row = courseToRow(course, ownerId);
  await getDb()
    .insert(coursesTable)
    .values(row)
    .onConflictDoUpdate({
      target: coursesTable.id,
      set: {
        ownerId: row.ownerId,
        title: row.title,
        topic: row.topic,
        summary: row.summary,
        estimatedMinutes: row.estimatedMinutes,
        blocks: row.blocks,
        archivedAt: row.archivedAt,
        version: row.version,
        updatedAt: row.updatedAt,
      },
    });
}

async function getCourseFromDb(id: string, ownerId: string): Promise<Course | undefined> {
  const rows = await getDb().select().from(coursesTable).where(eq(coursesTable.id, id)).limit(1);
  const row = rows[0];
  if (!row || row.ownerId !== ownerId) return undefined;
  return rowToCourse(row);
}

async function listCoursesFromDb(ownerId: string, options: { includeArchived?: boolean } = {}): Promise<Course[]> {
  const whereClause = options.includeArchived
    ? eq(coursesTable.ownerId, ownerId)
    : and(eq(coursesTable.ownerId, ownerId), isNull(coursesTable.archivedAt));
  const rows = await getDb().select().from(coursesTable).where(whereClause).orderBy(desc(coursesTable.updatedAt));
  return rows.map(rowToCourse);
}

async function listCourseSummariesFromDb(ownerId: string, options: { includeArchived?: boolean } = {}): Promise<CourseSummary[]> {
  const whereClause = options.includeArchived
    ? eq(coursesTable.ownerId, ownerId)
    : and(eq(coursesTable.ownerId, ownerId), isNull(coursesTable.archivedAt));
  const rows = await getDb()
    .select({
      id: coursesTable.id,
      title: coursesTable.title,
      topic: coursesTable.topic,
      summary: coursesTable.summary,
      estimatedMinutes: coursesTable.estimatedMinutes,
      blocks: coursesTable.blocks,
      archivedAt: coursesTable.archivedAt,
      version: coursesTable.version,
      createdAt: coursesTable.createdAt,
      updatedAt: coursesTable.updatedAt,
    })
    .from(coursesTable)
    .where(whereClause)
    .orderBy(desc(coursesTable.updatedAt));
  return rows.map((row) =>
    summarizeCourse({
      id: row.id,
      title: row.title,
      topic: row.topic,
      summary: row.summary,
      estimatedMinutes: Number(row.estimatedMinutes),
      blocks: row.blocks as CourseBlock[],
      archivedAt: row.archivedAt?.getTime() ?? null,
      version: row.version ?? 1,
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
    }),
  );
}

function courseToRow(course: Course, ownerId: string) {
  return {
    id: course.id,
    ownerId,
    title: course.title,
    topic: course.topic,
    summary: course.summary,
    estimatedMinutes: course.estimatedMinutes,
    blocks: course.blocks,
    archivedAt: course.archivedAt ? new Date(course.archivedAt) : null,
    version: course.version ?? 1,
    createdAt: new Date(course.createdAt),
    updatedAt: new Date(course.updatedAt),
  };
}

function rowToCourse(row: typeof coursesTable.$inferSelect): Course {
  return {
    id: row.id,
    title: row.title,
    topic: row.topic,
    summary: row.summary,
    estimatedMinutes: Number(row.estimatedMinutes),
    blocks: row.blocks as CourseBlock[],
    archivedAt: row.archivedAt?.getTime() ?? null,
    version: row.version ?? 1,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}
