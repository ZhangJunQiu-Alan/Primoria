import { and, eq } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "../db/client";
import { userConceptMastery } from "../db/schema";
import type { ConceptMastery, MasteryStatus } from "./store";

// Owner-scoped concept-mastery access for the learning-progress worker, which
// runs with an explicit ownerId and has no request session (the session-scoped
// reads in ./store.ts cannot be used there). Backed by the Drizzle/postgres
// client like the rest of the job system.

export async function listConceptMasteryByOwner(ownerId: string, graphId: string): Promise<ConceptMastery[]> {
  if (!ownerId || !hasDatabaseUrl()) return [];
  const rows = await getDb()
    .select()
    .from(userConceptMastery)
    .where(and(eq(userConceptMastery.ownerId, ownerId), eq(userConceptMastery.graphId, graphId)));
  return rows.map((row) => ({
    graphId: row.graphId,
    conceptId: row.conceptId,
    status: row.status as MasteryStatus,
    score: row.score === null ? null : Number(row.score),
    updatedAt: row.updatedAt.getTime(),
  }));
}

export async function upsertConceptMasteryByOwner(
  ownerId: string,
  graphId: string,
  conceptId: string,
  status: MasteryStatus,
  score: number | null = null,
): Promise<void> {
  if (!ownerId || !hasDatabaseUrl()) return;
  const now = new Date();
  await getDb()
    .insert(userConceptMastery)
    .values({ ownerId, graphId, conceptId, status, score, updatedAt: now })
    .onConflictDoUpdate({
      target: [userConceptMastery.ownerId, userConceptMastery.graphId, userConceptMastery.conceptId],
      set: { status, score, updatedAt: now },
    });
}
