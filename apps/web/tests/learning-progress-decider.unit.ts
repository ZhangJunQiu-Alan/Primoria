#!/usr/bin/env tsx

import { decideNextStep } from "../src/lib/courses/learning-progress-decider.ts";
import { DEFAULT_TOPIC_GRAPH_ID, getTopicGraph, nextTopic } from "../src/lib/knowledge-graph/topic-graph.ts";
import type { MasteryStatus } from "../src/lib/mastery/store.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

const graphId = DEFAULT_TOPIC_GRAPH_ID;
const graph = getTopicGraph(graphId);

// Discover representative curriculum positions so the test is resilient to KG
// prerequisite-graph changes. Progression itself follows default_order.
const nonLeaf = graph.topics.find((t) => nextTopic(graphId, t.topicId) !== null && t.conceptIds.length > 0)!;
const leaf = [...graph.topics].reverse().find((t) => t.conceptIds.length > 0)!;
const withPrereq = graph.topics.find(
  (t) => t.prereqTopics.length > 0 && t.conceptIds.length > 0 && (getTopicGraph(graphId).topics.find((p) => p.topicId === t.prereqTopics[0])?.conceptIds.length ?? 0) > 0,
)!;

function mastery(topicIds: string[], status: MasteryStatus): Map<string, MasteryStatus> {
  const map = new Map<string, MasteryStatus>();
  for (const topicId of topicIds) {
    const topic = graph.topics.find((t) => t.topicId === topicId);
    for (const c of topic?.conceptIds ?? []) map.set(c.conceptId, status);
  }
  return map;
}

function main() {
  assert(nonLeaf && leaf, "graph has a non-leaf and a leaf topic with concepts");

  // 1) No weak point, has a next outline topic → advance to the next topic.
  {
    const decision = decideNextStep({
      graphId,
      currentTopicId: nonLeaf.topicId,
      currentLessonSortKey: 1,
      nextLessonSortKey: null,
      masteryByConcept: mastery([nonLeaf.topicId], "mastered"),
    });
    assert(decision.kind === "next", "all mastered → next");
    assert(decision.targetTopicId === nextTopic(graphId, nonLeaf.topicId)?.topicId, "next targets the next topic");
    assert(decision.nextLessonTitle === nextTopic(graphId, nonLeaf.topicId)?.name, "next carries the next lesson title");
  }

  // 2) A weak concept in the current topic → remediation between current and next.
  {
    const m = mastery([nonLeaf.topicId], "mastered");
    const weakConcept = nonLeaf.conceptIds[0].conceptId;
    m.set(weakConcept, "weak");
    const decision = decideNextStep({
      graphId,
      currentTopicId: nonLeaf.topicId,
      currentLessonSortKey: 1,
      nextLessonSortKey: 2,
      masteryByConcept: m,
    });
    assert(decision.kind === "remediation", "weak concept → remediation");
    assert(decision.targetConceptId === weakConcept, "remediation targets the weak concept");
    assert(decision.targetTopicId === nonLeaf.topicId, "remediation lands in the concept's topic");
    assert(decision.proposedSortKey === 1.5, "remediation sortKey is the midpoint");
    assert(decision.nextLessonTitle === nextTopic(graphId, nonLeaf.topicId)?.name, "remediation still reports the next lesson title");
  }

  // 3) Root-cause retarget: a prereq topic concept is also weak → remediate the prereq.
  {
    const prereqTopicId = withPrereq.prereqTopics[0];
    const prereqConcept = graph.topics.find((t) => t.topicId === prereqTopicId)!.conceptIds[0].conceptId;
    const m = mastery([withPrereq.topicId], "mastered");
    m.set(withPrereq.conceptIds[0].conceptId, "weak"); // weak here
    m.set(prereqConcept, "weak"); // and a weak prereq → root cause
    const decision = decideNextStep({
      graphId,
      currentTopicId: withPrereq.topicId,
      currentLessonSortKey: 3,
      nextLessonSortKey: 4,
      masteryByConcept: m,
    });
    assert(decision.kind === "remediation", "weak with weak prereq → remediation");
    assert(decision.targetConceptId === prereqConcept, "remediation retargets the prereq root cause");
    assert(decision.targetTopicId === prereqTopicId, "remediation lands in the prereq topic");
  }

  // 4) Leaf topic, no weak point → no next lesson → course complete.
  {
    const decision = decideNextStep({
      graphId,
      currentTopicId: leaf.topicId,
      currentLessonSortKey: 9,
      nextLessonSortKey: null,
      masteryByConcept: mastery([leaf.topicId], "mastered"),
    });
    assert(decision.kind === "course_complete", "leaf + no weak → course_complete (outline end)");
    assert(decision.nextLessonTitle === null, "course_complete has no next lesson title");
  }

  // 5) Remediation at the end of the outline (no next lesson) → sortKey = current + 1.
  {
    const m = mastery([nonLeaf.topicId], "mastered");
    m.set(nonLeaf.conceptIds[0].conceptId, "weak");
    const decision = decideNextStep({
      graphId,
      currentTopicId: nonLeaf.topicId,
      currentLessonSortKey: 5,
      nextLessonSortKey: null,
      masteryByConcept: m,
    });
    assert(decision.kind === "remediation" && decision.proposedSortKey === 6, "no next lesson → remediation sortKey = current + 1");
  }

  process.stdout.write("[learning-progress-decider.unit] ALL CHECKS PASSED\n");
}

main();
