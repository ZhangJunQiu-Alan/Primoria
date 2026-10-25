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

  it("registers only approved graphs after the CN/SG owner review", () => {
    // Registration is deliberately not filtered: the full registry stays
    // resolvable so existing courses and explicit graph ids keep working. The
    // gate's exclusion behavior is covered against a synthetic registry in
    // kg-review-status-gate-fixture.spec.ts.
    const ids = listTopicGraphIds();
    expect(ids.length).toBeGreaterThan(0);
    for (const graphId of ids) expect(getTopicGraphReviewStatus(graphId), graphId).toBe("approved");
  });

  it("enables the approved-only gate by default and allows an explicit opt-out", () => {
    expect(requiresApprovedGraphsForRouting()).toBe(true);
    process.env.PRIMORIA_REQUIRE_APPROVED_KG = "0";
    expect(requiresApprovedGraphsForRouting()).toBe(false);
  });

  it("keeps the full library routable under the gate because every graph is approved", () => {
    expect(listRoutableTopicGraphIds()).toEqual(listTopicGraphIds());
  });
});
