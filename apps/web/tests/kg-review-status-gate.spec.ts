import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  getTopicGraphReviewStatus,
  listRoutableTopicGraphIds,
  listTopicGraphIds,
  requiresApprovedGraphsForRouting,
} from "@/lib/knowledge-graph/topic-graph";

// Governance state must survive the source -> runtime-artifact boundary, and
// registration must stop implying routability once the gate is on.
// See docs/knowledge-graph/catalog.md: "Runtime registration is not approval."

const SOURCE_DIR = fileURLToPath(
  new URL("../../../data/knowledge-graphs/source/", import.meta.url),
);

function sourceReviewStatus(graphId: string): string {
  const raw = JSON.parse(readFileSync(`${SOURCE_DIR}${graphId}.json`, "utf8"));
  return raw.review_status;
}

afterEach(() => {
  delete process.env.PRIMORIA_REQUIRE_APPROVED_KG;
});

describe("knowledge-graph review-status gate", () => {
  it("carries every source review_status into the runtime artifact", () => {
    for (const graphId of listTopicGraphIds()) {
      const expected = sourceReviewStatus(graphId) === "approved" ? "approved" : "needs_review";
      expect(getTopicGraphReviewStatus(graphId), graphId).toBe(expected);
    }
  });

  it("registers both approved and needs_review graphs", () => {
    const ids = listTopicGraphIds();
    const pending = ids.filter((id) => getTopicGraphReviewStatus(id) === "needs_review");
    // Registration is deliberately not filtered: the full registry stays
    // resolvable so existing courses and explicit graph ids keep working.
    expect(pending.length).toBeGreaterThan(0);
    expect(ids.length).toBeGreaterThan(pending.length);
  });

  it("defaults to permissive so routing coverage does not silently narrow", () => {
    expect(requiresApprovedGraphsForRouting()).toBe(false);
    expect(listRoutableTopicGraphIds()).toEqual(listTopicGraphIds());
  });

  it("excludes needs_review graphs from routing when the gate is enabled", () => {
    process.env.PRIMORIA_REQUIRE_APPROVED_KG = "1";
    const routable = listRoutableTopicGraphIds();

    expect(routable.length).toBeGreaterThan(0);
    expect(routable.length).toBeLessThan(listTopicGraphIds().length);
    for (const graphId of routable) {
      expect(getTopicGraphReviewStatus(graphId), graphId).toBe("approved");
    }
  });

  it("keeps gated-out graphs registered and directly resolvable", () => {
    process.env.PRIMORIA_REQUIRE_APPROVED_KG = "1";
    const pending = listTopicGraphIds().filter(
      (id) => getTopicGraphReviewStatus(id) === "needs_review",
    );
    const routable = new Set(listRoutableTopicGraphIds());

    for (const graphId of pending) {
      expect(routable.has(graphId), graphId).toBe(false);
      // Still in the registry: an existing course on this graph must not break.
      expect(listTopicGraphIds()).toContain(graphId);
    }
  });

  it("never returns an empty library, so the gate cannot cause an outage", () => {
    process.env.PRIMORIA_REQUIRE_APPROVED_KG = "1";
    expect(listRoutableTopicGraphIds().length).toBeGreaterThan(0);
  });
});
