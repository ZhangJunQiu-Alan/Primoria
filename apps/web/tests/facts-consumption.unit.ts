#!/usr/bin/env tsx

import { selectPlannerFacts } from "../src/lib/courses/lesson-generation-context.ts";
import type { LearnerFact } from "../src/lib/learner-profile/types.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function fact(partial: Partial<LearnerFact> & { id: string; text: string; category: LearnerFact["category"] }): LearnerFact {
  return {
    ownerId: "u1", status: "active", confidence: 0.5, evidence: [],
    occurrences: 1, sourceLessonId: null, lastSeenAt: null, createdAt: null, updatedAt: null,
    ...partial,
  };
}

function main() {
  // goal facts are excluded from generation; the other three are kept.
  const picked = selectPlannerFacts([
    fact({ id: "f1", text: "wants A-Level prep", category: "goal", confidence: 0.99 }),
    fact({ id: "f2", text: "prefers visuals", category: "preference", confidence: 0.7 }),
    fact({ id: "f3", text: "knows matrices", category: "prior_knowledge", confidence: 0.6 }),
    fact({ id: "f4", text: "confuses class vs object", category: "learning_gap", confidence: 0.8 }),
  ]);
  assert(!picked.some((f) => (f.category as string) === "goal"), "goal facts are not fed to the planner");
  assert(picked.length === 3, "the three teaching categories are kept");
  // ranked by confidence desc → learning_gap(0.8) before preference(0.7) before prior_knowledge(0.6)
  assert(picked[0].text === "confuses class vs object", "highest-confidence fact ranked first");

  // cap at 8
  const many = Array.from({ length: 12 }, (_, i) => fact({ id: `f${i}`, text: `pref ${i}`, category: "preference", confidence: i / 12 }));
  assert(selectPlannerFacts(many).length === 8, "facts capped at 8");

  process.stdout.write("[facts-consumption.unit] ALL CHECKS PASSED\n");
}

main();
