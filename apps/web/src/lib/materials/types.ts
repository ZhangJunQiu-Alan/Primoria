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
  folderId: string;
  role: MaterialRole;
  position: number;
  lectureNumber: number | null;
  orderSource: MaterialOrderSource;
  createdAt: number;
};

export type MaterialRole = "lecture" | "reference";
export type MaterialOrderSource = "filename" | "ai" | "manual" | "upload";
export const MATERIAL_ROLES: readonly MaterialRole[] = ["lecture", "reference"];

export type FolderKind = "subject" | "unsorted";

export type FolderSummary = {
  id: string;
  name: string;
  kind: FolderKind;
  materialCount: number;
  lectureCount: number;
  createdAt: number;
  updatedAt: number;
};

export const MAX_FOLDER_NAME_CHARS = 60;

/** A chunk address inside one material: what concept_sources stores. */
export type MaterialChunkRef = { materialId: string; ordinal: number };

/** Concept-level source attribution shown next to a material course lesson. */
export type MaterialSourceRef = { materialId: string; title: string; locator: string | null };

export const MATERIAL_GRAPH_PREFIX = "mat_";

export function isMaterialGraphId(graphId: string | null | undefined): boolean {
  return typeof graphId === "string" && graphId.startsWith(MATERIAL_GRAPH_PREFIX);
}
