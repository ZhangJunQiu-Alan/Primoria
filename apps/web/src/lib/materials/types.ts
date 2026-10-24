// Client-safe learning-material shapes returned by /api/materials.

export type MaterialSummary = {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  byteLength: number;
  charCount: number;
  chunkCount: number;
  pageCount: number | null;
  language: string | null;
  createdAt: number;
};

/** A chunk address inside one material: what concept_sources stores. */
export type MaterialChunkRef = { materialId: string; ordinal: number };

/** Concept-level source attribution shown next to a material course lesson. */
export type MaterialSourceRef = { materialId: string; title: string; locator: string | null };

export const MATERIAL_GRAPH_PREFIX = "mat_";

export function isMaterialGraphId(graphId: string | null | undefined): boolean {
  return typeof graphId === "string" && graphId.startsWith(MATERIAL_GRAPH_PREFIX);
}
