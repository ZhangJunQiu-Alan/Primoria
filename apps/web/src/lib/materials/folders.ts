import { and, asc, eq, sql } from "drizzle-orm";

import { getDb, type DbOrTx } from "../db/client";
import { isUniqueViolation } from "../db/errors";
import {
  courses,
  learningMaterials,
  materialFolders,
  materialKgJobs,
  materialSubgraphs,
  materialTopicGraphs,
  type MaterialFolderRow,
} from "../db/schema";
import { folderGraphId } from "./folder-graph";
import { rebuildFolderGraph } from "./folder-graph-store";
import { enqueueLectureKgJob } from "./lecture-kg-jobs";
import { insertionPosition } from "./ordering";
import { toMaterialSummary } from "./store";
import { MAX_FOLDER_NAME_CHARS, type FolderKind, type FolderSummary, type MaterialRole, type MaterialSummary } from "./types";

// Owner-scoped subject folders (docs/product/subject-folders.md). Every query
// filters by owner_id; another owner's folder id reads as "not found".

export const UNSORTED_FOLDER_NAME = "Unsorted";
const NAME_CONSTRAINT = "material_folders_owner_name_uidx";

export class FolderInputError extends Error {
  constructor(public readonly code: "invalid_name" | "duplicate_name" | "unsorted_locked" | "order_mismatch", message: string) {
    super(message);
    this.name = "FolderInputError";
  }
}

function randomFolderId() {
  return `mf_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function normalizeFolderName(name: unknown): string {
  const value = typeof name === "string" ? name.normalize("NFKC").replace(/\s+/g, " ").trim() : "";
  if (!value || value.length > MAX_FOLDER_NAME_CHARS) {
    throw new FolderInputError("invalid_name", `Folder names must be 1–${MAX_FOLDER_NAME_CHARS} characters.`);
  }
  return value;
}

/** The owner's system inbox; created on first use. */
export async function ensureUnsortedFolder(ownerId: string, db: DbOrTx = getDb()): Promise<MaterialFolderRow> {
  const now = new Date();
  await db
    .insert(materialFolders)
    .values({ id: randomFolderId(), ownerId, name: UNSORTED_FOLDER_NAME, kind: "unsorted", createdAt: now, updatedAt: now })
    .onConflictDoNothing();
  const [row] = await db
    .select()
    .from(materialFolders)
    .where(and(eq(materialFolders.ownerId, ownerId), eq(materialFolders.kind, "unsorted")))
    .limit(1);
  if (!row) throw new Error("unsorted folder could not be created");
  return row;
}

export async function getFolder(ownerId: string, folderId: string, db: DbOrTx = getDb()): Promise<MaterialFolderRow | null> {
  const [row] = await db
    .select()
    .from(materialFolders)
    .where(and(eq(materialFolders.ownerId, ownerId), eq(materialFolders.id, folderId)))
    .limit(1);
  return row ?? null;
}

/** Subject folders by name, with the unsorted inbox last. */
export async function listFolders(ownerId: string): Promise<FolderSummary[]> {
  await ensureUnsortedFolder(ownerId);
  const rows = await getDb()
    .select({
      folder: materialFolders,
      materialCount: sql<number>`count(${learningMaterials.id})::int`,
      lectureCount: sql<number>`count(${learningMaterials.id}) filter (where ${learningMaterials.role} = 'lecture')::int`,
    })
    .from(materialFolders)
    .leftJoin(learningMaterials, eq(learningMaterials.folderId, materialFolders.id))
    .where(eq(materialFolders.ownerId, ownerId))
    .groupBy(materialFolders.id)
    .orderBy(asc(materialFolders.kind), asc(sql`lower(${materialFolders.name})`));
  return rows.map(({ folder, materialCount, lectureCount }) => ({
    id: folder.id,
    name: folder.name,
    kind: folder.kind as FolderKind,
    materialCount: Number(materialCount),
    lectureCount: Number(lectureCount),
    createdAt: folder.createdAt.getTime(),
    updatedAt: folder.updatedAt.getTime(),
  }));
}

export async function createFolder(ownerId: string, name: unknown): Promise<MaterialFolderRow> {
  const value = normalizeFolderName(name);
  const now = new Date();
  try {
    const [row] = await getDb()
      .insert(materialFolders)
      .values({ id: randomFolderId(), ownerId, name: value, kind: "subject", createdAt: now, updatedAt: now })
      .returning();
    return row;
  } catch (error) {
    if (isUniqueViolation(error, NAME_CONSTRAINT)) throw new FolderInputError("duplicate_name", "A folder with this name already exists.");
    throw error;
  }
}

export async function renameFolder(ownerId: string, folderId: string, name: unknown): Promise<MaterialFolderRow | null> {
  const value = normalizeFolderName(name);
  const folder = await getFolder(ownerId, folderId);
  if (!folder) return null;
  if (folder.kind === "unsorted") throw new FolderInputError("unsorted_locked", "The Unsorted folder cannot be renamed.");
  try {
    const [row] = await getDb()
      .update(materialFolders)
      .set({ name: value, updatedAt: new Date() })
      .where(and(eq(materialFolders.ownerId, ownerId), eq(materialFolders.id, folderId)))
      .returning();
    if (row) await rebuildFolderGraph(ownerId, folderId);
    return row ?? null;
  } catch (error) {
    if (isUniqueViolation(error, NAME_CONSTRAINT)) throw new FolderInputError("duplicate_name", "A folder with this name already exists.");
    throw error;
  }
}

export async function listFolderMaterials(ownerId: string, folderId: string, db: DbOrTx = getDb()): Promise<MaterialSummary[]> {
  const rows = await db
    .select()
    .from(learningMaterials)
    .where(and(eq(learningMaterials.ownerId, ownerId), eq(learningMaterials.folderId, folderId)))
    .orderBy(asc(learningMaterials.position), asc(learningMaterials.createdAt));
  return rows.map(toMaterialSummary);
}

/** Delete a subject folder; its files move to the end of the unsorted inbox. */
export async function deleteFolder(ownerId: string, folderId: string): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    const folder = await getFolder(ownerId, folderId, tx);
    if (!folder) return false;
    if (folder.kind === "unsorted") throw new FolderInputError("unsorted_locked", "The Unsorted folder cannot be deleted.");
    const inbox = await ensureUnsortedFolder(ownerId, tx);
    const [moving, inboxFiles] = await Promise.all([
      listFolderMaterials(ownerId, folderId, tx),
      listFolderMaterials(ownerId, inbox.id, tx),
    ]);
    let next = (inboxFiles[inboxFiles.length - 1]?.position ?? 0) + 1;
    for (const material of moving) {
      await tx
        .update(learningMaterials)
        .set({ folderId: inbox.id, position: next, orderSource: "upload", kgStatus: "skipped", updatedAt: new Date() })
        .where(and(eq(learningMaterials.ownerId, ownerId), eq(learningMaterials.id, material.id)));
      next += 1;
    }
    // Lecture subgraphs and KG jobs cascade with the folder. The folder graph
    // goes too unless a course runs on it (then it stays, detached).
    const graphId = folderGraphId(folderId);
    const [inUse] = await tx
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.ownerId, ownerId), eq(courses.graphId, graphId)))
      .limit(1);
    if (!inUse) {
      await tx.delete(materialTopicGraphs).where(and(eq(materialTopicGraphs.ownerId, ownerId), eq(materialTopicGraphs.graphId, graphId)));
    }
    await tx.delete(materialFolders).where(and(eq(materialFolders.ownerId, ownerId), eq(materialFolders.id, folderId)));
    return true;
  });
}

/** Replace a folder's order with `materialIds` (exactly the folder's files). */
export async function reorderFolder(ownerId: string, folderId: string, materialIds: string[]): Promise<MaterialSummary[] | null> {
  return getDb().transaction(async (tx) => {
    const folder = await getFolder(ownerId, folderId, tx);
    if (!folder) return null;
    const current = await listFolderMaterials(ownerId, folderId, tx);
    const currentIds = new Set(current.map((material) => material.id));
    if (materialIds.length !== currentIds.size || new Set(materialIds).size !== materialIds.length || materialIds.some((id) => !currentIds.has(id))) {
      throw new FolderInputError("order_mismatch", "The new order must list every file in the folder exactly once.");
    }
    const now = new Date();
    for (const [index, id] of materialIds.entries()) {
      await tx
        .update(learningMaterials)
        .set({ position: index + 1, orderSource: "manual", updatedAt: now })
        .where(and(eq(learningMaterials.ownerId, ownerId), eq(learningMaterials.id, id)));
    }
    await rebuildFolderGraph(ownerId, folderId, tx);
    return listFolderMaterials(ownerId, folderId, tx);
  });
}

/** Move a file to another folder (placed by its lecture number) and/or change
 * its role. Returns null when the file or target folder is not the owner's. */
export async function updateMaterialPlacement(
  ownerId: string,
  materialId: string,
  patch: { folderId?: string; role?: MaterialRole },
): Promise<MaterialSummary | null> {
  return getDb().transaction(async (tx) => {
    const [material] = await tx
      .select()
      .from(learningMaterials)
      .where(and(eq(learningMaterials.ownerId, ownerId), eq(learningMaterials.id, materialId)))
      .limit(1);
    if (!material) return null;
    const set: Partial<typeof learningMaterials.$inferInsert> = { updatedAt: new Date() };
    const role = patch.role ?? (material.role as MaterialRole);
    if (patch.role) set.role = patch.role;
    let target = await getFolder(ownerId, material.folderId, tx);
    const moving = Boolean(patch.folderId && patch.folderId !== material.folderId);
    if (moving) {
      target = await getFolder(ownerId, patch.folderId!, tx);
      if (!target) return null;
      await tx.select({ id: materialFolders.id }).from(materialFolders).where(eq(materialFolders.id, target.id)).for("update");
      const siblings = await tx
        .select({ position: learningMaterials.position, lectureNumber: learningMaterials.lectureNumber })
        .from(learningMaterials)
        .where(and(eq(learningMaterials.ownerId, ownerId), eq(learningMaterials.folderId, target.id)));
      set.folderId = target.id;
      set.position = insertionPosition(siblings, material.lectureNumber);
      set.orderSource = material.lectureNumber === null ? "upload" : "filename";
      // Concept ids in a lecture's small KG belong to its folder; a moved
      // lecture is rebuilt against the new folder's concepts.
      await tx.delete(materialSubgraphs).where(and(eq(materialSubgraphs.ownerId, ownerId), eq(materialSubgraphs.materialId, materialId)));
    }

    // KG state in the (new) folder: lectures in a subject folder need a small
    // KG — reuse the one already built there, otherwise queue a build.
    let enqueue = false;
    if (target?.kind === "subject" && role === "lecture") {
      const [existing] = moving
        ? []
        : await tx
            .select({ materialId: materialSubgraphs.materialId })
            .from(materialSubgraphs)
            .where(and(eq(materialSubgraphs.ownerId, ownerId), eq(materialSubgraphs.materialId, materialId), eq(materialSubgraphs.folderId, target.id)))
            .limit(1);
      if (existing) set.kgStatus = "ready";
      else enqueue = !["pending", "processing"].includes(material.kgStatus) || moving;
    } else {
      set.kgStatus = "skipped";
      await tx.delete(materialKgJobs).where(and(eq(materialKgJobs.ownerId, ownerId), eq(materialKgJobs.materialId, materialId)));
    }

    const [row] = await tx
      .update(learningMaterials)
      .set(set)
      .where(and(eq(learningMaterials.ownerId, ownerId), eq(learningMaterials.id, materialId)))
      .returning();
    if (!row) return null;
    if (enqueue && target) await enqueueLectureKgJob(tx, { ownerId, materialId, folderId: target.id });
    await rebuildFolderGraph(ownerId, material.folderId, tx);
    if (moving && target) await rebuildFolderGraph(ownerId, target.id, tx);
    const [fresh] = await tx.select().from(learningMaterials).where(eq(learningMaterials.id, materialId)).limit(1);
    return toMaterialSummary(fresh ?? row);
  });
}

/** Re-queue a failed lecture KG; null when the file is not a failed lecture
 * in one of the owner's subject folders. */
export async function retryLectureKg(ownerId: string, materialId: string): Promise<MaterialSummary | null> {
  return getDb().transaction(async (tx) => {
    const [material] = await tx
      .select()
      .from(learningMaterials)
      .where(and(eq(learningMaterials.ownerId, ownerId), eq(learningMaterials.id, materialId)))
      .limit(1);
    if (!material || material.role !== "lecture" || material.kgStatus !== "failed") return null;
    const folder = await getFolder(ownerId, material.folderId, tx);
    if (folder?.kind !== "subject") return null;
    await enqueueLectureKgJob(tx, { ownerId, materialId, folderId: folder.id });
    return toMaterialSummary({ ...material, kgStatus: "pending" });
  });
}
