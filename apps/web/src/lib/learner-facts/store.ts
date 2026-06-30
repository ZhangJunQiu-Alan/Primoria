import { and, desc, eq } from "drizzle-orm";
import { getDb, hasDatabaseUrl, type DbOrTx } from "../db/client";
import { learnerFacts } from "../db/schema";
import type { FactCategory, FactEvidence, LearnerFact } from "../learner-profile/types";

// Owner-scoped access to distilled learner facts. Written from the Extractor
// worker (explicit ownerId, no request session); read by lesson generation, the
// tutor route, and the Settings "Facts About You" surface. Mirrors the
// owner-store pattern used for concept mastery.

// One resolved op from the distiller. `skip` never reaches the store (it is a
// no-op the distiller resolves), but is kept in the union so callers can pass the
// full result through without filtering.
export type FactExtractionOp =
  | { op: "add"; text: string; category: FactCategory; confidence?: number | null; evidence: FactEvidence }
  | { op: "reinforce"; factId: string; confidence?: number | null; evidence: FactEvidence }
  | { op: "skip" };

function randomId() {
  return `fact_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function normalizeFactText(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

// Planned mutation for one op, decided purely from the current facts. Pure so the
// dedup/idempotency rules are unit-testable without a database.
export type FactMutation =
  | { kind: "insert"; text: string; category: FactCategory; confidence: number | null; evidence: FactEvidence }
  | { kind: "update"; factId: string; occurrences: number; evidence: FactEvidence[]; confidence: number | null; sourceLessonId: string | null }
  | { kind: "skip" };

export type FactPlan = { mutations: FactMutation[]; added: number; reinforced: number; skipped: number };

// Decide what each op becomes given the current facts:
//  - add → skip if an existing fact (active OR dismissed tombstone) has the same
//    normalized text; otherwise insert.
//  - reinforce → skip if the fact is missing/dismissed, or already has evidence
//    for this lessonId (re-run guard); otherwise bump occurrences + append.
export function planFactMutations(existing: LearnerFact[], ops: FactExtractionOp[]): FactPlan {
  const byId = new Map(existing.map((f) => [f.id, f]));
  // Track normalized text seen so duplicate adds within one batch also collapse.
  const seenNorm = new Map(existing.map((f) => [normalizeFactText(f.text), f] as const));
  const occByIdInBatch = new Map<string, number>();
  const evByIdInBatch = new Map<string, FactEvidence[]>();
  const mutations: FactMutation[] = [];
  let added = 0;
  let reinforced = 0;
  let skipped = 0;

  for (const op of ops) {
    if (op.op === "skip") {
      mutations.push({ kind: "skip" });
      skipped += 1;
      continue;
    }

    if (op.op === "add") {
      const norm = normalizeFactText(op.text);
      if (seenNorm.has(norm)) {
        mutations.push({ kind: "skip" });
        skipped += 1;
        continue;
      }
      seenNorm.set(norm, { text: op.text } as LearnerFact);
      mutations.push({ kind: "insert", text: op.text, category: op.category, confidence: op.confidence ?? null, evidence: op.evidence });
      added += 1;
      continue;
    }

    // reinforce
    const target = byId.get(op.factId);
    if (!target || target.status !== "active") {
      mutations.push({ kind: "skip" });
      skipped += 1;
      continue;
    }
    const baseEvidence = evByIdInBatch.get(op.factId) ?? target.evidence;
    if (baseEvidence.some((e) => e.lessonId === op.evidence.lessonId)) {
      mutations.push({ kind: "skip" });
      skipped += 1;
      continue;
    }
    const baseOcc = occByIdInBatch.get(op.factId) ?? target.occurrences;
    const nextEvidence = [...baseEvidence, op.evidence];
    const nextOcc = baseOcc + 1;
    occByIdInBatch.set(op.factId, nextOcc);
    evByIdInBatch.set(op.factId, nextEvidence);
    mutations.push({
      kind: "update",
      factId: op.factId,
      occurrences: nextOcc,
      evidence: nextEvidence,
      confidence: op.confidence ?? target.confidence,
      sourceLessonId: op.evidence.lessonId ?? target.sourceLessonId,
    });
    reinforced += 1;
  }

  return { mutations, added, reinforced, skipped };
}

function rowToFact(row: typeof learnerFacts.$inferSelect): LearnerFact {
  return {
    id: row.id,
    ownerId: row.ownerId,
    text: row.text,
    category: row.category as FactCategory,
    status: row.status as "active" | "dismissed",
    confidence: row.confidence === null ? null : Number(row.confidence),
    evidence: Array.isArray(row.evidence) ? (row.evidence as FactEvidence[]) : [],
    occurrences: row.occurrences,
    sourceLessonId: row.sourceLessonId,
    lastSeenAt: row.lastSeenAt ? row.lastSeenAt.toISOString() : null,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

export async function listActiveFacts(ownerId: string): Promise<LearnerFact[]> {
  if (!ownerId || !hasDatabaseUrl()) return [];
  const rows = await getDb()
    .select()
    .from(learnerFacts)
    .where(and(eq(learnerFacts.ownerId, ownerId), eq(learnerFacts.status, "active")))
    .orderBy(desc(learnerFacts.lastSeenAt));
  return rows.map(rowToFact);
}

// Every fact (active + dismissed) so the distiller can reinforce existing facts
// and avoid re-creating ones the learner has dismissed. Accepts an optional
// executor so it can read the current state inside the apply transaction.
export async function listAllFactsForExtraction(ownerId: string, executor: DbOrTx = getDb()): Promise<LearnerFact[]> {
  if (!ownerId || !hasDatabaseUrl()) return [];
  const rows = await executor.select().from(learnerFacts).where(eq(learnerFacts.ownerId, ownerId));
  return rows.map(rowToFact);
}

// Execute a planned set of mutations on a caller-supplied executor (db or tx).
export async function applyFactPlan(executor: DbOrTx, ownerId: string, plan: FactPlan): Promise<void> {
  const now = new Date();
  for (const m of plan.mutations) {
    if (m.kind === "insert") {
      await executor.insert(learnerFacts).values({
        id: randomId(),
        ownerId,
        text: m.text,
        category: m.category,
        status: "active",
        confidence: m.confidence,
        evidence: [m.evidence],
        occurrences: 1,
        sourceLessonId: m.evidence.lessonId,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      });
    } else if (m.kind === "update") {
      await executor
        .update(learnerFacts)
        .set({
          occurrences: m.occurrences,
          evidence: m.evidence,
          confidence: m.confidence,
          sourceLessonId: m.sourceLessonId,
          lastSeenAt: now,
          updatedAt: now,
        })
        .where(and(eq(learnerFacts.ownerId, ownerId), eq(learnerFacts.id, m.factId)));
    }
  }
}

export async function dismissFact(ownerId: string, factId: string): Promise<void> {
  if (!ownerId || !hasDatabaseUrl()) return;
  await getDb()
    .update(learnerFacts)
    .set({ status: "dismissed", updatedAt: new Date() })
    .where(and(eq(learnerFacts.ownerId, ownerId), eq(learnerFacts.id, factId)));
}

// Apply the distiller's resolved ops. Idempotent against job re-runs: a reinforce
// is skipped if the fact already has an evidence entry for this lessonId, and an
// add is skipped if an existing fact (active OR dismissed — the dismissed
// tombstone) has the same normalized text. Semantic dedup is the distiller's job;
// this is the code-level backstop.
export async function applyExtractionResult(
  ownerId: string,
  ops: FactExtractionOp[],
): Promise<{ added: number; reinforced: number; skipped: number }> {
  if (!ownerId || !hasDatabaseUrl()) return { added: 0, reinforced: 0, skipped: ops.length };

  const existing = await listAllFactsForExtraction(ownerId);
  const plan = planFactMutations(existing, ops);
  await applyFactPlan(getDb(), ownerId, plan);
  return { added: plan.added, reinforced: plan.reinforced, skipped: plan.skipped };
}
