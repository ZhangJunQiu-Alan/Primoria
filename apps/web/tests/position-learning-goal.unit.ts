#!/usr/bin/env tsx

import { planFromPositioning } from "../src/lib/knowledge-graph/position-learning-goal.ts";
import type { LessonPlan, PositioningResult } from "../src/lib/knowledge-graph/positioning.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

const baseParams = {
  tau: 0.6,
  floor: 0.28,
  temperature: 0.1,
  conceptHighFloor: 0.5,
  conceptMargin: 0.06,
  menuSize: 5,
  menuSimilarityWindow: 0.1,
};
const baseDiagnostics = { maxSimilarity: 0, topicMass: [], topConcept: null };

function lesson(order: number, topicId: string, name: string, conceptId: string): LessonPlan {
  return { order, topicId, name, concepts: [{ conceptId, name: conceptId.toUpperCase(), defaultOrder: 1 }] };
}

function main() {
  // specific + nextTopic -> two-lesson course context
  const twoLessons: PositioningResult = {
    branch: "positioned",
    graphId: "g1",
    params: baseParams,
    diagnostics: baseDiagnostics,
    startTopicId: "t1",
    targetConceptId: "c1",
    linear: true,
    mode: "specific",
    path: [lesson(1, "t1", "Topic 1", "c1"), lesson(2, "t2", "Topic 2", "c2")],
  };
  const p1 = planFromPositioning(twoLessons);
  assert(p1.branch === "positioned", "two-lesson result is positioned");
  if (p1.branch !== "positioned") return;
  assert(p1.courseContext.startTopic.topicId === "t1", "start topic preserved");
  assert(p1.courseContext.nextTopic?.topicId === "t2", "two-lesson keeps next topic");
  assert(p1.courseContext.targetConceptId === "c1", "target concept preserved");
  assert(p1.courseContext.learningPathType === "linear", "linear path type");

  // specific leaf -> single lesson, no next topic
  const oneLesson: PositioningResult = {
    ...twoLessons,
    path: [twoLessons.path![0]],
    targetConceptId: null,
  };
  const p2 = planFromPositioning(oneLesson);
  assert(p2.branch === "positioned", "leaf result is positioned");
  if (p2.branch !== "positioned") return;
  assert(p2.courseContext.nextTopic === null, "leaf topic has no next topic");
  assert(p2.courseContext.targetConceptId === null, "no target concept on leaf");

  // clarify_subject -> menu, never a course context
  const broad: PositioningResult = {
    branch: "clarify_subject",
    graphId: "g1",
    params: baseParams,
    diagnostics: baseDiagnostics,
    message: "Ambiguous goal",
    candidates: [{ graphId: "g1", subject: "Subject 1", startTopicId: "t1" }],
  };
  const p3 = planFromPositioning(broad);
  assert(p3.branch === "clarify_subject", "clarify stays clarify");
  if (p3.branch !== "clarify_subject") return;
  assert(p3.candidates.length === 1 && p3.candidates[0].graphId === "g1", "clarify returns the candidates");
  assert(p3.message === "Ambiguous goal", "clarify plan preserves message");

  // fallback -> message, never a course context
  const fallback: PositioningResult = {
    branch: "fallback",
    graphId: "g1",
    params: baseParams,
    diagnostics: baseDiagnostics,
    message: "be more specific",
  };
  const p4 = planFromPositioning(fallback);
  assert(p4.branch === "fallback", "fallback stays fallback");
  if (p4.branch !== "fallback") return;
  assert(p4.message === "be more specific", "fallback returns the message");

  console.log("position-learning-goal.unit passed");
}

main();
