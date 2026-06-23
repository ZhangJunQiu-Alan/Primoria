import { supabaseEnv } from "@/lib/supabase/env";
import { createClient, getUser } from "@/lib/supabase/server";

// Per-user concept mastery (public.user_concept_mastery, RLS-scoped to
// auth.users). Feeds the cold-start lazy-diagnosis / adaptive path. Owner is
// resolved internally from the request session; no-ops/empty when auth is not
// configured or there is no signed-in user.

export type MasteryStatus = "untested" | "weak" | "learning" | "mastered";

export type ConceptMastery = {
  graphId: string;
  conceptId: string;
  status: MasteryStatus;
  score: number | null;
  updatedAt: number;
};

const TABLE = "user_concept_mastery";

type MasteryRow = {
  graph_id: string;
  concept_id: string;
  status: MasteryStatus;
  score: number | null;
  updated_at: string;
};

async function resolveOwner(): Promise<string | null> {
  if (!supabaseEnv()) return null;
  const user = await getUser();
  return user?.id ?? null;
}

export async function listConceptMastery(graphId: string): Promise<ConceptMastery[]> {
  const owner = await resolveOwner();
  if (!owner) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("graph_id, concept_id, status, score, updated_at")
    .eq("owner_id", owner)
    .eq("graph_id", graphId);
  if (error) throw new Error(`Failed to load mastery: ${error.message}`);

  return (data as MasteryRow[]).map((row) => ({
    graphId: row.graph_id,
    conceptId: row.concept_id,
    status: row.status,
    score: row.score,
    updatedAt: new Date(row.updated_at).getTime(),
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

  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).upsert({
    owner_id: owner,
    graph_id: graphId,
    concept_id: conceptId,
    status,
    score,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Failed to save mastery: ${error.message}`);
}
