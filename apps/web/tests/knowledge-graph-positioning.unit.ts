#!/usr/bin/env tsx

import { classifyEntry } from "../src/lib/knowledge-graph/positioning.ts";
import { nextTopic } from "../src/lib/knowledge-graph/topic-graph.ts";
import { suggestFloor } from "../src/lib/knowledge-graph/floor-calibration.ts";
import type { KnowledgeGraphSearchResult } from "../src/lib/knowledge-graph/search.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

const GRAPH_ID = "calculus_single_variable_v1";

function concept(nodeId: string, topicId: string, similarity: number): KnowledgeGraphSearchResult {
  return {
    graphId: GRAPH_ID,
    kind: "concept",
    nodeId,
    name: nodeId,
    description: null,
    topicId,
    topicName: topicId,
    embedText: "",
    modelVersion: "test",
    distance: 1 - similarity,
    similarity,
  };
}

function main() {
  // next_topic: min default_order hard successor; leaf -> null.
  assert(nextTopic(GRAPH_ID, "t_deriv_rules")?.topicId === "t_deriv_special", "next_topic picks first hard successor");
  assert(nextTopic(GRAPH_ID, "t_app") === null, "leaf topic has no next topic");

  // Specific: mass concentrated in one topic -> 2-lesson linear path.
  const specific = classifyEntry({
    graphId: GRAPH_ID,
    results: [
      concept("c_chain_rule", "t_deriv_rules", 0.61),
      concept("c_derivative_rules", "t_deriv_rules", 0.58),
      concept("c_basic_derivatives", "t_deriv_rules", 0.55),
      concept("c_composite_function", "t_func_ops", 0.34),
    ],
  });
  assert(specific.branch === "specific", `expected specific, got ${specific.branch}`);
  assert(specific.startTopicId === "t_deriv_rules", "specific start topic = dominant topic");
  assert(specific.linear === true && specific.path?.length === 2, "specific builds 2-lesson linear path");
  assert(specific.path?.[1].topicId === "t_deriv_special", "second lesson = next_topic");

  // Concept-dominant: one concept clearly high routes to behaviour 1 even if
  // its topic does not hold the softmax mass majority.
  const conceptDominant = classifyEntry({
    graphId: GRAPH_ID,
    results: [
      concept("c_taylor", "t_taylor", 0.66),
      concept("c_monotonicity", "t_deriv_app_mono", 0.41),
      concept("c_area", "t_app", 0.4),
      concept("c_volume", "t_app", 0.39),
    ],
  });
  assert(conceptDominant.branch === "specific", "clearly-high concept -> specific");
  assert(conceptDominant.startTopicId === "t_taylor", "concept-dominant start topic");
  assert(conceptDominant.targetConceptId === "c_taylor", "concept-dominant pins target concept");

  // Broad: mass spread across topics -> menu ordered by default_order.
  const broad = classifyEntry({
    graphId: GRAPH_ID,
    results: [
      concept("c_derivative_def", "t_deriv_concept", 0.42),
      concept("c_definite_def", "t_def_concept", 0.41),
      concept("c_series_concept", "t_series_const", 0.4),
      concept("c_function", "t_func_basic", 0.4),
    ],
  });
  assert(broad.branch === "broad", `expected broad, got ${broad.branch}`);
  assert(Array.isArray(broad.menu) && broad.menu.length >= 2, "broad returns a menu");
  const orders = broad.menu!.map((m) => m.defaultOrder);
  assert(
    orders.every((o, i) => i === 0 || orders[i - 1] <= o),
    "broad menu is ordered by default_order",
  );
  assert(broad.menu![0].topicId === "t_func_basic", "lowest default_order topic comes first");

  // Fallback: everything below FLOOR.
  const fallback = classifyEntry({
    graphId: GRAPH_ID,
    results: [concept("c_function", "t_func_basic", 0.18), concept("c_area", "t_app", 0.16)],
  });
  assert(fallback.branch === "fallback", "below-floor -> fallback");
  assert(typeof fallback.message === "string" && fallback.message.length > 0, "fallback carries a message");

  // FLOOR calibration: separable groups -> midpoint.
  const sep = suggestFloor([0.61, 0.5, 0.55], [0.2, 0.18, 0.25]);
  assert(sep.separable === true, "in/out domain separable");
  assert(Math.abs(sep.suggestedFloor - (0.5 + 0.25) / 2) < 1e-6, "floor = midpoint of gap");
  const overlap = suggestFloor([0.3, 0.22], [0.25, 0.28]);
  assert(overlap.separable === false, "overlapping groups flagged not separable");

  process.stdout.write("[knowledge-graph-positioning.unit] ALL UNIT CHECKS PASSED\n");
}

main();
