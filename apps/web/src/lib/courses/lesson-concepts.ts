import { listConceptMasteryByOwner } from "@/lib/mastery/owner-store";
import type { MasteryStatus } from "@/lib/mastery/store";
import { resolveKgDisplayName } from "@/lib/knowledge-graph/display-name";
import { GENERATED_GRAPH_PREFIX, getGeneratedGraphById } from "@/lib/knowledge-graph/generated-graph";
import { getTopicGraph, type TopicConcept, type TopicGraph } from "@/lib/knowledge-graph/topic-graph";
import type { Course } from "./types";

export type LessonConceptView = {
  conceptId: string;
  name: string;
  status: MasteryStatus;
};

async function loadGraph(graphId: string): Promise<TopicGraph | null> {
  if (graphId.startsWith(GENERATED_GRAPH_PREFIX)) return getGeneratedGraphById(graphId);
  try {
    return getTopicGraph(graphId);
  } catch {
    return null;
  }
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
    const [graph, mastery] = await Promise.all([
      loadGraph(graphId),
      ownerId ? listConceptMasteryByOwner(ownerId, graphId).catch(() => []) : Promise.resolve([]),
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
        return [{
          conceptId,
          name: resolveKgDisplayName(concept, course.language),
          status: statusById.get(conceptId) ?? "untested",
        }];
      });
      if (views.length > 0) result[lesson.id] = views;
    }
    return result;
  } catch {
    return {};
  }
}
