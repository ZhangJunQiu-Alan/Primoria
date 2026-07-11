// @ts-check

import postgres from "postgres";
import { courseBlocks } from "./course-types.mjs";

const dbGlobalKey = "__primoria_agent_postgres__";
const SSL_DISABLED_VALUES = new Set(["0", "false", "disable", "disabled", "off", "none", "no"]);
const SSL_REQUIRED_VALUES = new Set(["1", "true", "enable", "enabled", "on", "yes", "require", "required"]);
const POSTGRES_JS_SSL_MODES = new Set(["allow", "prefer", "verify-full"]);

/** @returns {false | "require" | "allow" | "prefer" | "verify-full" | undefined} */
function getDatabaseSsl() {
  const configured = process.env.DATABASE_SSL?.trim().toLowerCase();
  if (!configured) return undefined;
  if (SSL_DISABLED_VALUES.has(configured)) return false;
  if (SSL_REQUIRED_VALUES.has(configured)) return "require";
  if (POSTGRES_JS_SSL_MODES.has(configured)) {
    return /** @type {"allow" | "prefer" | "verify-full"} */ (configured);
  }
  throw new Error("DATABASE_SSL must be one of: false, true, require, allow, prefer, verify-full.");
}

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const globalAny = /** @type {any} */ (globalThis);
  if (!globalAny[dbGlobalKey]) {
    const ssl = getDatabaseSsl();
    globalAny[dbGlobalKey] = postgres(url, { max: 1, prepare: false, ...(ssl !== undefined ? { ssl } : {}) });
  }
  return /** @type {postgres.Sql} */ (globalAny[dbGlobalKey]);
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
 * @param {string} id
 * @param {string} ownerId
 */
async function getCourseFromDb(id, ownerId) {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured.");
  const rows = await sql`
    select id, title, topic, summary, estimated_minutes, anchor_concept_id, graph_id, language,
           archived_at, version, created_at, updated_at
    from courses
    where id = ${id} and owner_id = ${ownerId}
    limit 1
  `;
  if (!rows[0]) return undefined;
  const lessonRows = await getLessonRowsForCourse(sql, id);
  return rowToCourse(rows[0], lessonRows);
}

/**
 * @param {postgres.Sql} sql
 * @param {string} courseId
 */
async function getLessonRowsForCourse(sql, courseId) {
  return sql`
    select id, course_id, owner_id, topic_id, title, description, role, progress, status, sort_key,
           triggered_from, blocks, estimated_minutes, version, created_at, updated_at
    from lessons
    where course_id = ${courseId}
    order by sort_key asc
  `;
}

/**
 * @param {any} row
 * @param {any[]} lessonRows
 */
function rowToCourse(row, lessonRows) {
  const course = {
    id: row.id,
    title: row.title,
    topic: row.topic,
    summary: row.summary,
    estimatedMinutes: Number(row.estimated_minutes),
    anchorConceptId: row.anchor_concept_id ?? null,
    graphId: row.graph_id ?? null,
    language: row.language ?? null,
    lessons: lessonRows.map(rowToLesson),
    archivedAt: row.archived_at ? new Date(row.archived_at).getTime() : null,
    version: row.version ?? 1,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
  return {
    ...course,
    blocks: courseBlocks(course),
  };
}

/**
 * @param {any} row
 */
function rowToLesson(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    role: row.role ?? "new",
    progress: row.progress ?? "not_started",
    status: row.status ?? (Array.isArray(row.blocks) ? "generated" : "planned"),
    sortKey: Number(row.sort_key),
    topicId: row.topic_id ?? null,
    triggeredFrom: row.triggered_from ?? null,
    blocks: Array.isArray(row.blocks) ? row.blocks : null,
    estimatedMinutes: row.estimated_minutes === null ? null : Number(row.estimated_minutes),
    version: row.version ?? 1,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}
