#!/usr/bin/env tsx

import { computeMasteryUpdates, type ConceptEvidence } from "../src/lib/mastery/rules.ts";
import type { MasteryStatus } from "../src/lib/mastery/store.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function ev(entries: Record<string, ConceptEvidence>): Map<string, ConceptEvidence> {
  return new Map(Object.entries(entries));
}
function state(entries: Record<string, MasteryStatus>): Map<string, MasteryStatus> {
  return new Map(Object.entries(entries));
}
function only(updates: { conceptId: string; status: MasteryStatus; score: number }[], conceptId: string) {
  const u = updates.find((x) => x.conceptId === conceptId);
  assert(u, `expected an update for ${conceptId}`);
  return u!;
}

function main() {
  // All correct with >=3 questions → mastered.
  assert(only(computeMasteryUpdates(ev({ c1: { correct: 3, total: 3 } }), state({})), "c1").status === "mastered", "3/3 → mastered");

  // High ratio (>=0.8) → mastered even from untested.
  assert(only(computeMasteryUpdates(ev({ c1: { correct: 4, total: 5 } }), state({})), "c1").status === "mastered", "4/5 → mastered");

  // Mid ratio → learning; low ratio → weak; zero → weak.
  assert(only(computeMasteryUpdates(ev({ c1: { correct: 2, total: 3 } }), state({})), "c1").status === "learning", "2/3 → learning");
  assert(only(computeMasteryUpdates(ev({ c1: { correct: 1, total: 3 } }), state({})), "c1").status === "weak", "1/3 → weak");
  assert(only(computeMasteryUpdates(ev({ c1: { correct: 0, total: 2 } }), state({})), "c1").status === "weak", "0/2 → weak");

  // Two correct out of two (allCorrect but <3) still passes the ratio gate → mastered.
  assert(only(computeMasteryUpdates(ev({ c1: { correct: 2, total: 2 } }), state({})), "c1").status === "mastered", "2/2 → mastered via ratio");

  // Downgrade rule: previously mastered + any wrong this lesson → learning, even at 0.8.
  assert(
    only(computeMasteryUpdates(ev({ c1: { correct: 4, total: 5 } }), state({ c1: "mastered" })), "c1").status === "learning",
    "mastered + a wrong → downgrade to learning",
  );
  // Previously mastered, still all correct → stays mastered.
  assert(
    only(computeMasteryUpdates(ev({ c1: { correct: 3, total: 3 } }), state({ c1: "mastered" })), "c1").status === "mastered",
    "mastered + all correct → stays mastered",
  );

  // Score is the correct ratio.
  assert(only(computeMasteryUpdates(ev({ c1: { correct: 1, total: 4 } }), state({})), "c1").score === 0.25, "score is correct ratio");

  // No evidence → no updates (untested concepts are left untouched).
  assert(computeMasteryUpdates(ev({}), state({ c1: "mastered" })).length === 0, "empty evidence → no updates");
  assert(computeMasteryUpdates(ev({ c1: { correct: 0, total: 0 } }), state({})).length === 0, "zero-total evidence skipped");

  process.stdout.write("[mastery-rules.unit] ALL CHECKS PASSED\n");
}

main();
