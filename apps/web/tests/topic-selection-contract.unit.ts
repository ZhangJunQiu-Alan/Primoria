#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  InvalidCourseTopicAnchorError,
  resolveCourseContextFromTopicAnchor,
} from "../src/lib/knowledge-graph/course-context.ts";
import { getTopic } from "../src/lib/knowledge-graph/topic-graph.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function assertInvalidAnchor(run: () => unknown, message: string) {
  try {
    run();
  } catch (error) {
    assert(error instanceof InvalidCourseTopicAnchorError, message);
    return;
  }
  throw new Error(`assertion failed: ${message}`);
}

function main() {
  const graphId = "a_level_mathematics";
  const selectedTopicId = "mat_differentiation_part1";
  const selected = getTopic(graphId, selectedTopicId)!;
  const targetConceptId = selected.conceptIds[0].conceptId;
  const context = resolveCourseContextFromTopicAnchor({ graphId, startTopicId: selectedTopicId, targetConceptId });

  assert(context.startTopic.topicId === selectedTopicId, "selected Basic differentiation topicId is preserved exactly");
  assert(context.startTopic.name === "Differentiation (Basic) (Part 1)", "selected Basic differentiation name is preserved");
  assert(context.startTopic.topicId !== "mat_differentiation_adv", "selection never drifts to Advanced differentiation");
  assert(context.nextTopic?.topicId === "mat_differentiation_part2", "next topic follows the curriculum after the selected topic");
  assert(context.targetConceptId === targetConceptId, "valid target concept is preserved");
  assert(context.startTopic.concepts.length === selected.conceptIds.length, "concepts are resolved from the server graph");

  // Chinese locale resolves nameZh into the course context (topic + concepts)
  // so generated course/lesson titles match the localized menu.
  const zhContext = resolveCourseContextFromTopicAnchor({ graphId, startTopicId: selectedTopicId, targetConceptId, language: "zh" });
  assert(zhContext.startTopic.name === "微分 (第一部分)", "zh locale resolves topic nameZh into course context");
  assert(zhContext.startTopic.concepts[0].name === "从原理求导", "zh locale resolves concept nameZh into course context");
  assert(zhContext.startTopic.topicId === selectedTopicId, "localized context preserves the topic id");

  assertInvalidAnchor(
    () => resolveCourseContextFromTopicAnchor({ graphId, startTopicId: "mat_differentiation_adv_typo" }),
    "unknown topic is rejected",
  );
  assertInvalidAnchor(
    () => resolveCourseContextFromTopicAnchor({ graphId, startTopicId: selectedTopicId, targetConceptId: "mat_integration_by_parts" }),
    "target concept outside the selected topic is rejected",
  );
  assertInvalidAnchor(
    () => resolveCourseContextFromTopicAnchor({ graphId: "unknown_graph", startTopicId: selectedTopicId }),
    "unknown graph is rejected",
  );

  const here = dirname(fileURLToPath(import.meta.url));
  const hookSource = readFileSync(resolve(here, "../src/hooks/use-primoria-copilot.tsx"), "utf8");
  const courseRouteSource = readFileSync(resolve(here, "../src/app/api/learning/course/route.ts"), "utf8");

  assert(!hookSource.includes("setActiveQuery(item.name)"), "menu click never restarts text positioning");
  assert(hookSource.includes("startTopicId: item.topicId"), "menu click sends the selected topicId");
  assert(hookSource.includes("graphId: item.graphId"), "menu click sends the resolved graphId");
  assert(courseRouteSource.includes("startTopicId: z.string().min(1)"), "course API accepts a topic anchor ID");
  assert(!courseRouteSource.includes("courseContext: z.object"), "course API no longer trusts client CourseContext");
  assert(courseRouteSource.includes("resolveCourseContextFromTopicAnchor(anchor)"), "course API resolves context on the server");
  assert(courseRouteSource.includes("status: 400"), "invalid graph/topic anchors return a client error");

  process.stdout.write("[topic-selection-contract.unit] ALL CHECKS PASSED\n");
}

main();
