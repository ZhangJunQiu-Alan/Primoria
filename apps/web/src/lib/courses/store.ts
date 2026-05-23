import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Course, CourseBlock, CourseSummary } from "./types";
import { summarizeCourse } from "./types";
import { getCurrentUser } from "../auth/session";
import { getDb, hasDatabaseUrl } from "../db/client";
import { courses as coursesTable } from "../db/schema";
import fs from "node:fs";
import path from "node:path";

type GlobalStore = {
  courses: Map<string, Course>;
  hydrated: boolean;
  fileMtimeMs: number;
};

const globalKey = "__primoria_course_store__";
const globalAny = globalThis as unknown as Record<string, GlobalStore | undefined>;
const storeFile = path.join(findWorkspaceRoot(), ".primoria-courses.json");
const LOCAL_OWNER_ID = "local";

function getStore(): GlobalStore {
  let store = globalAny[globalKey];
  if (!store) {
    store = { courses: new Map(), hydrated: false, fileMtimeMs: 0 };
    globalAny[globalKey] = store;
  }
  if (!store.hydrated) {
    hydrateStore(store);
  } else {
    refreshStoreIfChanged(store);
  }
  return store;
}

export async function saveCourse(course: Course, ownerId?: string | null): Promise<Course> {
  const resolvedOwnerId = await resolveOwnerId(ownerId);
  if (resolvedOwnerId && hasDatabaseUrl()) {
    await saveCourseToDb(course, resolvedOwnerId);
    return course;
  }
  return saveCourseLocal(course);
}

export function saveCourseLocal(course: Course): Course {
  getStore().courses.set(course.id, course);
  persistStore();
  return course;
}

export async function getCourse(id: string, ownerId?: string | null): Promise<Course | undefined> {
  const resolvedOwnerId = await resolveOwnerId(ownerId);
  if (resolvedOwnerId && hasDatabaseUrl()) {
    const course = await getCourseFromDb(id, resolvedOwnerId);
    if (course) return course;
    // CopilotKit's separate LangGraph dev process still writes generated courses
    // to the shared local JSON store. Keep a read-only fallback so freshly
    // generated cards do not 404 while we bridge agent-side DB ownership.
    return getCourseLocal(id);
  }
  return getCourseLocal(id);
}

export function getCourseLocal(id: string): Course | undefined {
  return getStore().courses.get(id);
}

export async function listCourses(ownerId?: string | null, options: { includeArchived?: boolean } = {}): Promise<CourseSummary[]> {
  const resolvedOwnerId = await resolveOwnerId(ownerId);
  if (resolvedOwnerId && hasDatabaseUrl()) {
    const dbCourses = await listCoursesFromDb(resolvedOwnerId, options);
    const merged = mergeCourseLists(dbCourses, listCoursesLocalRaw(options));
    return merged.map(summarizeCourse);
  }
  return listCoursesLocal(options);
}

export function listCoursesLocal(options: { includeArchived?: boolean } = {}): CourseSummary[] {
  return listCoursesLocalRaw(options).map(summarizeCourse);
}

function listCoursesLocalRaw(options: { includeArchived?: boolean } = {}): Course[] {
  const courses = Array.from(getStore().courses.values()).filter((course) => options.includeArchived || !course.archivedAt);
  courses.sort((a, b) => b.updatedAt - a.updatedAt);
  return courses;
}

function mergeCourseLists(primary: Course[], fallback: Course[]): Course[] {
  const byId = new Map<string, Course>();
  for (const course of [...primary, ...fallback]) {
    if (!byId.has(course.id)) byId.set(course.id, course);
  }
  return Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updateBlock(courseId: string, blockId: string, next: CourseBlock, ownerId?: string | null): Promise<Course | undefined> {
  const course = await getCourse(courseId, ownerId);
  if (!course) return undefined;
  const blocks = course.blocks.map((block) => (block.id === blockId ? next : block));
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

function hydrateStore(store: GlobalStore) {
  store.hydrated = true;
  try {
    if (!fs.existsSync(storeFile)) {
      store.fileMtimeMs = 0;
      return;
    }
    const parsed = JSON.parse(fs.readFileSync(storeFile, "utf8")) as { courses?: Course[] };
    if (!Array.isArray(parsed.courses)) return;
    store.courses = new Map(parsed.courses.map((course) => [course.id, course]));
    store.fileMtimeMs = fs.statSync(storeFile).mtimeMs;
  } catch (error) {
    console.warn("[courses/store] Failed to hydrate course store", error);
  }
}

function refreshStoreIfChanged(store: GlobalStore) {
  try {
    if (!fs.existsSync(storeFile)) {
      if (store.fileMtimeMs !== 0) {
        store.courses = new Map();
        store.fileMtimeMs = 0;
      }
      return;
    }

    const mtimeMs = fs.statSync(storeFile).mtimeMs;
    if (mtimeMs === store.fileMtimeMs) return;

    const parsed = JSON.parse(fs.readFileSync(storeFile, "utf8")) as { courses?: Course[] };
    if (!Array.isArray(parsed.courses)) return;
    store.courses = new Map(parsed.courses.map((course) => [course.id, course]));
    store.fileMtimeMs = mtimeMs;
  } catch (error) {
    console.warn("[courses/store] Failed to refresh course store", error);
  }
}

function persistStore() {
  try {
    const store = getStore();
    const courses = Array.from(store.courses.values());
    fs.writeFileSync(storeFile, JSON.stringify({ courses }, null, 2));
    store.fileMtimeMs = fs.statSync(storeFile).mtimeMs;
  } catch (error) {
    console.warn("[courses/store] Failed to persist course store", error);
  }
}

function findWorkspaceRoot() {
  let dir = process.cwd();
  while (true) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

export { LOCAL_OWNER_ID };
