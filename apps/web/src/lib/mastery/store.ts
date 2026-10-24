import { and, eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/session";
import { getDb, hasDatabaseUrl } from "@/lib/db/client";
import { masteryTableFor } from "@/lib/mastery/owner-store";

// Per-user concept mastery in app-owned Postgres. Owner is resolved internally
// from the request session; no-ops/empty when auth is not configured or there is
// no signed-in user.

export type MasteryStatus = "untested" | "weak" | "learning" | "mastered";

export type ConceptMastery = {
  graphId: string;
  conceptId: string;
  status: MasteryStatus;
  score: number | null;
  updatedAt: number;
};

async function resolveOwner(): Promise<string | null> {
  if (!hasDatabaseUrl()) return null;
  const user = await getCurrentUser();
  return user?.id ?? null;
}

export async function listConceptMastery(graphId: string): Promise<ConceptMastery[]> {
  const owner = await resolveOwner();
  if (!owner) return [];

  const table = masteryTableFor(graphId);
  const rows = await getDb()
    .select()
    .from(table)
    .where(and(eq(table.ownerId, owner), eq(table.graphId, graphId)));

  return rows.map((row) => ({
    graphId: row.graphId,
    conceptId: row.conceptId,
    status: row.status as MasteryStatus,
    score: row.score,
    updatedAt: row.updatedAt.getTime(),
  }));
}

export async function upsertConceptMastery(
  graphId: string,
  conceptId: string,
  status: MasteryStatus,
  score: number | null = null,
): Promise<void> {
  const owner = await resolveOwner();
  if (!owner) return;

  const now = new Date();
  const table = masteryTableFor(graphId);
  await getDb()
    .insert(table)
    .values({ ownerId: owner, graphId, conceptId, status, score, updatedAt: now })
    .onConflictDoUpdate({
      target: [table.ownerId, table.graphId, table.conceptId],
      set: { status, score, updatedAt: now },
    });
}
