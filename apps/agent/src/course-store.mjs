// @ts-check

import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { summarizeCourse } from "./course-types.mjs";

const globalKey = "__primoria_course_store__";
const dbGlobalKey = "__primoria_agent_postgres__";
const storeFile = path.join(findWorkspaceRoot(), ".primoria-courses.json");

function getStore() {
  const globalAny = /** @type {any} */ (globalThis);
  let store = globalAny[globalKey];
  if (!store) {
    store = { courses: new Map(), hydrated: false, fileMtimeMs: 0 };
    globalAny[globalKey] = store;
  }
  if (!store.hydrated) hydrateStore(store);
  else refreshStoreIfChanged(store);
  return store;
}

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const globalAny = /** @type {any} */ (globalThis);
  if (!globalAny[dbGlobalKey]) {
    globalAny[dbGlobalKey] = postgres(url, { max: 1, prepare: false });
  }
  return /** @type {postgres.Sql} */ (globalAny[dbGlobalKey]);
}

/**
 * @param {any} course
 * @param {string | null | undefined} ownerId
 */
export async function saveCourse(course, ownerId) {
  if (ownerId && process.env.DATABASE_URL) {
    try {
      await saveCourseToDb(course, ownerId);
      return course;
    } catch (error) {
      console.warn("[agent/course-store] Postgres save failed, falling back to local JSON", error);
    }
  }
  return saveCourseLocal(course);
}

/**
 * @param {any} course
 */
export function saveCourseLocal(course) {
  getStore().courses.set(course.id, course);
  persistStore();
  return course;
}

/**
 * @param {string} id
 */
export function getCourse(id) {
  return getStore().courses.get(id);
}

export function listCourses() {
  const courses = Array.from(getStore().courses.values());
  courses.sort((a, b) => b.createdAt - a.createdAt);
  return courses.map(summarizeCourse);
}

/**
 * @param {string} courseId
 * @param {string} blockId
 * @param {any} next
 */
export function updateBlock(courseId, blockId, next) {
  const course = getCourse(courseId);
  if (!course) return undefined;
  const blocks = course.blocks.map((/** @type {any} */ block) => (block.id === blockId ? next : block));
  const updated = { ...course, blocks, version: (course.version ?? 1) + 1, updatedAt: Date.now() };
  return saveCourseLocal(updated);
}

/**
 * @param {any} course
 * @param {string} ownerId
 */
async function saveCourseToDb(course, ownerId) {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured.");
  const createdAt = new Date(course.createdAt);
  const updatedAt = new Date(course.updatedAt);
  await sql`
    insert into courses (
      id, owner_id, title, topic, summary, estimated_minutes, blocks,
      archived_at, version, created_at, updated_at
    ) values (
      ${course.id}, ${ownerId}, ${course.title}, ${course.topic}, ${course.summary},
      ${course.estimatedMinutes}, ${sql.json(course.blocks)},
      ${course.archivedAt ? new Date(course.archivedAt) : null}, ${course.version ?? 1}, ${createdAt}, ${updatedAt}
    )
    on conflict (id) do update set
      owner_id = excluded.owner_id,
      title = excluded.title,
      topic = excluded.topic,
      summary = excluded.summary,
      estimated_minutes = excluded.estimated_minutes,
      blocks = excluded.blocks,
      archived_at = excluded.archived_at,
      version = excluded.version,
      updated_at = excluded.updated_at
  `;
}

/**
 * @param {{ hydrated: boolean; courses: Map<string, any>; fileMtimeMs: number }} store
 */
function hydrateStore(store) {
  store.hydrated = true;
  try {
    if (!fs.existsSync(storeFile)) {
      store.fileMtimeMs = 0;
      return;
    }
    const parsed = JSON.parse(fs.readFileSync(storeFile, "utf8"));
    if (!Array.isArray(parsed.courses)) return;
    store.courses = new Map(parsed.courses.map((/** @type {any} */ course) => [course.id, course]));
    store.fileMtimeMs = fs.statSync(storeFile).mtimeMs;
  } catch (error) {
    console.warn("[courses/store] Failed to hydrate course store", error);
  }
}

/**
 * @param {{ hydrated: boolean; courses: Map<string, any>; fileMtimeMs?: number }} store
 */
function refreshStoreIfChanged(store) {
  try {
    if (!fs.existsSync(storeFile)) {
      if ((store.fileMtimeMs ?? 0) !== 0) {
        store.courses = new Map();
        store.fileMtimeMs = 0;
      }
      return;
    }

    const mtimeMs = fs.statSync(storeFile).mtimeMs;
    if (mtimeMs === (store.fileMtimeMs ?? 0)) return;

    const parsed = JSON.parse(fs.readFileSync(storeFile, "utf8"));
    if (!Array.isArray(parsed.courses)) return;
    store.courses = new Map(parsed.courses.map((/** @type {any} */ course) => [course.id, course]));
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
