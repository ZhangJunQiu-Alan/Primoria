// @ts-check

import postgres from "postgres";
import { summarizeCourse } from "./course-types.mjs";

const dbGlobalKey = "__primoria_agent_postgres__";
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
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured. Primoria persistence requires Postgres.");
  }
  if (!ownerId) {
    throw new Error("Missing primoria_owner_id. Sign in before generating courses.");
  }
  await saveCourseToDb(course, ownerId);
  return course;
}

/**
 * @param {string} id
 * @param {string | null | undefined} ownerId
 */
export async function getCourse(id, ownerId) {
  if (!process.env.DATABASE_URL || !ownerId) return undefined;
  return getCourseFromDb(id, ownerId);
}

/**
 * @param {string | null | undefined} ownerId
 */
export async function listCourses(ownerId) {
  if (!process.env.DATABASE_URL || !ownerId) return [];
  const courses = await listCoursesFromDb(ownerId);
  return courses.map(summarizeCourse);
}

/**
 * @param {string} courseId
 * @param {string} blockId
 * @param {any} next
 * @param {string | null | undefined} ownerId
 */
export async function updateBlock(courseId, blockId, next, ownerId) {
  const course = await getCourse(courseId, ownerId);
  if (!course) return undefined;
  const blocks = course.blocks.map((/** @type {any} */ block) => (block.id === blockId ? next : block));
  const updated = { ...course, blocks, version: (course.version ?? 1) + 1, updatedAt: Date.now() };
  return saveCourse(updated, ownerId);
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
 * @param {string} id
 * @param {string} ownerId
 */
async function getCourseFromDb(id, ownerId) {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured.");
  const rows = await sql`
    select id, title, topic, summary, estimated_minutes, blocks, archived_at, version, created_at, updated_at
    from courses
    where id = ${id} and owner_id = ${ownerId}
    limit 1
  `;
  return rows[0] ? rowToCourse(rows[0]) : undefined;
}

/**
 * @param {string} ownerId
 */
async function listCoursesFromDb(ownerId) {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured.");
  const rows = await sql`
    select id, title, topic, summary, estimated_minutes, blocks, archived_at, version, created_at, updated_at
    from courses
    where owner_id = ${ownerId} and archived_at is null
    order by updated_at desc
  `;
  return rows.map(rowToCourse);
}

/**
 * @param {any} row
 */
function rowToCourse(row) {
  return {
    id: row.id,
    title: row.title,
    topic: row.topic,
    summary: row.summary,
    estimatedMinutes: Number(row.estimated_minutes),
    blocks: row.blocks,
    archivedAt: row.archived_at ? new Date(row.archived_at).getTime() : null,
    version: row.version ?? 1,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

