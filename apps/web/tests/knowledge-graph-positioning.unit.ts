#!/usr/bin/env tsx

import { classifyEntry } from "../src/lib/knowledge-graph/positioning.ts";
import { nextTopic } from "../src/lib/knowledge-graph/topic-graph.ts";
import { suggestFloor } from "../src/lib/knowledge-graph/floor-calibration.ts";
import type { KnowledgeGraphSearchResult } from "../src/lib/knowledge-graph/search.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

const GRAPH_ID = "mit_calculus";

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
  // next_topic follows the same default_order sequence as the Course outline.
  assert(nextTopic(GRAPH_ID, "t_1801_differentiation__t_1801_apps_diff")?.topicId === "t_1801_apps_diff", "next_topic follows curriculum order");
  assert(nextTopic(GRAPH_ID, "t_1802_surface_int") === null, "last curriculum topic has no next topic");

  // Specific: mass concentrated in one topic -> 2-lesson linear path.
  const specific = classifyEntry({
    graphId: GRAPH_ID,
    results: [
      concept("c_1801_chain_rule", "t_1801_differentiation__t_1801_apps_diff", 0.61),
      concept("c_1801_implicit_diff", "t_1801_differentiation__t_1801_apps_diff", 0.58),
      concept("c_1801_related_rates", "t_1801_differentiation__t_1801_apps_diff", 0.55),
      concept("c_1801_riemann_sums", "t_1801_integration", 0.34),
    ],
  });
  assert(specific.branch === "specific", `expected specific, got ${specific.branch}`);
  assert(specific.startTopicId === "t_1801_differentiation__t_1801_apps_diff", "specific start topic = dominant topic");
  assert(specific.linear === true && specific.path?.length === 2, "specific builds 2-lesson linear path");
  assert(specific.path?.[1].topicId === "t_1801_apps_diff", "second lesson = next_topic");

  // Concept-dominant: one concept clearly high routes to behaviour 1 even if
  // its topic does not hold the softmax mass majority.
  const conceptDominant = classifyEntry({
    graphId: GRAPH_ID,
    results: [
      concept("c_1801_taylor_series", "t_1801_series", 0.66),
      concept("c_1802_local_extrema", "t_1802_apps_partial", 0.41),
      concept("c_1801_area_curves", "t_1801_apps_int", 0.4),
      concept("c_1801_volume", "t_1801_apps_int", 0.39),
    ],
  });
  assert(conceptDominant.branch === "specific", "clearly-high concept -> specific");
  assert(conceptDominant.startTopicId === "t_1801_series", "concept-dominant start topic");
  assert(conceptDominant.targetConceptId === "c_1801_taylor_series", "concept-dominant pins target concept");

  // Broad: mass spread across topics -> menu ordered by default_order.
  const broad = classifyEntry({
    graphId: GRAPH_ID,
    results: [
      concept("c_1801_limits", "t_1801_differentiation", 0.42),
      concept("c_1801_definite_integral", "t_1801_integration", 0.41),
      concept("c_1802_dot_product", "t_1802_vectors", 0.4),
      concept("c_1802_partial_derivs", "t_1802_partial_diff", 0.4),
    ],
  });
  assert(broad.branch === "broad", `expected broad, got ${broad.branch}`);
  assert(Array.isArray(broad.menu) && broad.menu.length >= 2, "broad returns a menu");
  const orders = broad.menu!.map((m) => m.defaultOrder);
  assert(
    orders.every((o, i) => i === 0 || orders[i - 1] <= o),
    "broad menu is ordered by default_order",
  );
  assert(broad.menu![0].topicId === "t_1801_differentiation", "lowest default_order topic comes first");

  // Fallback: everything below FLOOR.
  const fallback = classifyEntry({
    graphId: GRAPH_ID,
    results: [concept("c_1801_limits", "t_1801_differentiation", 0.18), concept("c_1802_dot_product", "t_1802_vectors", 0.16)],
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
