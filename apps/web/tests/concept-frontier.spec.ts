import { describe, it, expect } from "vitest";
import { buildConceptFrontierOutline, type ConceptBundle } from "../src/lib/knowledge-graph/concept-frontier";
import { getTopicGraph, listTopicGraphIds, type TopicGraph, type TopicConcept } from "../src/lib/knowledge-graph/topic-graph";

// --- synthetic graph builder --------------------------------------------------

type ConceptSpec = { id: string; order: number; centrality?: number };

function mkGraph(
  topics: { id: string; order: number; concepts: ConceptSpec[] }[],
  conceptEdges?: TopicGraph["conceptEdges"],
): TopicGraph {
  return {
    graphId: "g_test",
    subject: "Test",
    topics: topics.map((t) => ({
      topicId: t.id,
      name: t.id,
      defaultOrder: t.order,
      conceptIds: t.concepts.map(
        (c): TopicConcept => ({ conceptId: c.id, name: c.id, defaultOrder: c.order, centrality: c.centrality }),
      ),
      successors: [],
      prereqTopics: [],
      isRoot: t.order === 1,
    })),
    ...(conceptEdges ? { conceptEdges } : {}),
  };
}

function flatten(bundles: ConceptBundle[]): string[] {
  return bundles.flatMap((b) => b.conceptIds);
}

function authoredOrder(graph: TopicGraph): string[] {
  return [...graph.topics]
    .flatMap((t) => t.conceptIds.map((c) => ({ c, to: t.defaultOrder })))
    .sort((a, b) => (a.to - b.to) || (a.c.defaultOrder - b.c.defaultOrder) || a.c.conceptId.localeCompare(b.c.conceptId))
    .map((x) => x.c.conceptId);
}

const NONE: ReadonlySet<string> = new Set();

// --- real library graphs ------------------------------------------------------

describe("concept-frontier · library graphs", () => {
  const graphIds = listTopicGraphIds();

  it("empty mastery reproduces authored concept order (anti-DFS invariant)", () => {
    for (const id of graphIds) {
      const graph = getTopicGraph(id);
      const bundles = buildConceptFrontierOutline({
        graph,
        startTopicId: null,
        targetConceptId: null,
        masteredConceptIds: NONE,
      });
      expect(flatten(bundles), `graph ${id}`).toEqual(authoredOrder(graph));
    }
  });

  it("every bundle is 2-3 concepts except an optional short final lesson", () => {
    for (const id of graphIds) {
      const bundles = buildConceptFrontierOutline({
        graph: getTopicGraph(id),
        startTopicId: null,
        targetConceptId: null,
        masteredConceptIds: NONE,
      });
      bundles.forEach((b, i) => {
        const last = i === bundles.length - 1;
        expect(b.conceptIds.length, `graph ${id} bundle ${i}`).toBeGreaterThanOrEqual(last ? 1 : 2);
        expect(b.conceptIds.length, `graph ${id} bundle ${i}`).toBeLessThanOrEqual(3);
      });
    }
  });

  it("is deterministic", () => {
    const graph = getTopicGraph(graphIds[0]);
    const args = { graph, startTopicId: null, targetConceptId: null, masteredConceptIds: NONE };
    expect(buildConceptFrontierOutline(args)).toEqual(buildConceptFrontierOutline(args));
  });
});

// --- synthetic behaviour ------------------------------------------------------

describe("concept-frontier · behaviour", () => {
  const graph = mkGraph(
    [
      { id: "t1", order: 1, concepts: [{ id: "a", order: 1 }, { id: "b", order: 2 }, { id: "c", order: 3 }] },
      { id: "t2", order: 2, concepts: [{ id: "d", order: 1 }, { id: "e", order: 2 }] },
    ],
    [
      { from: "a", to: "b", strength: "hard" },
      { from: "b", to: "c", strength: "hard" },
      { from: "c", to: "d", strength: "hard" },
      { from: "d", to: "e", strength: "hard" },
    ],
  );

  it("mastered concepts never appear in bundles", () => {
    const bundles = buildConceptFrontierOutline({
      graph,
      startTopicId: null,
      targetConceptId: null,
      masteredConceptIds: new Set(["b", "d"]),
    });
    const ids = flatten(bundles);
    expect(ids).not.toContain("b");
    expect(ids).not.toContain("d");
    expect(ids).toEqual(["a", "c", "e"]);
  });

  it("hard prerequisites land in an earlier or same-earlier position", () => {
    const bundles = buildConceptFrontierOutline({
      graph,
      startTopicId: null,
      targetConceptId: null,
      masteredConceptIds: NONE,
    });
    const pos = new Map(flatten(bundles).map((id, i) => [id, i]));
    for (const [from, to] of [["a", "b"], ["b", "c"], ["c", "d"], ["d", "e"]] as const) {
      expect(pos.get(from)!).toBeLessThan(pos.get(to)!);
    }
  });

  it("a short A→B→C chain forms one 3-concept lesson", () => {
    const chain = mkGraph(
      [{ id: "t1", order: 1, concepts: [{ id: "a", order: 1 }, { id: "b", order: 2 }, { id: "c", order: 3 }] }],
      [{ from: "a", to: "b", strength: "hard" }, { from: "b", to: "c", strength: "hard" }],
    );
    const bundles = buildConceptFrontierOutline({ graph: chain, startTopicId: null, targetConceptId: null, masteredConceptIds: NONE });
    expect(bundles).toHaveLength(1);
    expect(bundles[0].conceptIds).toEqual(["a", "b", "c"]);
    expect(bundles[0].primaryTopicId).toBe("t1");
  });

  it("centrality does not move a later-authored concept ahead", () => {
    // b authored after a; giving b huge centrality must not reorder them.
    const g = mkGraph([
      { id: "t1", order: 1, concepts: [{ id: "a", order: 1, centrality: 0 }, { id: "b", order: 2, centrality: 1 }] },
    ]);
    const bundles = buildConceptFrontierOutline({ graph: g, startTopicId: null, targetConceptId: null, masteredConceptIds: NONE });
    expect(flatten(bundles)).toEqual(["a", "b"]);
  });

  it("specific target scopes to the target's hard-prerequisite closure", () => {
    // e depends on d..a; targeting c should exclude d,e.
    const bundles = buildConceptFrontierOutline({
      graph,
      startTopicId: null,
      targetConceptId: "c",
      masteredConceptIds: NONE,
    });
    expect(flatten(bundles).sort()).toEqual(["a", "b", "c"]);
  });

  it("unions multiple target closures without adding unrelated downstream concepts", () => {
    const linearAlgebra = getTopicGraph("linear_algebra");
    const bundles = buildConceptFrontierOutline({
      graph: linearAlgebra,
      startTopicId: null,
      targetConceptId: null,
      targetConceptIds: ["c_mit1806_matrix_ops", "c_mit1806_linear_transformations"],
      masteredConceptIds: NONE,
    });
    const ids = flatten(bundles);

    expect(ids).toEqual([
      "c_mit1806_vectors",
      "c_mit1806_elimination",
      "c_mit1806_matrix_ops",
      "c_mit1806_linear_transformations",
    ]);
    expect(ids).not.toContain("c_mit1806_lu_decomp");
    expect(ids).not.toContain("c_mit1806_cramers_rule");
    expect(ids).not.toContain("c_mit1806_diff_eq");
  });

  it("all-mastered scope yields no bundles", () => {
    const bundles = buildConceptFrontierOutline({
      graph,
      startTopicId: null,
      targetConceptId: null,
      masteredConceptIds: new Set(["a", "b", "c", "d", "e"]),
    });
    expect(bundles).toEqual([]);
  });

  it("synthesizes linear edges when conceptEdges is absent (generated graph)", () => {
    const g = mkGraph([
      { id: "t1", order: 1, concepts: [{ id: "a", order: 1 }, { id: "b", order: 2 }] },
      { id: "t2", order: 2, concepts: [{ id: "c", order: 1 }, { id: "d", order: 2 }, { id: "e", order: 3 }] },
    ]); // no conceptEdges
    const bundles = buildConceptFrontierOutline({ graph: g, startTopicId: null, targetConceptId: null, masteredConceptIds: NONE });
    expect(flatten(bundles)).toEqual(["a", "b", "c", "d", "e"]);
    expect(bundles.map((b) => b.conceptIds.length)).toEqual([3, 2]);
  });
});
