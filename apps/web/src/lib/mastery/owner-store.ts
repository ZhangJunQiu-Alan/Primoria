import { and, eq } from "drizzle-orm";
import { getDb, hasDatabaseUrl, type DbOrTx } from "../db/client";
import { materialConceptMastery, userConceptMastery } from "../db/schema";
import { isMaterialGraphId } from "../materials/types";
import type { ConceptMastery, MasteryStatus } from "./store";

/** Owner-private mat_* concepts are not in the library KG tables that
 * user_concept_mastery references, so their mastery has its own table with
 * identical columns. */
export function masteryTableFor(graphId: string): typeof userConceptMastery {
  return (isMaterialGraphId(graphId) ? materialConceptMastery : userConceptMastery) as typeof userConceptMastery;
}

// Owner-scoped concept-mastery access for the learning-progress worker, which
// runs with an explicit ownerId and has no request session (the session-scoped
// reads in ./store.ts cannot be used there). Backed by the Drizzle/postgres
// client like the rest of the job system.

export async function listConceptMasteryByOwner(ownerId: string, graphId: string): Promise<ConceptMastery[]> {
  if (!ownerId || !hasDatabaseUrl()) return [];
  const table = masteryTableFor(graphId);
  const rows = await getDb()
    .select()
    .from(table)
    .where(and(eq(table.ownerId, ownerId), eq(table.graphId, graphId)));
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
  db: DbOrTx = getDb(),
): Promise<void> {
  if (!ownerId || !hasDatabaseUrl()) return;
  const now = new Date();
  const table = masteryTableFor(graphId);
  await db
    .insert(table)
    .values({ ownerId, graphId, conceptId, status, score, updatedAt: now })
    .onConflictDoUpdate({
      target: [table.ownerId, table.graphId, table.conceptId],
      set: { status, score, updatedAt: now },
    });
}
