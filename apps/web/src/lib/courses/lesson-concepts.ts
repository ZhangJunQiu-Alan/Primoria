import { listConceptMasteryByOwner } from "@/lib/mastery/owner-store";
import type { MasteryStatus } from "@/lib/mastery/store";
import { resolveKgDisplayName } from "@/lib/knowledge-graph/display-name";
import type { TopicConcept } from "@/lib/knowledge-graph/topic-graph";
import { conceptSourceRefs } from "@/lib/materials/grounding";
import { getMaterialGraph, type MaterialGraphRecord } from "@/lib/materials/material-graph-store";
import { getChunkLocators, getMaterialsByIds } from "@/lib/materials/store";
import { isMaterialGraphId, type MaterialSourceRef } from "@/lib/materials/types";
import { resolveCourseTopicGraph } from "./course-graph";
import type { Course } from "./types";

export type LessonConceptView = {
  conceptId: string;
  name: string;
  status: MasteryStatus;
  /** Material courses only: where in the learner's files this concept comes from. */
  sources?: MaterialSourceRef[];
};

type SourceLookup = (conceptId: string) => MaterialSourceRef[];

// Concept → "file · p. 3–4" for a mat_* course. Attribution is decoration: any
// failure yields no sources rather than hiding the concept list.
async function materialSourceLookup(record: MaterialGraphRecord, ownerId: string, language: string | null | undefined): Promise<SourceLookup> {
  const refs = Object.values(record.conceptSources).flat();
  const [locators, materials] = await Promise.all([
    getChunkLocators(ownerId, refs),
    getMaterialsByIds(ownerId, record.materialIds),
  ]);
  const chunks = new Map(locators.map((row) => [`${row.materialId}#${row.ordinal}`, row]));
  const materialTitles = new Map(materials.map((material) => [material.id, material.title]));
  const lang = language?.toLowerCase().startsWith("zh") ? "zh" : "en";
  return (conceptId) => conceptSourceRefs({ refs: record.conceptSources[conceptId] ?? [], chunks, materialTitles, language: lang });
}

/**
 * Concept names plus the learner's mastery status for every lesson in a course,
 * keyed by lesson id. Purely presentational: a missing graph or a mastery read
 * failure yields fewer entries, never an error.
 */
export async function loadLessonConcepts(course: Course, ownerId: string | null): Promise<Record<string, LessonConceptView[]>> {
  const graphId = course.graphId;
  if (!graphId) return {};
  try {
    const materialRecord = isMaterialGraphId(graphId) && ownerId ? await getMaterialGraph(graphId, ownerId) : null;
    const [graph, mastery, sourcesFor] = await Promise.all([
      materialRecord ? materialRecord.graph : resolveCourseTopicGraph(graphId, ownerId),
      ownerId ? listConceptMasteryByOwner(ownerId, graphId).catch(() => []) : Promise.resolve([]),
      materialRecord && ownerId
        ? materialSourceLookup(materialRecord, ownerId, course.language).catch((): SourceLookup => () => [])
        : null,
    ]);
    if (!graph) return {};
    const conceptsById = new Map<string, TopicConcept>();
    for (const topic of graph.topics) {
      for (const concept of topic.conceptIds) conceptsById.set(concept.conceptId, concept);
    }
    const statusById = new Map(mastery.map((entry) => [entry.conceptId, entry.status]));
    const result: Record<string, LessonConceptView[]> = {};
    for (const lesson of course.lessons) {
      const views = (lesson.conceptIds ?? []).flatMap((conceptId) => {
        const concept = conceptsById.get(conceptId);
        if (!concept) return [];
        const sources = sourcesFor?.(conceptId) ?? [];
        return [{
          conceptId,
          name: resolveKgDisplayName(concept, course.language),
          status: statusById.get(conceptId) ?? "untested",
          ...(sources.length ? { sources } : {}),
        }];
      });
      if (views.length > 0) result[lesson.id] = views;
    }
    return result;
  } catch {
    return {};
  }
}
