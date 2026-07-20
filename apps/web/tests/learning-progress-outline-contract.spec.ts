import { describe, expect, it } from "vitest";
import { buildConceptFrontierOutline } from "@/lib/knowledge-graph/concept-frontier";
import { decideNextStep } from "@/lib/courses/learning-progress-decider";
import { getTopicGraph, listTopicGraphIds } from "@/lib/knowledge-graph/topic-graph";

describe("learning-progress outline contract", () => {
  it("targets the exact next concept-frontier lesson across every library graph", () => {
    let transitions = 0;
    for (const graphId of listTopicGraphIds()) {
      const graph = getTopicGraph(graphId);
      const bundles = buildConceptFrontierOutline({
        graph,
        startTopicId: null,
        targetConceptId: null,
        masteredConceptIds: new Set(),
      });
      for (let index = 0; index < bundles.length; index += 1) {
        const current = bundles[index];
        const next = bundles[index + 1];
        const nextLesson = next
          ? { id: `${graphId}:lesson:${index + 2}`, title: `Bundle ${index + 2}`, topicId: next.primaryTopicId, sortKey: index + 2 }
          : null;
        const decision = decideNextStep({
          graphId,
          currentTopicId: current.primaryTopicId,
          currentConceptIds: current.conceptIds,
          currentLessonSortKey: index + 1,
          nextLesson,
          masteryByConcept: new Map(),
        });
        transitions += 1;
        if (nextLesson) {
          expect(decision).toMatchObject({
            kind: "next",
            targetLessonId: nextLesson.id,
            targetTopicId: nextLesson.topicId,
            nextLessonTitle: nextLesson.title,
          });
        } else {
          expect(decision.kind).toBe("course_complete");
        }
      }
    }
    expect(transitions).toBeGreaterThan(400);
  });

  it("ends at the persisted goal scope even when the global graph has later topics", () => {
    const graphId = listTopicGraphIds().find((id) => getTopicGraph(id).topics.length > 2)!;
    const graph = getTopicGraph(graphId);
    const target = graph.topics[1].conceptIds.at(-1)!;
    const scoped = buildConceptFrontierOutline({
      graph,
      startTopicId: graph.topics[0].topicId,
      targetConceptId: target.conceptId,
      masteredConceptIds: new Set(),
    });
    const last = scoped.at(-1)!;
    const decision = decideNextStep({
      graphId,
      currentTopicId: last.primaryTopicId,
      currentConceptIds: last.conceptIds,
      currentLessonSortKey: scoped.length,
      nextLesson: null,
      masteryByConcept: new Map(),
    });
    expect(decision.kind).toBe("course_complete");
    expect(decision.targetLessonId).toBeNull();
  });
});
