import { createHash } from "node:crypto";

import { buildCourseScopeKey, initializeCourseOutline, plannedBundleLessons } from "../ai/deepagent/course-generator";
import { enqueueLessonGenerationJob } from "../courses/lesson-generation-jobs";
import { getCourseByScopeKey, insertPlannedLesson } from "../courses/store";
import type { Lesson } from "../courses/types";
import { getDb } from "../db/client";
import { buildConceptFrontierOutline } from "../knowledge-graph/concept-frontier";
import type { TopicGraph } from "../knowledge-graph/topic-graph";
import { listConceptMasteryByOwner } from "../mastery/owner-store";
import { getUserPreferences } from "../settings/user-settings";
import { folderGraphId } from "./folder-graph";
import { getFolder } from "./folders";
import { getMaterialGraph } from "./material-graph-store";
import { scheduleMaterialIndexing } from "./semantic-index";

// Course from a subject folder's KG (docs/product/subject-folders.md §4.4):
// the normal concept-frontier outline (2–3 unmastered concepts per lesson, in
// graph order) under scope `graph:<folder graph>:full`, so one folder has one
// course. The outline is a snapshot; "sync" inserts lessons for concepts that
// later lectures added, each placed before the first lesson that teaches a
// later concept.

export type FolderCourseErrorCode = "folder_not_found" | "no_graph" | "no_course";

export class FolderCourseError extends Error {
  constructor(readonly code: FolderCourseErrorCode, message: string) {
    super(message);
    this.name = "FolderCourseError";
  }
}

export type FolderCourseState = { courseId: string; title: string; lessonCount: number; newConceptCount: number };

export function folderCourseScopeKey(folderId: string): string {
  return buildCourseScopeKey({ graphId: folderGraphId(folderId) })!;
}

const syncLessonId = (courseId: string, conceptIds: string[]) =>
  `lsn_${createHash("sha256").update(`${courseId}:${conceptIds.join(",")}`).digest("hex").slice(0, 20)}`;

/** Pure: planned lessons for graph concepts no lesson covers (mastered ones
 * skipped). New concepts are split by the gap they belong to — before the
 * first existing lesson that teaches a later concept, or at the end — and
 * each gap is grouped into lessons of 2–3 by the normal concept frontier, so
 * one new lesson never mixes concepts from two places in the course. Ids are
 * deterministic per course and concept set, so a repeated sync inserts
 * nothing twice. */
export function planFolderCourseAdditions(input: {
  courseId: string;
  lessons: Pick<Lesson, "sortKey" | "conceptIds">[];
  graph: TopicGraph;
  mastered: ReadonlySet<string>;
  language: string | null;
  now: number;
}): Lesson[] {
  const order = new Map<string, number>();
  for (const topic of input.graph.topics) for (const concept of topic.conceptIds) order.set(concept.conceptId, order.size);
  const covered = input.lessons.flatMap((lesson) => lesson.conceptIds ?? []);
  const frontier = (skip: Iterable<string>) =>
    buildConceptFrontierOutline({ graph: input.graph, startTopicId: null, targetConceptId: null, masteredConceptIds: new Set(skip) });
  const remaining = frontier([...input.mastered, ...covered]).flatMap((bundle) => bundle.conceptIds);
  if (remaining.length === 0) return [];

  const firstIndex = (conceptIds: string[] | undefined) =>
    Math.min(...(conceptIds ?? []).map((id) => order.get(id) ?? Number.POSITIVE_INFINITY));
  const existing = [...input.lessons].sort((a, b) => a.sortKey - b.sortKey);
  const gaps = new Map<number, string[]>();
  for (const conceptId of remaining) {
    const index = order.get(conceptId)!;
    // Lessons whose concepts all left the graph are not anchors.
    const next = existing.findIndex((entry) => {
      const entryIndex = firstIndex(entry.conceptIds);
      return Number.isFinite(entryIndex) && entryIndex > index;
    });
    gaps.set(next, [...(gaps.get(next) ?? []), conceptId]);
  }

  const out: Lesson[] = [];
  for (const [next, conceptIds] of gaps) {
    const inGap = new Set(conceptIds);
    const group = plannedBundleLessons(frontier([...order.keys()].filter((id) => !inGap.has(id))), input.language, input.now);
    group.forEach((lesson, i) => {
      let sortKey: number;
      if (next === -1) {
        sortKey = (existing[existing.length - 1]?.sortKey ?? 0) + i + 1;
      } else {
        const hi = existing[next].sortKey;
        const lo = next > 0 ? existing[next - 1].sortKey : hi - 1;
        sortKey = lo + ((hi - lo) * (i + 1)) / (group.length + 1);
      }
      out.push({ ...lesson, id: syncLessonId(input.courseId, lesson.conceptIds ?? []), sortKey });
    });
  }
  return out.sort((a, b) => a.sortKey - b.sortKey);
}

async function folderGraph(ownerId: string, folderId: string) {
  const folder = await getFolder(ownerId, folderId);
  if (!folder || folder.kind !== "subject") throw new FolderCourseError("folder_not_found", "Folder not found.");
  const record = await getMaterialGraph(folderGraphId(folderId), ownerId);
  return { folder, record };
}

async function masteredConcepts(ownerId: string, graphId: string): Promise<Set<string>> {
  const rows = await listConceptMasteryByOwner(ownerId, graphId).catch(() => []);
  return new Set(rows.filter((row) => row.status === "mastered").map((row) => row.conceptId));
}

export async function loadFolderCourseState(ownerId: string, folderId: string): Promise<FolderCourseState | null> {
  const course = await getCourseByScopeKey(ownerId, folderCourseScopeKey(folderId));
  if (!course) return null;
  const record = await getMaterialGraph(folderGraphId(folderId), ownerId);
  const additions = record
    ? planFolderCourseAdditions({
        courseId: course.id,
        lessons: course.lessons,
        graph: record.graph,
        mastered: await masteredConcepts(ownerId, record.graphId),
        language: course.language ?? null,
        now: Date.now(),
      })
    : [];
  return {
    courseId: course.id,
    title: course.title,
    lessonCount: course.lessons.length,
    newConceptCount: additions.reduce((total, lesson) => total + (lesson.conceptIds?.length ?? 0), 0),
  };
}

/** Create (or reuse) the folder's course; the first lesson generates in a worker. */
export async function createFolderCourse(ownerId: string, folderId: string): Promise<{ courseId: string; created: boolean }> {
  const { folder, record } = await folderGraph(ownerId, folderId);
  if (!record || record.graph.topics.length === 0) throw new FolderCourseError("no_graph", "This folder has no analyzed lectures yet.");
  const existing = await getCourseByScopeKey(ownerId, folderCourseScopeKey(folderId));
  if (existing) return { courseId: existing.id, created: false };

  const preferences = await getUserPreferences(ownerId);
  const preferred = preferences.contentLanguage;
  const language = preferred === "zh" || preferred === "en" ? preferred : record.language === "en" ? "en" : "zh";
  const { course, firstLesson, isNewCourse } = await initializeCourseOutline({
    ownerId,
    topic: record.title,
    source: "cold_start",
    language,
    generatedGraph: record.graph,
    summary: language === "zh"
      ? `按文件夹「${folder.name}」里的讲义与知识图谱生成的课程`
      : `A course built from the lectures and knowledge graph in your "${folder.name}" folder`,
  });
  if (isNewCourse) {
    await enqueueLessonGenerationJob({ ownerId, courseId: course.id, lessonId: firstLesson.id });
    scheduleMaterialIndexing(ownerId, record.materialIds);
  }
  return { courseId: course.id, created: isNewCourse };
}

/** Insert planned lessons for concepts later lectures added. */
export async function syncFolderCourse(ownerId: string, folderId: string): Promise<{ courseId: string; added: number }> {
  const { record } = await folderGraph(ownerId, folderId);
  const course = await getCourseByScopeKey(ownerId, folderCourseScopeKey(folderId));
  if (!course) throw new FolderCourseError("no_course", "This folder has no course yet.");
  if (!record) return { courseId: course.id, added: 0 };
  const additions = planFolderCourseAdditions({
    courseId: course.id,
    lessons: course.lessons,
    graph: record.graph,
    mastered: await masteredConcepts(ownerId, record.graphId),
    language: course.language ?? null,
    now: Date.now(),
  });
  if (additions.length > 0) {
    await getDb().transaction(async (tx) => {
      for (const lesson of additions) {
        await insertPlannedLesson(
          {
            id: lesson.id,
            courseId: course.id,
            ownerId,
            topicId: lesson.topicId ?? null,
            title: lesson.title,
            description: lesson.description,
            role: "new",
            sortKey: lesson.sortKey,
            conceptIds: lesson.conceptIds ?? [],
          },
          tx,
        );
      }
    });
    scheduleMaterialIndexing(ownerId, record.materialIds);
  }
  return { courseId: course.id, added: additions.length };
}
