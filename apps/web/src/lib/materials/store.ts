import { and, asc, count, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { getDb } from "../db/client";
import {
  courses,
  learningMaterialChunks,
  learningMaterials,
  materialFolders,
  materialTopicGraphs,
  type LearningMaterialChunkRow,
  type LearningMaterialRow,
} from "../db/schema";
import type { PreparedMaterial } from "./ingest";
import { rebuildFolderGraph } from "./folder-graph-store";
import { enqueueLectureKgJob } from "./lecture-kg-jobs";
import { insertionPosition, parseLectureNumber } from "./ordering";
import type { MaterialChunkRef, MaterialKgStatus, MaterialOrderSource, MaterialRole, MaterialSummary } from "./types";

// Owner-scoped persistence for uploaded learning materials. Every query filters
// by owner_id; a material id from another owner reads as "not found".

function randomMaterialId() {
  return `lm_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function toMaterialSummary(row: LearningMaterialRow): MaterialSummary {
  return {
    id: row.id,
    title: row.title,
    fileName: row.fileName,
    mimeType: row.mimeType,
    byteLength: row.byteLength,
    charCount: row.charCount,
    chunkCount: row.chunkCount,
    pageCount: row.pageCount,
    language: row.language,
    folderId: row.folderId,
    role: row.role as MaterialRole,
    position: row.position,
    lectureNumber: row.lectureNumber,
    orderSource: row.orderSource as MaterialOrderSource,
    kgStatus: row.kgStatus as MaterialKgStatus,
    createdAt: row.createdAt.getTime(),
  };
}

export async function listMaterials(ownerId: string): Promise<MaterialSummary[]> {
  const rows = await getDb()
    .select()
    .from(learningMaterials)
    .where(eq(learningMaterials.ownerId, ownerId))
    .orderBy(desc(learningMaterials.createdAt));
  return rows.map(toMaterialSummary);
}

export async function countMaterials(ownerId: string): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(learningMaterials)
    .where(eq(learningMaterials.ownerId, ownerId));
  return Number(row?.value ?? 0);
}

export async function getMaterialsByIds(ownerId: string, ids: string[]): Promise<LearningMaterialRow[]> {
  if (ids.length === 0) return [];
  return getDb()
    .select()
    .from(learningMaterials)
    .where(and(eq(learningMaterials.ownerId, ownerId), inArray(learningMaterials.id, ids)));
}

export type InsertMaterialResult = { material: MaterialSummary; duplicate: boolean };

/** Insert a material and all of its chunks atomically into `placement.folderId`
 * (which the caller has verified belongs to the owner). The folder row is
 * locked so concurrent uploads into one folder get distinct positions.
 * Re-uploading the same bytes (same owner + sha256) returns the existing
 * material untouched, wherever it lives. */
export async function insertMaterial(
  ownerId: string,
  prepared: PreparedMaterial,
  placement: { folderId: string; role: MaterialRole },
): Promise<InsertMaterialResult> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const now = new Date();
    const [folder] = await tx
      .select({ id: materialFolders.id, kind: materialFolders.kind })
      .from(materialFolders)
      .where(and(eq(materialFolders.id, placement.folderId), eq(materialFolders.ownerId, ownerId)))
      .for("update");
    const siblings = await tx
      .select({ position: learningMaterials.position, lectureNumber: learningMaterials.lectureNumber })
      .from(learningMaterials)
      .where(and(eq(learningMaterials.ownerId, ownerId), eq(learningMaterials.folderId, placement.folderId)));
    const lectureNumber = parseLectureNumber(prepared.fileName);
    const [inserted] = await tx
      .insert(learningMaterials)
      .values({
        id: randomMaterialId(),
        ownerId,
        title: prepared.title,
        fileName: prepared.fileName,
        mimeType: prepared.mimeType,
        byteLength: prepared.byteLength,
        contentSha256: prepared.contentSha256,
        charCount: prepared.charCount,
        chunkCount: prepared.chunks.length,
        pageCount: prepared.pageCount,
        language: prepared.language,
        folderId: placement.folderId,
        role: placement.role,
        position: insertionPosition(siblings, lectureNumber),
        lectureNumber,
        orderSource: lectureNumber === null ? "upload" : "filename",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: [learningMaterials.ownerId, learningMaterials.contentSha256] })
      .returning();

    if (!inserted) {
      const [existing] = await tx
        .select()
        .from(learningMaterials)
        .where(and(eq(learningMaterials.ownerId, ownerId), eq(learningMaterials.contentSha256, prepared.contentSha256)))
        .limit(1);
      if (!existing) throw new Error("material insert conflicted without an existing row");
      return { material: toMaterialSummary(existing), duplicate: true };
    }

    // Batched so a 400k-character material stays well under the bind-parameter cap.
    const rows = prepared.chunks.map((chunk) => ({
      materialId: inserted.id,
      ordinal: chunk.ordinal,
      ownerId,
      text: chunk.text,
      heading: chunk.heading,
      pageStart: chunk.pageStart,
      pageEnd: chunk.pageEnd,
      charCount: chunk.charCount,
    }));
    for (let i = 0; i < rows.length; i += 200) {
      await tx.insert(learningMaterialChunks).values(rows.slice(i, i + 200));
    }
    // A lecture filed under a subject gets its small KG built by the worker.
    if (folder?.kind === "subject" && placement.role === "lecture") {
      await enqueueLectureKgJob(tx, { ownerId, materialId: inserted.id, folderId: placement.folderId });
      return { material: toMaterialSummary({ ...inserted, kgStatus: "pending" }), duplicate: false };
    }
    return { material: toMaterialSummary(inserted), duplicate: false };
  });
}

export async function listMaterialChunks(ownerId: string, materialIds: string[]): Promise<LearningMaterialChunkRow[]> {
  if (materialIds.length === 0) return [];
  return getDb()
    .select()
    .from(learningMaterialChunks)
    .where(and(eq(learningMaterialChunks.ownerId, ownerId), inArray(learningMaterialChunks.materialId, materialIds)))
    .orderBy(asc(learningMaterialChunks.materialId), asc(learningMaterialChunks.ordinal));
}

export async function getChunksByRefs(ownerId: string, refs: MaterialChunkRef[]): Promise<LearningMaterialChunkRow[]> {
  if (refs.length === 0) return [];
  const byMaterial = new Map<string, number[]>();
  for (const ref of refs) byMaterial.set(ref.materialId, [...(byMaterial.get(ref.materialId) ?? []), ref.ordinal]);
  const clauses = [...byMaterial.entries()].map(([materialId, ordinals]) =>
    and(eq(learningMaterialChunks.materialId, materialId), inArray(learningMaterialChunks.ordinal, ordinals)),
  );
  return getDb()
    .select()
    .from(learningMaterialChunks)
    .where(and(eq(learningMaterialChunks.ownerId, ownerId), or(...clauses)));
}

/** Page spans only (no text) for concept-level source attribution. */
export async function getChunkLocators(
  ownerId: string,
  refs: MaterialChunkRef[],
): Promise<Pick<LearningMaterialChunkRow, "materialId" | "ordinal" | "pageStart" | "pageEnd">[]> {
  if (refs.length === 0) return [];
  const materialIds = [...new Set(refs.map((ref) => ref.materialId))];
  const wanted = new Set(refs.map((ref) => `${ref.materialId}#${ref.ordinal}`));
  const rows = await getDb()
    .select({
      materialId: learningMaterialChunks.materialId,
      ordinal: learningMaterialChunks.ordinal,
      pageStart: learningMaterialChunks.pageStart,
      pageEnd: learningMaterialChunks.pageEnd,
    })
    .from(learningMaterialChunks)
    .where(and(eq(learningMaterialChunks.ownerId, ownerId), inArray(learningMaterialChunks.materialId, materialIds)));
  return rows.filter((row) => wanted.has(`${row.materialId}#${row.ordinal}`));
}

export type DeleteMaterialResult =
  | { ok: true }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "in_use"; courses: { id: string; title: string }[] };

/** Delete a material plus the hand-picked material-set graphs derived from it.
 * Refused while any course (archived included) still runs on one of those
 * graphs, because its planned lessons would lose their grounding source. The
 * file's subject folder graph is re-assembled without it. */
export async function deleteMaterial(ownerId: string, materialId: string): Promise<DeleteMaterialResult> {
  return getDb().transaction(async (tx) => {
    const [material] = await tx
      .select({ id: learningMaterials.id, folderId: learningMaterials.folderId })
      .from(learningMaterials)
      .where(and(eq(learningMaterials.ownerId, ownerId), eq(learningMaterials.id, materialId)))
      .for("update")
      .limit(1);
    if (!material) return { ok: false, reason: "not_found" } as const;

    // Only hand-picked material-set graphs block deletion; a subject folder's
    // graph is re-assembled without the file (subject-folders.md §4.3).
    const graphs = await tx
      .select({ graphId: materialTopicGraphs.graphId })
      .from(materialTopicGraphs)
      .where(and(
        eq(materialTopicGraphs.ownerId, ownerId),
        isNull(materialTopicGraphs.folderId),
        sql`${materialTopicGraphs.materialIds} @> ${JSON.stringify([materialId])}::jsonb`,
      ));
    const graphIds = graphs.map((graph) => graph.graphId);

    if (graphIds.length > 0) {
      const dependents = await tx
        .select({ id: courses.id, title: courses.title })
        .from(courses)
        .where(and(eq(courses.ownerId, ownerId), inArray(courses.graphId, graphIds)));
      if (dependents.length > 0) return { ok: false, reason: "in_use", courses: dependents } as const;
      await tx
        .delete(materialTopicGraphs)
        .where(and(eq(materialTopicGraphs.ownerId, ownerId), inArray(materialTopicGraphs.graphId, graphIds)));
    }

    await tx
      .delete(learningMaterials)
      .where(and(eq(learningMaterials.ownerId, ownerId), eq(learningMaterials.id, materialId)));
    await rebuildFolderGraph(ownerId, material.folderId, tx);
    return { ok: true } as const;
  });
}
