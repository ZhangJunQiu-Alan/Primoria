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
    branch: "specific",
    graphId: "g1",
    params: baseParams,
    diagnostics: baseDiagnostics,
    startTopicId: "t1",
    targetConceptId: "c1",
    linear: true,
    path: [lesson(1, "t1", "Topic 1", "c1"), lesson(2, "t2", "Topic 2", "c2")],
  };
  const p1 = planFromPositioning(twoLessons);
  assert(p1.branch === "specific", "two-lesson result is specific");
  if (p1.branch !== "specific") return;
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
  assert(p2.branch === "specific", "leaf result is specific");
  if (p2.branch !== "specific") return;
  assert(p2.courseContext.nextTopic === null, "leaf topic has no next topic");
  assert(p2.courseContext.targetConceptId === null, "no target concept on leaf");

  // broad -> menu, never a course context
  const broad: PositioningResult = {
    branch: "broad",
    graphId: "g1",
    params: baseParams,
    diagnostics: baseDiagnostics,
    menu: [{ topicId: "t1", name: "Topic 1", defaultOrder: 1, concepts: [], reason: "Matches the current goal." }],
  };
  const p3 = planFromPositioning(broad);
  assert(p3.branch === "broad", "broad stays broad");
  if (p3.branch !== "broad") return;
  assert(p3.menu.length === 1 && p3.menu[0].topicId === "t1", "broad returns the menu");
  assert(p3.menu[0].reason === "Matches the current goal.", "broad plan preserves generated relevance reason");

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
