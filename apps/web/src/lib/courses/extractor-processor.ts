import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../db/client";
import { copilotChatMessages, learningEvents } from "../db/schema";
import { getCourse } from "./store";
import { getTopic } from "../knowledge-graph/topic-graph";
import { ContextError, LeaseLostError } from "../ai/course-generation/generation-errors";
import { listAllFactsForExtraction, applyFactPlan, planFactMutations } from "../learner-facts/store";
import { distillFacts, type DistillEvent } from "../ai/extractor/distill";
import { completeExtractorJob, completeExtractorJobTx, type ExtractorClaim } from "./extractor-jobs";

// One distillation run for a claimed Extractor job: read this lesson's activity
// from learning_events (chat feedback/questions + quiz outcomes), let the model
// distill durable learner facts, and apply them (idempotent on re-run). The job
// is fenced — if the lease was lost mid-run, completion is a no-op and expiry
// recovers it.

export type ExtractorOutcome = { ownerId: string; lessonId: string; added: number; reinforced: number; skipped: number };

const EVENT_TYPES = ["chat.feedback", "chat.question", "quiz.submit"] as const;

function snippet(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

// Feedback is append-only, so switching 👍→👎 leaves two rows for one message.
// Keep only the latest event per target message (by createdAt) so the distiller
// sees the learner's current opinion, never a positive+negative contradiction.
export function pickLatestFeedbackEventIds(
  feedback: { id: string; targetMessageId: string | null; createdAt: number }[],
): Set<string> {
  const latest = new Map<string, { id: string; createdAt: number }>();
  for (const f of feedback) {
    const key = f.targetMessageId ?? f.id;
    const prev = latest.get(key);
    if (!prev || f.createdAt >= prev.createdAt) latest.set(key, { id: f.id, createdAt: f.createdAt });
  }
  return new Set([...latest.values()].map((v) => v.id));
}

// Injectable for tests; defaults to the real model-backed distiller.
export type ExtractorDeps = { distill: typeof distillFacts };

export async function processExtractorJob(claim: ExtractorClaim, deps: ExtractorDeps = { distill: distillFacts }): Promise<ExtractorOutcome> {
  const { id: jobId, ownerId, courseId, lessonId } = claim.job;
  const fence = { jobId, workerId: claim.workerId, leaseToken: claim.leaseToken };

  const course = await getCourse(courseId, ownerId);
  if (!course) throw new ContextError(`course ${courseId} not found for owner`);
  const lesson = course.lessons.find((entry) => entry.id === lessonId);
  if (!lesson) throw new ContextError(`lesson ${lessonId} not found in course ${courseId}`);
  const graphId = course.graphId;
  const topicId = lesson.topicId;
  if (!graphId || !topicId) throw new ContextError(`lesson ${lessonId} has no knowledge-graph anchor`);
  const topic = getTopic(graphId, topicId);
  if (!topic) throw new ContextError(`topic ${topicId} not found in graph ${graphId}`);

  // ── Gather this lesson's window events ──────────────────────────────────────
  const rows = await getDb()
    .select()
    .from(learningEvents)
    .where(and(eq(learningEvents.ownerId, ownerId), eq(learningEvents.lessonId, lessonId), inArray(learningEvents.type, EVENT_TYPES as unknown as string[])));

  // Resolve chat bodies referenced by pointer (question message_id, feedback
  // target_message_id) in one batched read.
  const messageIds = new Set<string>();
  for (const row of rows) {
    const p = row.payload as Record<string, unknown>;
    if (row.type === "chat.question" && typeof p.message_id === "string") messageIds.add(p.message_id);
    if (row.type === "chat.feedback" && typeof p.target_message_id === "string") messageIds.add(p.target_message_id);
  }
  const bodyById = new Map<string, string>();
  if (messageIds.size > 0) {
    const messages = await getDb()
      .select({ id: copilotChatMessages.id, content: copilotChatMessages.content })
      .from(copilotChatMessages)
      .where(and(eq(copilotChatMessages.ownerId, ownerId), inArray(copilotChatMessages.id, [...messageIds])));
    for (const m of messages) bodyById.set(m.id, m.content);
  }

  // Resolve the current feedback per target message (latest wins) — drop
  // superseded thumbs so 👍→👎 does not surface as a contradiction.
  const liveFeedbackIds = pickLatestFeedbackEventIds(
    rows
      .filter((row) => row.type === "chat.feedback")
      .map((row) => ({
        id: row.id,
        targetMessageId: typeof (row.payload as Record<string, unknown>).target_message_id === "string" ? String((row.payload as Record<string, unknown>).target_message_id) : null,
        createdAt: row.createdAt.getTime(),
      })),
  );

  const events: DistillEvent[] = [];
  for (const row of rows) {
    const p = row.payload as Record<string, unknown>;
    if (row.type === "chat.feedback") {
      if (!liveFeedbackIds.has(row.id)) continue; // superseded by a later thumb
      const body = typeof p.target_message_id === "string" ? bodyById.get(p.target_message_id) : undefined;
      events.push({ id: row.id, kind: "chat.feedback", summary: `${String(p.signal ?? "?")} feedback on assistant reply${body ? `: "${snippet(body)}"` : ""}` });
    } else if (row.type === "chat.question") {
      const body = typeof p.message_id === "string" ? bodyById.get(p.message_id) : undefined;
      events.push({ id: row.id, kind: "chat.question", summary: body ? `asked: "${snippet(body)}"` : "asked a question" });
    } else if (row.type === "quiz.submit") {
      const verdict = p.is_correct ? "correct" : "wrong";
      const distractor = typeof p.distractor_tag === "string" && p.distractor_tag ? `, chose distractor "${p.distractor_tag}"` : "";
      events.push({ id: row.id, kind: "quiz.submit", summary: `quiz on concept ${row.conceptId ?? "?"}: ${verdict}${distractor}` });
    }
  }

  // Nothing happened this lesson — complete the job without calling the model.
  if (events.length === 0) {
    const done = await completeExtractorJob(fence);
    if (!done.ok) throw new LeaseLostError("lease lost before completing empty extraction");
    return { ownerId, lessonId, added: 0, reinforced: 0, skipped: 0 };
  }

  const existingFacts = await listAllFactsForExtraction(ownerId);
  const ops = await deps.distill({
    ctx: { topicName: topic.name, conceptNames: topic.conceptIds.map((c) => c.name), events, existingFacts },
    lessonId,
  });

  // Atomic + fenced: mark the job complete and write the facts in ONE
  // transaction. The fenced UPDATE matches 0 rows if the lease was lost (worker
  // re-claimed, lease expired) — then the whole transaction rolls back and NO
  // facts are written, so a retry re-distills against a clean slate instead of
  // inserting near-duplicate facts.
  const applied = await getDb().transaction(async (tx) => {
    if (!(await completeExtractorJobTx(tx, fence))) return null;
    const current = await listAllFactsForExtraction(ownerId, tx);
    const plan = planFactMutations(current, ops);
    await applyFactPlan(tx, ownerId, plan);
    return plan;
  });
  if (!applied) throw new LeaseLostError("lease lost before recording extraction");
  return { ownerId, lessonId, added: applied.added, reinforced: applied.reinforced, skipped: applied.skipped };
}
