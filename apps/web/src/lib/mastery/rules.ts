import type { MasteryStatus } from "./store";

// Deterministic v1 mastery rules (docs/product/feature_specification.md §156). Pure — no I/O —
// so the transitions are unit-testable. Tunable "tacit" knobs live here.

export type ConceptEvidence = { correct: number; total: number };
export type MasteryUpdate = { conceptId: string; status: MasteryStatus; score: number };

const MASTERED_RATIO = 0.8;
const LEARNING_RATIO = 0.4;
const MASTERED_MIN_QUESTIONS = 3;

/** Status implied purely by this lesson's quiz performance on a concept. */
function baseStatus(ev: ConceptEvidence): MasteryStatus {
  const ratio = ev.correct / ev.total;
  const allCorrect = ev.correct === ev.total;
  if (allCorrect && ev.total >= MASTERED_MIN_QUESTIONS) return "mastered";
  if (ev.total >= MASTERED_MIN_QUESTIONS && ratio >= MASTERED_RATIO) return "mastered";
  if (ratio >= LEARNING_RATIO) return "learning";
  return "weak";
}

/**
 * Compute concept-level mastery updates from this lesson's quiz evidence and the
 * learner's current state. Only concepts with evidence (total > 0) produce an
 * update; untested concepts are left untouched. Downgrade rule: a concept that
 * was `mastered` and got any answer wrong this lesson drops to `learning`.
 */
export function computeMasteryUpdates(
  evidenceByConcept: Map<string, ConceptEvidence>,
  currentStateByConcept: Map<string, MasteryStatus>,
): MasteryUpdate[] {
  const updates: MasteryUpdate[] = [];
  for (const [conceptId, ev] of evidenceByConcept) {
    if (ev.total <= 0) continue;
    const score = ev.correct / ev.total;
    const hadWrong = ev.correct < ev.total;
    const current = currentStateByConcept.get(conceptId);
    const status: MasteryStatus = hadWrong && current === "mastered" ? "learning" : baseStatus(ev);
    updates.push({ conceptId, status, score });
  }
  return updates;
}
