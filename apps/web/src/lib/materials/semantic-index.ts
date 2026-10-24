import { after } from "next/server";
import { sql } from "drizzle-orm";

import { getDb } from "../db/client";
import {
  createKnowledgeGraphEmbedding,
  createKnowledgeGraphEmbeddings,
  getKnowledgeGraphEmbeddingModelVersion,
  isKnowledgeGraphEmbeddingConfigured,
  toPgVectorLiteral,
} from "../knowledge-graph/embeddings";
import type { MaterialChunkRef } from "./types";

// Semantic index over material chunks (public.material_chunk_embeddings, owned
// by KG SQL migration 0003). Indexing is best-effort and never blocks an upload
// or a Tutor answer: unindexed chunks still match lexically, and every caller
// treats a failure here as "no vector hits".

const EMBED_BATCH_SIZE = 16;
const EMBED_TEXT_MAX_CHARS = 2_000;
const INDEX_PASS_MAX_CHUNKS = 400;

export type MaterialEmbeddingDeps = {
  embedBatch: (inputs: string[]) => Promise<number[][]>;
  embedQuery: (input: string) => Promise<number[]>;
  modelVersion: () => string;
};

export const defaultEmbeddingDeps: MaterialEmbeddingDeps = {
  embedBatch: (inputs) => createKnowledgeGraphEmbeddings(inputs, "db"),
  embedQuery: (input) => createKnowledgeGraphEmbedding(input, "query"),
  modelVersion: getKnowledgeGraphEmbeddingModelVersion,
};

export function chunkEmbedText(chunk: { heading: string | null; text: string }): string {
  const body = chunk.heading && !chunk.text.startsWith(chunk.heading) ? `${chunk.heading}\n${chunk.text}` : chunk.text;
  return body.slice(0, EMBED_TEXT_MAX_CHARS);
}

type PendingChunk = { material_id: string; ordinal: number; text: string; heading: string | null };

/** Embed up to INDEX_PASS_MAX_CHUNKS not-yet-indexed chunks of these materials
 * for the current embedding model. Idempotent: concurrent passes collapse on
 * the primary key. Returns how many chunks were written. */
export async function indexMaterialChunks(
  input: { ownerId: string; materialIds: string[] },
  deps: MaterialEmbeddingDeps = defaultEmbeddingDeps,
): Promise<number> {
  if (input.materialIds.length === 0) return 0;
  const modelVersion = deps.modelVersion();
  const pending = (await getDb().execute(sql`
    select c.material_id, c.ordinal, c.text, c.heading
    from public.learning_material_chunks c
    left join public.material_chunk_embeddings e
      on e.material_id = c.material_id and e.ordinal = c.ordinal and e.model_version = ${modelVersion}
    where c.owner_id = ${input.ownerId}
      and c.material_id in ${input.materialIds}
      and e.material_id is null
    order by c.material_id, c.ordinal
    limit ${INDEX_PASS_MAX_CHUNKS}
  `)) as unknown as PendingChunk[];

  let written = 0;
  for (let i = 0; i < pending.length; i += EMBED_BATCH_SIZE) {
    const batch = pending.slice(i, i + EMBED_BATCH_SIZE);
    const vectors = await deps.embedBatch(batch.map((chunk) => chunkEmbedText(chunk)));
    const values = batch.map((chunk, index) =>
      sql`(${chunk.material_id}, ${chunk.ordinal}, ${input.ownerId}, ${modelVersion}, ${toPgVectorLiteral(vectors[index])}::vector)`,
    );
    await getDb().execute(sql`
      insert into public.material_chunk_embeddings (material_id, ordinal, owner_id, model_version, embedding)
      values ${sql.join(values, sql`, `)}
      on conflict do nothing
    `);
    written += batch.length;
  }
  return written;
}

/** Run an index pass after the current response, when an embedding provider
 * is configured. Outside a request scope (scripts, tests) it does nothing. */
export function scheduleMaterialIndexing(ownerId: string, materialIds: string[]): void {
  if (materialIds.length === 0 || !isKnowledgeGraphEmbeddingConfigured()) return;
  try {
    after(() =>
      indexMaterialChunks({ ownerId, materialIds }).catch((error) => {
        console.warn("[materials] semantic indexing failed:", error instanceof Error ? error.message : error);
      }),
    );
  } catch {
    // no request scope
  }
}

export type VectorHit = MaterialChunkRef & { similarity: number };

/** Nearest chunks to `question` within the owner's materials, plus whether
 * any chunk of those materials is still unindexed. */
export async function searchMaterialChunks(
  input: { ownerId: string; materialIds: string[]; question: string; limit: number },
  deps: MaterialEmbeddingDeps = defaultEmbeddingDeps,
): Promise<{ hits: VectorHit[]; unindexed: boolean }> {
  if (input.materialIds.length === 0 || !input.question.trim()) return { hits: [], unindexed: false };
  const modelVersion = deps.modelVersion();
  const vector = toPgVectorLiteral(await deps.embedQuery(input.question.slice(0, EMBED_TEXT_MAX_CHARS)));
  const [rows, missing] = await Promise.all([
    getDb().execute(sql`
      select material_id, ordinal, (1 - (embedding <=> ${vector}::vector))::float8 as similarity
      from public.material_chunk_embeddings
      where owner_id = ${input.ownerId}
        and material_id in ${input.materialIds}
        and model_version = ${modelVersion}
      order by embedding <=> ${vector}::vector
      limit ${input.limit}
    `),
    getDb().execute(sql`
      select exists (
        select 1 from public.learning_material_chunks c
        left join public.material_chunk_embeddings e
          on e.material_id = c.material_id and e.ordinal = c.ordinal and e.model_version = ${modelVersion}
        where c.owner_id = ${input.ownerId} and c.material_id in ${input.materialIds} and e.material_id is null
      ) as missing
    `),
  ]);
  const hits = (rows as unknown as { material_id: string; ordinal: number; similarity: number }[]).map((row) => ({
    materialId: row.material_id,
    ordinal: Number(row.ordinal),
    similarity: Number(row.similarity),
  }));
  return { hits, unindexed: Boolean((missing as unknown as { missing: boolean }[])[0]?.missing) };
}
