import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { learningEvents } from "../db/schema";
import { getCourse } from "./store";
import { getTopic } from "../knowledge-graph/topic-graph";
import { ContextError, LeaseLostError } from "../ai/course-generation/generation-errors";
import { listConceptMasteryByOwner, upsertConceptMasteryByOwner } from "../mastery/owner-store";
import { computeMasteryUpdates, type ConceptEvidence } from "../mastery/rules";
import type { MasteryStatus } from "../mastery/store";
import { decideNextStep } from "./learning-progress-decider";
import {
  completeLearningProgressJobWithDecision,
  updateLearningProgressStage,
  type LearningProgressClaim,
} from "./learning-progress-jobs";

// Two-stage orchestration run for one claimed job (feature_specification.md §163):
// ① update concept mastery from this lesson's quiz evidence, then ② decide the
// next step and record it as a pending recommendation. Both stages are idempotent
// (mastery upsert + deterministic decision) so a crashed worker simply re-runs.

export type LearningProgressOutcome = {
  ownerId: string;
  courseId: string;
  lessonId: string;
  decisionKind: string;
};

/** Read this lesson's per-concept quiz evidence from learning_events. Only
 * concept-tagged questions contribute (conceptId is null until quiz prompts emit
 * tags — in which case the mastery stage has no evidence and we recommend next). */
async function loadQuizEvidence(ownerId: string, lessonId: string): Promise<Map<string, ConceptEvidence>> {
  const rows = await getDb()
    .select()
    .from(learningEvents)
    .where(and(eq(learningEvents.ownerId, ownerId), eq(learningEvents.lessonId, lessonId), eq(learningEvents.type, "quiz.submit")));
  const evidence = new Map<string, ConceptEvidence>();
  for (const row of rows) {
    const conceptId = row.conceptId;
    if (!conceptId) continue;
    const payload = row.payload as { is_correct?: boolean };
    const entry = evidence.get(conceptId) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (payload?.is_correct) entry.correct += 1;
    evidence.set(conceptId, entry);
  }
  return evidence;
}

export async function processLearningProgressJob(claim: LearningProgressClaim): Promise<LearningProgressOutcome> {
  const { id: jobId, ownerId, courseId, lessonId } = claim.job;
  const fence = { jobId, workerId: claim.workerId, leaseToken: claim.leaseToken };

  const course = await getCourse(courseId, ownerId);
  if (!course) throw new ContextError(`course ${courseId} not found for owner`);
  const lesson = course.lessons.find((entry) => entry.id === lessonId);
  if (!lesson) throw new ContextError(`lesson ${lessonId} not found in course ${courseId}`);
  const graphId = course.graphId;
  const topicId = lesson.topicId;
  if (!graphId || !topicId) throw new ContextError(`lesson ${lessonId} has no knowledge-graph anchor`);
  if (!getTopic(graphId, topicId)) throw new ContextError(`topic ${topicId} not found in graph ${graphId}`);

  // ── Stage ①: mastery update ────────────────────────────────────────────────
  await updateLearningProgressStage(fence, "mastery");
  const evidence = await loadQuizEvidence(ownerId, lessonId);
  const currentList = await listConceptMasteryByOwner(ownerId, graphId);
  const currentState = new Map<string, MasteryStatus>(currentList.map((m) => [m.conceptId, m.status]));
  const updates = computeMasteryUpdates(evidence, currentState);
  for (const update of updates) {
    await upsertConceptMasteryByOwner(ownerId, graphId, update.conceptId, update.status, update.score);
  }

  // ── Stage ②: diagnosis + decision ──────────────────────────────────────────
  await updateLearningProgressStage(fence, "deciding");
  const masteryByConcept = new Map(currentState);
  for (const update of updates) masteryByConcept.set(update.conceptId, update.status);

  const sorted = [...course.lessons].sort((a, b) => a.sortKey - b.sortKey);
  const currentIndex = sorted.findIndex((entry) => entry.id === lessonId);
  const nextLessonSortKey = currentIndex >= 0 && sorted[currentIndex + 1] ? sorted[currentIndex + 1].sortKey : null;

  const decision = decideNextStep({
    graphId,
    currentTopicId: topicId,
    currentLessonSortKey: lesson.sortKey,
    nextLessonSortKey,
    masteryByConcept,
  });

  const result = await completeLearningProgressJobWithDecision(fence, decision);
  if (!result.ok) {
    // Lost the lease between stages — abandon without writing (expiry recovers).
    throw new LeaseLostError("lease lost before recording decision");
  }

  return { ownerId, courseId, lessonId, decisionKind: decision.kind };
}
