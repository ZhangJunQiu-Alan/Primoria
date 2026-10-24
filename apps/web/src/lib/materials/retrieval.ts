import type { LearningMaterialChunkRow } from "../db/schema";
import { formatPageLocator } from "./material-graph";
import type { MaterialGraphRecord } from "./material-graph-store";
import { defaultEmbeddingDeps, scheduleMaterialIndexing, searchMaterialChunks, type MaterialEmbeddingDeps } from "./semantic-index";
import { getMaterialsByIds, listMaterialChunks } from "./store";
import type { MaterialChunkRef } from "./types";

// Course Tutor retrieval over a material course's own chunks
// (docs/product/learning-materials.md §7 phase 2). Three signals are fused with
// reciprocal-rank fusion: lexical BM25 (exact terms, formulas, names; always
// available), pgvector similarity (paraphrase and cross-language questions;
// best-effort), and the chunks the current lesson's concepts cite (a prior that
// keeps "explain this" questions anchored to what the learner is reading).

export type AnswerExcerpt = {
  /** Prompt-local label ("M1"); the Tutor is told never to print it. */
  label: string;
  materialId: string;
  ordinal: number;
  materialTitle: string;
  locator: string | null;
  heading: string | null;
  text: string;
};

export const ANSWER_EXCERPT_LIMIT = 6;
export const ANSWER_EXCERPT_BUDGET_CHARS = 6_000;
const SIGNAL_DEPTH = 12;
const RRF_K = 60;
const MIN_VECTOR_SIMILARITY = 0.2;
const VECTOR_TIMEOUT_MS = 3_000;
const PRIOR_REFS_PER_CONCEPT = 3;

const keyOf = (ref: MaterialChunkRef) => `${ref.materialId}#${ref.ordinal}`;

/** Latin/digit words plus CJK character bigrams (unigrams for a lone CJK
 * character), so Chinese text matches without a segmenter. */
export function lexicalTokens(text: string): string[] {
  const tokens: string[] = [];
  const normalized = text.normalize("NFKC").toLowerCase();
  for (const word of normalized.match(/[a-z0-9]+(?:['’][a-z]+)?/g) ?? []) {
    if (word.length >= 2 || /\d/.test(word)) tokens.push(word);
  }
  for (const run of normalized.match(/[㐀-䶿一-鿿]+/gu) ?? []) {
    if (run.length === 1) tokens.push(run);
    for (let i = 0; i + 1 < run.length; i += 1) tokens.push(run.slice(i, i + 2));
  }
  return tokens;
}

/** BM25 (k1 = 1.2, b = 0.75) over the given documents; only positive scores,
 * best first. */
export function rankLexical(query: string, docs: { key: string; text: string }[]): { key: string; score: number }[] {
  const queryTerms = [...new Set(lexicalTokens(query))];
  if (queryTerms.length === 0 || docs.length === 0) return [];
  const termFreqs = docs.map((doc) => {
    const counts = new Map<string, number>();
    const tokens = lexicalTokens(doc.text);
    for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
    return { key: doc.key, counts, length: tokens.length };
  });
  const avgLength = termFreqs.reduce((total, doc) => total + doc.length, 0) / termFreqs.length || 1;
  const docFreq = new Map<string, number>();
  for (const term of queryTerms) docFreq.set(term, termFreqs.filter((doc) => doc.counts.has(term)).length);

  const k1 = 1.2;
  const b = 0.75;
  return termFreqs
    .map((doc) => {
      let score = 0;
      for (const term of queryTerms) {
        const tf = doc.counts.get(term) ?? 0;
        if (tf === 0) continue;
        const df = docFreq.get(term) ?? 0;
        const idf = Math.log(1 + (termFreqs.length - df + 0.5) / (df + 0.5));
        score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * doc.length) / avgLength)));
      }
      return { key: doc.key, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b2) => b2.score - a.score);
}

/** Weighted reciprocal-rank fusion of ranked key lists, best first. */
export function fuseRankings(lists: { keys: string[]; weight: number }[], k = RRF_K): string[] {
  const scores = new Map<string, number>();
  for (const list of lists) {
    list.keys.forEach((key, rank) => scores.set(key, (scores.get(key) ?? 0) + list.weight / (k + rank + 1)));
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key);
}

type RetrievalChunk = Pick<LearningMaterialChunkRow, "materialId" | "ordinal" | "text" | "heading" | "pageStart" | "pageEnd">;

/** Pure: fuse the three signals and cut labelled excerpts to the budget. */
export function selectAnswerExcerpts(input: {
  question: string;
  chunks: RetrievalChunk[];
  vectorRefs: MaterialChunkRef[];
  priorRefs: MaterialChunkRef[];
  materialTitles: Map<string, string>;
  language: "zh" | "en";
  limit?: number;
  budget?: number;
}): AnswerExcerpt[] {
  const chunkByKey = new Map(input.chunks.map((chunk) => [keyOf(chunk), chunk]));
  const lexical = rankLexical(
    input.question,
    input.chunks.map((chunk) => ({ key: keyOf(chunk), text: chunk.heading ? `${chunk.heading}\n${chunk.text}` : chunk.text })),
  ).slice(0, SIGNAL_DEPTH);
  const ranked = fuseRankings([
    { keys: lexical.map((entry) => entry.key), weight: 1 },
    { keys: input.vectorRefs.map(keyOf), weight: 1 },
    // A prior, not a match: it ranks below a chunk that matches the question
    // on either signal, but fills the context for short deictic questions.
    { keys: input.priorRefs.map(keyOf), weight: 0.5 },
  ]);

  const out: AnswerExcerpt[] = [];
  let remaining = input.budget ?? ANSWER_EXCERPT_BUDGET_CHARS;
  for (const key of ranked) {
    if (out.length >= (input.limit ?? ANSWER_EXCERPT_LIMIT) || remaining < 200) break;
    const chunk = chunkByKey.get(key);
    if (!chunk) continue;
    const text = chunk.text.length > remaining ? `${chunk.text.slice(0, remaining)}…` : chunk.text;
    remaining -= text.length;
    out.push({
      label: `M${out.length + 1}`,
      materialId: chunk.materialId,
      ordinal: chunk.ordinal,
      materialTitle: input.materialTitles.get(chunk.materialId) ?? "",
      locator: formatPageLocator(chunk.pageStart, chunk.pageEnd, input.language),
      heading: chunk.heading,
      text,
    });
  }
  return out;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type RetrievalDeps = {
  embeddings: MaterialEmbeddingDeps | null;
};

/** Retrieve answer excerpts for one Tutor question inside a material course.
 * Vector search failing or being unconfigured degrades to lexical + prior. */
export async function retrieveCourseMaterialExcerpts(
  input: {
    ownerId: string;
    record: MaterialGraphRecord;
    question: string;
    lessonConceptIds: string[];
    language: "zh" | "en";
  },
  deps: RetrievalDeps = { embeddings: defaultEmbeddingDeps },
): Promise<AnswerExcerpt[]> {
  const { ownerId, record, question } = input;
  const [chunks, materials] = await Promise.all([
    listMaterialChunks(ownerId, record.materialIds),
    getMaterialsByIds(ownerId, record.materialIds),
  ]);
  if (chunks.length === 0) return [];

  let vectorRefs: MaterialChunkRef[] = [];
  if (deps.embeddings && question.trim()) {
    try {
      const { hits, unindexed } = await withTimeout(
        searchMaterialChunks({ ownerId, materialIds: record.materialIds, question, limit: SIGNAL_DEPTH }, deps.embeddings),
        VECTOR_TIMEOUT_MS,
      );
      vectorRefs = hits.filter((hit) => hit.similarity >= MIN_VECTOR_SIMILARITY);
      if (unindexed) scheduleMaterialIndexing(ownerId, record.materialIds);
    } catch (error) {
      console.warn("[materials] vector retrieval skipped:", error instanceof Error ? error.message : error);
    }
  }

  const priorRefs = input.lessonConceptIds.flatMap((id) => (record.conceptSources[id] ?? []).slice(0, PRIOR_REFS_PER_CONCEPT));
  return selectAnswerExcerpts({
    question,
    chunks,
    vectorRefs,
    priorRefs,
    materialTitles: new Map(materials.map((material) => [material.id, material.title])),
    language: input.language,
  });
}
