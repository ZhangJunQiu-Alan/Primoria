#!/usr/bin/env tsx

import { buildKgContextPrompt, type CourseContext } from "../src/lib/ai/deepagent/course-generator.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

const startTopic = {
  topicId: "t1",
  name: "导数",
  concepts: [
    { conceptId: "c1", name: "导数定义", defaultOrder: 1 },
    { conceptId: "c2", name: "求导法则", defaultOrder: 2 },
  ],
};
const nextTopic = {
  topicId: "t2",
  name: "微分中值定理",
  concepts: [{ conceptId: "c3", name: "罗尔定理", defaultOrder: 1 }],
};

function main() {
  // The next topic is preview context; generation still produces one lesson.
  const twoLessons: CourseContext = {
    learningPathType: "linear",
    graphId: "g1",
    startTopic,
    targetConceptId: "c1",
    nextTopic,
  };
  const p1 = buildKgContextPrompt(twoLessons);
  assert(/exactly ONE lesson/.test(p1), "next-topic path still instructs one lesson");
  assert(p1.includes("导数") && p1.includes("微分中值定理"), "both topics named");
  assert(p1.includes("导数定义") && p1.includes("罗尔定理"), "concepts from both topics listed");
  assert(p1.includes("1. 导数定义"), "default order is surfaced");
  assert(p1.includes("c1"), "target concept id surfaced");
  assert(/preview context only/.test(p1), "next topic is explicitly preview-only");

  // Single lesson when leaf topic (no nextTopic).
  const oneLesson: CourseContext = {
    learningPathType: "linear",
    graphId: "g1",
    startTopic,
    targetConceptId: null,
    nextTopic: null,
  };
  const p2 = buildKgContextPrompt(oneLesson);
  assert(/exactly ONE lesson/.test(p2), "leaf path instructs one lesson");

  // Empty when no context.
  assert(buildKgContextPrompt(undefined) === "", "no context -> empty hint");

  // Core-concept marking: centrality >= 0.3 gets a [core] tag + a directive;
  // a below-threshold concept stays unmarked.
  const withCore: CourseContext = {
    learningPathType: "linear",
    graphId: "g1",
    startTopic: {
      topicId: "t1",
      name: "导数",
      concepts: [
        { conceptId: "c1", name: "导数定义", defaultOrder: 1, centrality: 0.9 },
        { conceptId: "c2", name: "求导法则", defaultOrder: 2, centrality: 0.1 },
      ],
    },
    targetConceptId: null,
    nextTopic: null,
  };
  const p3 = buildKgContextPrompt(withCore);
  assert(p3.includes("导数定义 (c1) [core]"), "high-centrality concept is marked [core]");
  assert(!/求导法则 \(c2\) \[core\]/.test(p3), "low-centrality concept is not marked");
  assert(/marked \[core\] are foundational/.test(p3), "core directive is emitted when a core concept exists");
  assert(!/marked \[core\] are foundational/.test(p1), "no core directive without centrality data");

  console.log("course-kg-context.unit passed");
}

main();
