#!/usr/bin/env tsx

import { planFactMutations, type FactExtractionOp } from "../src/lib/learner-facts/store.ts";
import type { LearnerFact } from "../src/lib/learner-profile/types.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function fact(partial: Partial<LearnerFact> & { id: string; text: string }): LearnerFact {
  return {
    ownerId: "u1",
    category: "preference",
    status: "active",
    confidence: 0.5,
    evidence: [],
    occurrences: 1,
    sourceLessonId: null,
    lastSeenAt: null,
    createdAt: null,
    updatedAt: null,
    ...partial,
  };
}

const ev = (lessonId: string | null, eventIds: string[] = ["e1"]) => ({ lessonId, eventIds, at: "2026-01-01T00:00:00Z" });

function main() {
  // add a genuinely new fact → insert
  {
    const plan = planFactMutations([], [{ op: "add", text: "Likes worked examples", category: "preference", evidence: ev("L1") }]);
    assert(plan.added === 1 && plan.mutations[0].kind === "insert", "new add → insert");
  }

  // add duplicate of an ACTIVE fact (normalized) → skip, never duplicate
  {
    const existing = [fact({ id: "f1", text: "Likes Worked   Examples" })];
    const plan = planFactMutations(existing, [{ op: "add", text: "likes worked examples", category: "preference", evidence: ev("L1") }]);
    assert(plan.added === 0 && plan.skipped === 1, "dup of active add → skip");
  }

  // add duplicate of a DISMISSED tombstone → skip (never re-create dismissed)
  {
    const existing = [fact({ id: "f1", text: "Wants short answers", status: "dismissed" })];
    const plan = planFactMutations(existing, [{ op: "add", text: "wants short answers", category: "preference", evidence: ev("L2") }]);
    assert(plan.added === 0 && plan.skipped === 1, "dup of dismissed add → skip");
  }

  // two adds with same text in one batch → second collapses
  {
    const plan = planFactMutations(
      [],
      [
        { op: "add", text: "Confuses class and object", category: "learning_gap", evidence: ev("L1") },
        { op: "add", text: "confuses class and object", category: "learning_gap", evidence: ev("L1") },
      ] as FactExtractionOp[],
    );
    assert(plan.added === 1 && plan.skipped === 1, "duplicate adds within a batch collapse");
  }

  // reinforce an active fact with a NEW lesson → update, occurrences bump
  {
    const existing = [fact({ id: "f1", text: "Confuses recursion base case", occurrences: 2, evidence: [ev("L1")] })];
    const plan = planFactMutations(existing, [{ op: "reinforce", factId: "f1", evidence: ev("L2") }]);
    assert(plan.reinforced === 1 && plan.mutations[0].kind === "update", "reinforce new lesson → update");
    const m = plan.mutations[0] as Extract<typeof plan.mutations[number], { kind: "update" }>;
    assert(m.occurrences === 3, "occurrences bumped to 3");
    assert(m.evidence.length === 2, "evidence appended");
  }

  // reinforce idempotency: same lessonId already in evidence → skip (re-run guard)
  {
    const existing = [fact({ id: "f1", text: "Confuses recursion base case", occurrences: 2, evidence: [ev("L1")] })];
    const plan = planFactMutations(existing, [{ op: "reinforce", factId: "f1", evidence: ev("L1") }]);
    assert(plan.reinforced === 0 && plan.skipped === 1, "reinforce same lesson → skip (no double count)");
  }

  // reinforce a dismissed / missing fact → skip
  {
    const existing = [fact({ id: "f1", text: "Old dismissed gap", status: "dismissed" })];
    const plan = planFactMutations(existing, [
      { op: "reinforce", factId: "f1", evidence: ev("L2") },
      { op: "reinforce", factId: "ghost", evidence: ev("L2") },
    ]);
    assert(plan.reinforced === 0 && plan.skipped === 2, "reinforce dismissed/missing → skip");
  }

  // batch: two reinforces of the same fact across two lessons accumulate
  {
    const existing = [fact({ id: "f1", text: "Confuses recursion base case", occurrences: 1, evidence: [] })];
    const plan = planFactMutations(existing, [
      { op: "reinforce", factId: "f1", evidence: ev("L1") },
      { op: "reinforce", factId: "f1", evidence: ev("L2") },
    ]);
    assert(plan.reinforced === 2, "two distinct-lesson reinforces both apply");
    const last = plan.mutations[1] as Extract<typeof plan.mutations[number], { kind: "update" }>;
    assert(last.occurrences === 3 && last.evidence.length === 2, "cumulative occurrences + evidence within batch");
  }

  process.stdout.write("[learner-facts-plan.unit] ALL CHECKS PASSED\n");
}

main();
