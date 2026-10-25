import { afterEach, describe, expect, it, vi } from "vitest";

// Every runtime graph is approved today, so the gate's exclusion path is pinned
// against a synthetic registry instead of the real one.
const registry = vi.hoisted(() => ({
  graphs: {} as Record<string, { graphId: string; subject: string; reviewStatus?: string; topics: [] }>,
}));

vi.mock("@/lib/knowledge-graph/data/topic-graphs.generated", () => ({
  DEFAULT_TOPIC_GRAPH_ID: "approved_graph",
  get TOPIC_GRAPHS() {
    return registry.graphs;
  },
}));

import {
  getTopicGraphReviewStatus,
  listRoutableTopicGraphIds,
  listTopicGraphIds,
} from "@/lib/knowledge-graph/topic-graph";

function setRegistry(statuses: Record<string, string | undefined>) {
  registry.graphs = Object.fromEntries(
    Object.entries(statuses).map(([graphId, reviewStatus]) => [
      graphId,
      { graphId, subject: graphId, ...(reviewStatus ? { reviewStatus } : {}), topics: [] },
    ]),
  );
}

afterEach(() => {
  delete process.env.PRIMORIA_REQUIRE_APPROVED_KG;
});

describe("knowledge-graph review-status gate (synthetic registry)", () => {
  it("treats a missing artifact reviewStatus as approved", () => {
    setRegistry({ approved_graph: "approved", legacy_graph: undefined, pending_graph: "needs_review" });
    expect(getTopicGraphReviewStatus("legacy_graph")).toBe("approved");
    expect(getTopicGraphReviewStatus("pending_graph")).toBe("needs_review");
  });

  it("excludes needs_review graphs from routing by default", () => {
    setRegistry({ approved_graph: "approved", legacy_graph: undefined, pending_graph: "needs_review" });
    expect(listRoutableTopicGraphIds()).toEqual(["approved_graph", "legacy_graph"]);
    // Still registered: an existing course on this graph must not break.
    expect(listTopicGraphIds()).toContain("pending_graph");
  });

  it("routes to the full registry when explicitly opted out", () => {
    setRegistry({ approved_graph: "approved", pending_graph: "needs_review" });
    process.env.PRIMORIA_REQUIRE_APPROVED_KG = "0";
    expect(listRoutableTopicGraphIds()).toEqual(listTopicGraphIds());
  });

  it("never returns an empty library, so the gate cannot cause an outage", () => {
    setRegistry({ pending_a: "needs_review", pending_b: "needs_review" });
    expect(listRoutableTopicGraphIds()).toEqual(["pending_a", "pending_b"]);
  });
});
