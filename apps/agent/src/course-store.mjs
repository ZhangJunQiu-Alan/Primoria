// @ts-check

import postgres from "postgres";
import { courseBlocks, courseLessons, summarizeCourse } from "./course-types.mjs";

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
  let changed = false;
  const updatedLessons = courseLessons(course).map((/** @type {any} */ lesson) => {
    if (!Array.isArray(lesson.blocks) || !lesson.blocks.some((/** @type {any} */ block) => block.id === blockId)) {
      return lesson;
    }
    changed = true;
    return {
      ...lesson,
      blocks: lesson.blocks.map((/** @type {any} */ block) => (block.id === blockId ? next : block)),
      version: (lesson.version ?? 1) + 1,
      updatedAt: Date.now(),
    };
  });
  if (!changed) return undefined;
  const updated = { ...course, lessons: updatedLessons, version: (course.version ?? 1) + 1, updatedAt: Date.now() };
  return saveCourse(updated, ownerId);
}

/**
 * @param {any} course
 * @param {string} ownerId
 */
async function saveCourseToDb(course, ownerId) {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured.");
  const courseRow = courseToRow(course, ownerId);
  const lessonRows = lessonsToRows(course, ownerId);
  await sql.begin(async (tx) => {
    await tx`
      insert into courses (
        id, owner_id, title, topic, summary, estimated_minutes,
        anchor_concept_id, graph_id, language,
        archived_at, version, created_at, updated_at
      ) values (
        ${courseRow.id}, ${courseRow.ownerId}, ${courseRow.title}, ${courseRow.topic}, ${courseRow.summary},
        ${courseRow.estimatedMinutes}, ${courseRow.anchorConceptId}, ${courseRow.graphId}, ${courseRow.language},
        ${courseRow.archivedAt}, ${courseRow.version}, ${courseRow.createdAt}, ${courseRow.updatedAt}
      )
      on conflict (id) do update set
        owner_id = excluded.owner_id,
        title = excluded.title,
        topic = excluded.topic,
        summary = excluded.summary,
        estimated_minutes = excluded.estimated_minutes,
        anchor_concept_id = excluded.anchor_concept_id,
        graph_id = excluded.graph_id,
        language = excluded.language,
        archived_at = excluded.archived_at,
        version = excluded.version,
        updated_at = excluded.updated_at
    `;

    for (const lesson of lessonRows) {
      await tx`
        insert into lessons (
          id, course_id, owner_id, topic_id, title, role, progress, status, sort_key,
          triggered_from, blocks, estimated_minutes, version, created_at, updated_at
        ) values (
          ${lesson.id}, ${lesson.courseId}, ${lesson.ownerId}, ${lesson.topicId}, ${lesson.title},
          ${lesson.role}, ${lesson.progress}, ${lesson.status}, ${lesson.sortKey},
          ${lesson.triggeredFrom}, ${lesson.blocks === null ? null : tx.json(lesson.blocks)},
          ${lesson.estimatedMinutes}, ${lesson.version}, ${lesson.createdAt}, ${lesson.updatedAt}
        )
        on conflict (id) do update set
          course_id = excluded.course_id,
          owner_id = excluded.owner_id,
          topic_id = excluded.topic_id,
          title = excluded.title,
          role = excluded.role,
          progress = excluded.progress,
          status = excluded.status,
          sort_key = excluded.sort_key,
          triggered_from = excluded.triggered_from,
          blocks = excluded.blocks,
          estimated_minutes = excluded.estimated_minutes,
          version = excluded.version,
          updated_at = excluded.updated_at
      `;
    }

    const keepIds = lessonRows.map((lesson) => lesson.id);
    if (keepIds.length > 0) {
      await tx`
        delete from lessons
        where course_id = ${course.id} and id not in ${tx(keepIds)}
      `;
    } else {
      await tx`
        delete from lessons
        where course_id = ${course.id}
      `;
    }
  });
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
  const lessonRows = await listLessonRowsForCourses(sql, [id]);
  return rowToCourse(rows[0], lessonRows);
}

/**
 * @param {string} ownerId
 */
async function listCoursesFromDb(ownerId) {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured.");
  const rows = await sql`
    select id, title, topic, summary, estimated_minutes, anchor_concept_id, graph_id, language,
           archived_at, version, created_at, updated_at
    from courses
    where owner_id = ${ownerId} and archived_at is null
    order by updated_at desc
  `;
  if (!rows.length) return [];
  const lessonRows = await listLessonRowsForCourses(sql, rows.map((/** @type {any} */ row) => row.id));
  const lessonsByCourse = new Map();
  for (const lesson of lessonRows) {
    const list = lessonsByCourse.get(lesson.course_id) ?? [];
    list.push(lesson);
    lessonsByCourse.set(lesson.course_id, list);
  }
  return rows.map((/** @type {any} */ row) => rowToCourse(row, lessonsByCourse.get(row.id) ?? []));
}

/**
 * @param {postgres.Sql} sql
 * @param {string[]} courseIds
 */
async function listLessonRowsForCourses(sql, courseIds) {
  if (!courseIds.length) return [];
  return sql`
    select id, course_id, owner_id, topic_id, title, role, progress, status, sort_key,
           triggered_from, blocks, estimated_minutes, version, created_at, updated_at
    from lessons
    where course_id in ${sql(courseIds)}
    order by course_id, sort_key asc
  `;
}

/**
 * @param {any} course
 * @param {string} ownerId
 */
function courseToRow(course, ownerId) {
  return {
    id: course.id,
    ownerId,
    title: course.title,
    topic: course.topic,
    summary: course.summary,
    estimatedMinutes: Number(course.estimatedMinutes ?? estimateMinutes(course)),
    anchorConceptId: course.anchorConceptId ?? null,
    graphId: course.graphId ?? null,
    language: course.language ?? null,
    archivedAt: course.archivedAt ? safeDate(course.archivedAt) : null,
    version: course.version ?? 1,
    createdAt: safeDate(course.createdAt),
    updatedAt: safeDate(course.updatedAt),
  };
}

/**
 * @param {any} course
 * @param {string} ownerId
 */
function lessonsToRows(course, ownerId) {
  const lessons = normalizeLessons(course);
  return lessons.map((/** @type {any} */ lesson) => ({
    id: lesson.id,
    courseId: course.id,
    ownerId,
    topicId: lesson.topicId ?? null,
    title: lesson.title ?? course.title,
    role: lesson.role ?? "new",
    progress: lesson.progress ?? "not_started",
    status: lesson.status ?? (Array.isArray(lesson.blocks) ? "generated" : "planned"),
    sortKey: Number(lesson.sortKey ?? 1),
    triggeredFrom: lesson.triggeredFrom ?? null,
    blocks: Array.isArray(lesson.blocks) ? lesson.blocks : null,
    estimatedMinutes: lesson.estimatedMinutes === undefined ? null : lesson.estimatedMinutes,
    version: lesson.version ?? 1,
    createdAt: safeDate(lesson.createdAt ?? course.createdAt),
    updatedAt: safeDate(lesson.updatedAt ?? course.updatedAt),
  }));
}

/**
 * @param {any} course
 */
function normalizeLessons(course) {
  const lessons = courseLessons(course);
  if (lessons.length) return lessons;
  return [{
    id: `${course.id}:lesson:1`,
    title: course.title,
    role: "new",
    progress: "not_started",
    status: "planned",
    sortKey: 1,
    topicId: null,
    triggeredFrom: null,
    blocks: null,
    estimatedMinutes: null,
    version: course.version ?? 1,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  }];
}

/**
 * @param {any} course
 */
function estimateMinutes(course) {
  const lessonMinutes = courseLessons(course).reduce(
    (total, lesson) => total + Number(lesson.estimatedMinutes ?? 0),
    0,
  );
  return lessonMinutes || Math.max(1, courseBlocks(course).length * 4);
}

/**
 * @param {unknown} value
 */
function safeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const date = typeof value === "number" ? new Date(value) : new Date(String(value ?? Date.now()));
  return Number.isNaN(date.getTime()) ? new Date() : date;
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
