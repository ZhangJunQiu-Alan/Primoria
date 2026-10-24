import type { SourceExcerpt } from "../ai/deepagent/course-kg-context";
import type { LearningMaterialChunkRow } from "../db/schema";
import { formatPageLocator } from "./material-graph";
import type { MaterialGraphRecord } from "./material-graph-store";
import { getChunksByRefs, getMaterialsByIds } from "./store";
import type { MaterialChunkRef, MaterialSourceRef } from "./types";

// Lesson grounding for material courses: resolve a lesson's concepts to the
// exact chunks the graph builder cited, within a budget, as prompt excerpts.

export const LESSON_EXCERPT_BUDGET_CHARS = 12_000;
const CONCEPT_EXCERPT_BUDGET_CHARS = 5_000;
const MAX_REFS_PER_CONCEPT = 4;
const MIN_TRUNCATED_EXCERPT_CHARS = 300;

const refKey = (ref: MaterialChunkRef) => `${ref.materialId}#${ref.ordinal}`;

export type ExcerptChunk = Pick<LearningMaterialChunkRow, "materialId" | "ordinal" | "text" | "heading" | "pageStart" | "pageEnd">;

/** Pure: pick and label excerpts for `conceptIds` (lesson order). A chunk cited
 * by several concepts becomes one excerpt listing all of them. */
export function selectLessonExcerpts(input: {
  conceptIds: string[];
  conceptSources: Record<string, MaterialChunkRef[]>;
  chunks: ExcerptChunk[];
  materialTitles: Map<string, string>;
  language: "zh" | "en";
  budget?: number;
}): SourceExcerpt[] {
  const chunkByKey = new Map(input.chunks.map((chunk) => [refKey(chunk), chunk]));
  const excerptByKey = new Map<string, SourceExcerpt>();
  const ordered: SourceExcerpt[] = [];
  let remaining = input.budget ?? LESSON_EXCERPT_BUDGET_CHARS;

  for (const conceptId of input.conceptIds) {
    let conceptRemaining = CONCEPT_EXCERPT_BUDGET_CHARS;
    for (const ref of (input.conceptSources[conceptId] ?? []).slice(0, MAX_REFS_PER_CONCEPT)) {
      const key = refKey(ref);
      const shared = excerptByKey.get(key);
      if (shared) {
        if (!shared.conceptIds.includes(conceptId)) shared.conceptIds.push(conceptId);
        continue;
      }
      const chunk = chunkByKey.get(key);
      if (!chunk) continue;
      const allowance = Math.min(remaining, conceptRemaining);
      if (allowance < MIN_TRUNCATED_EXCERPT_CHARS) break;
      const text = chunk.text.length > allowance ? `${chunk.text.slice(0, allowance)}…` : chunk.text;
      remaining -= text.length;
      conceptRemaining -= text.length;
      const excerpt: SourceExcerpt = {
        label: `S${ordered.length + 1}`,
        conceptIds: [conceptId],
        materialTitle: input.materialTitles.get(chunk.materialId) ?? "",
        locator: formatPageLocator(chunk.pageStart, chunk.pageEnd, input.language),
        heading: chunk.heading,
        text,
      };
      excerptByKey.set(key, excerpt);
      ordered.push(excerpt);
    }
  }
  return ordered;
}

export async function loadLessonSourceExcerpts(input: {
  ownerId: string;
  record: MaterialGraphRecord;
  conceptIds: string[];
  language: "zh" | "en";
}): Promise<{ excerpts: SourceExcerpt[]; citedRefCount: number }> {
  const { ownerId, record, conceptIds, language } = input;
  const refs = conceptIds.flatMap((id) => (record.conceptSources[id] ?? []).slice(0, MAX_REFS_PER_CONCEPT));
  if (refs.length === 0) return { excerpts: [], citedRefCount: 0 };
  const [chunks, materials] = await Promise.all([
    getChunksByRefs(ownerId, refs),
    getMaterialsByIds(ownerId, record.materialIds),
  ]);
  const excerpts = selectLessonExcerpts({
    conceptIds,
    conceptSources: record.conceptSources,
    chunks,
    materialTitles: new Map(materials.map((material) => [material.id, material.title])),
    language,
  });
  return { excerpts, citedRefCount: refs.length };
}

/** Pure: concept-level attribution for the lesson reader ("file · p. 3–4"),
 * one entry per material with its merged page span. */
export function conceptSourceRefs(input: {
  refs: MaterialChunkRef[];
  chunks: Map<string, Pick<LearningMaterialChunkRow, "pageStart" | "pageEnd">>;
  materialTitles: Map<string, string>;
  language: "zh" | "en";
}): MaterialSourceRef[] {
  const spans = new Map<string, { start: number | null; end: number | null }>();
  for (const ref of input.refs) {
    if (!input.materialTitles.has(ref.materialId)) continue;
    const chunk = input.chunks.get(refKey(ref));
    const span = spans.get(ref.materialId) ?? { start: null, end: null };
    if (chunk?.pageStart != null) span.start = span.start === null ? chunk.pageStart : Math.min(span.start, chunk.pageStart);
    const end = chunk?.pageEnd ?? chunk?.pageStart ?? null;
    if (end !== null) span.end = span.end === null ? end : Math.max(span.end, end);
    spans.set(ref.materialId, span);
  }
  return [...spans.entries()].map(([materialId, span]) => ({
    materialId,
    title: input.materialTitles.get(materialId) ?? "",
    locator: formatPageLocator(span.start, span.end, input.language),
  }));
}
