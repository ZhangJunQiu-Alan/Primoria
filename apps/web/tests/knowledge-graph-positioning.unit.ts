#!/usr/bin/env tsx

import { classifyEntry, pickDominantGraph } from "../src/lib/knowledge-graph/positioning.ts";
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

function topic(graphId: string, nodeId: string, similarity: number): KnowledgeGraphSearchResult {
  return {
    graphId,
    kind: "topic",
    nodeId,
    name: nodeId,
    description: null,
    topicId: null,
    topicName: null,
    embedText: "",
    modelVersion: "test",
    distance: 1 - similarity,
    similarity,
  };
}

function main() {
  // next_topic follows the same default_order sequence as the Course outline.
  assert(nextTopic(GRAPH_ID, "t_1801_diff_techniques")?.topicId === "t_1801_apps_diff", "next_topic follows curriculum order");
  assert(nextTopic(GRAPH_ID, "t_1802_surface_int") === null, "last curriculum topic has no next topic");

  // Specific: mass concentrated in one topic -> 2-lesson linear path.
  const specific = classifyEntry({
    graphId: GRAPH_ID,
    results: [
      concept("c_1801_chain_rule", "t_1801_diff_techniques", 0.61),
      concept("c_1801_implicit_diff", "t_1801_diff_techniques", 0.58),
      concept("c_1801_related_rates", "t_1801_diff_techniques", 0.55),
      concept("c_1801_riemann_sums", "t_1801_integration", 0.34),
    ],
  });
  assert(specific.branch === "specific", `expected specific, got ${specific.branch}`);
  assert(specific.startTopicId === "t_1801_diff_techniques", "specific start topic = dominant topic");
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

  // Broad: mass spread across topics -> menu ordered by relevance.
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
  assert(
    broad.menu!.map((item) => item.topicId).join(",") === [
      "t_1801_differentiation",
      "t_1801_integration",
      "t_1802_vectors",
      "t_1802_partial_diff",
    ].join(","),
    "broad menu preserves relevance order",
  );

  // Broad with more hits than menuSize: the most relevant topic remains first,
  // even when its default_order is late in the curriculum.
  const broadLate = classifyEntry({
    graphId: GRAPH_ID,
    results: [
      concept("c_1802_parametric_surfaces", "t_1802_surface_int", 0.46), // order 15, top hit
      concept("c_1801_limits", "t_1801_differentiation", 0.45), // order 1
      concept("c_1801_linear_approx", "t_1801_apps_diff", 0.44), // order 3
      concept("c_1801_riemann_sums", "t_1801_integration", 0.43), // order 4
      concept("c_1801_sequences", "t_1801_series", 0.42), // order 8
      concept("c_1802_dot_product", "t_1802_vectors", 0.41), // order 9, lowest hit
    ],
  });
  assert(broadLate.branch === "broad", `expected broad, got ${broadLate.branch}`);
  assert(broadLate.menu!.length === 5, "menu is capped at menuSize");
  assert(
    broadLate.menu!.some((m) => m.topicId === "t_1802_surface_int"),
    "most-relevant late-curriculum topic survives the menu cap",
  );
  assert(broadLate.menu![0].topicId === "t_1802_surface_int", "most-relevant topic is displayed first");

  // Regression: a graph with many mediocre hits must not crowd out the graph
  // containing the strongest, consistently relevant algorithm hits.
  const algorithmGraph = pickDominantGraph([
    topic("introduction_to_computer_science", "algorithmic_complexity", 0.5514),
    topic("discrete_math_and_probability", "modular_arithmetic", 0.5505),
    topic("discrete_math_and_probability", "computability_counting", 0.5426),
    topic("introduction_to_computer_science", "algorithms", 0.5278),
    topic("a_level_mathematics", "counting_probability", 0.5117),
    topic("numerical_analysis", "computer_arithmetic", 0.5109),
    topic("data_structures_and_algorithms", "asymptotics", 0.5022),
    topic("discrete_math_and_probability", "countability", 0.4964),
    topic("a_level_mathematics", "differentiation_2", 0.4948),
    topic("mit_calculus", "integration_techniques", 0.4911),
    topic("a_level_mathematics", "differentiation_1", 0.4893),
    topic("discrete_math_and_probability", "induction", 0.4865),
    topic("mit_calculus", "integration_area", 0.4853),
    topic("discrete_math_and_probability", "logic", 0.4817),
    topic("discrete_math_and_probability", "counting", 0.4803),
  ]);
  assert(
    algorithmGraph === "introduction_to_computer_science",
    `algorithm query should select computer science, got ${algorithmGraph}`,
  );

  // Broad menus omit topics that fall outside the relevance window instead of
  // filling all five slots with weak curriculum entries.
  const focusedBroad = classifyEntry({
    graphId: GRAPH_ID,
    results: [
      concept("algorithmic_complexity", "t_1801_differentiation", 0.55),
      concept("algorithms", "t_1801_integration", 0.53),
      concept("unrelated_early_topic", "t_1802_vectors", 0.39),
    ],
  });
  assert(focusedBroad.branch === "broad", "focused broad query remains broad");
  assert(
    focusedBroad.menu?.map((item) => item.topicId).join(",") === "t_1801_differentiation,t_1801_integration",
    "broad menu removes weakly related topics outside the similarity window",
  );

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
