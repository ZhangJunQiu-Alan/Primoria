import { and, asc, eq } from "drizzle-orm";

import { getDb, type DbOrTx } from "../db/client";
import {
  courses,
  learningMaterials,
  materialFolders,
  materialSubgraphs,
  materialTopicGraphs,
  type LearningMaterialRow,
  type MaterialFolderRow,
} from "../db/schema";
import { assembleFolderGraph, folderGraphId, type AssembledFolderGraph, type AssemblyLecture, type LectureSubgraph } from "./folder-graph";

// Persistence around the pure folder-graph assembly. The assembled graph lives
// in material_topic_graphs (graph id mat_<hash(folder)>, folder_id set), so
// every mat_* path — owner-only resolution, private images, no sharing, course
// Tutor retrieval — applies to it unchanged.

export type FolderLectureState = {
  folder: MaterialFolderRow;
  materials: LearningMaterialRow[];
  subgraphs: Map<string, LectureSubgraph>;
};

export async function loadFolderLectures(ownerId: string, folderId: string, db: DbOrTx = getDb()): Promise<FolderLectureState | null> {
  const [folder] = await db
    .select()
    .from(materialFolders)
    .where(and(eq(materialFolders.ownerId, ownerId), eq(materialFolders.id, folderId)))
    .limit(1);
  if (!folder) return null;
  const [materials, subgraphRows] = await Promise.all([
    db
      .select()
      .from(learningMaterials)
      .where(and(eq(learningMaterials.ownerId, ownerId), eq(learningMaterials.folderId, folderId)))
      .orderBy(asc(learningMaterials.position), asc(learningMaterials.createdAt)),
    db
      .select({ materialId: materialSubgraphs.materialId, graph: materialSubgraphs.graph })
      .from(materialSubgraphs)
      .where(and(eq(materialSubgraphs.ownerId, ownerId), eq(materialSubgraphs.folderId, folderId))),
  ]);
  return {
    folder,
    materials,
    subgraphs: new Map(subgraphRows.map((row) => [row.materialId, row.graph as LectureSubgraph])),
  };
}

/** Lectures that take part in the assembly: role lecture with a ready KG. */
export function assemblyLectures(state: FolderLectureState, exclude?: string): AssemblyLecture[] {
  return state.materials.flatMap((material) => {
    const subgraph = state.subgraphs.get(material.id);
    if (material.id === exclude || material.role !== "lecture" || material.kgStatus !== "ready" || !subgraph) return [];
    return [{ materialId: material.id, position: material.position, createdAt: material.createdAt.getTime(), subgraph }];
  });
}

export function assembleState(state: FolderLectureState, exclude?: string): AssembledFolderGraph {
  return assembleFolderGraph({ folderId: state.folder.id, title: state.folder.name, lectures: assemblyLectures(state, exclude) });
}

export function majorityLanguage(materials: LearningMaterialRow[]): "zh" | "en" {
  const zh = materials.filter((m) => m.language === "zh").reduce((total, m) => total + m.charCount, 0);
  const all = materials.reduce((total, m) => total + m.charCount, 0);
  return all > 0 && zh * 2 >= all ? "zh" : "en";
}

/** Re-assemble and persist a subject folder's graph. A folder with no ready
 * lecture keeps no graph — unless a course already runs on it, in which case
 * the last graph stays so the course's lessons keep resolving. */
export async function rebuildFolderGraph(ownerId: string, folderId: string, db: DbOrTx = getDb()): Promise<AssembledFolderGraph | null> {
  const state = await loadFolderLectures(ownerId, folderId, db);
  if (!state || state.folder.kind !== "subject") return null;
  const graphId = folderGraphId(folderId);
  const assembled = assembleState(state);

  if (assembled.graph.topics.length === 0) {
    const [inUse] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.ownerId, ownerId), eq(courses.graphId, graphId)))
      .limit(1);
    if (!inUse) {
      await db.delete(materialTopicGraphs).where(and(eq(materialTopicGraphs.ownerId, ownerId), eq(materialTopicGraphs.graphId, graphId)));
    }
    return null;
  }

  const lectureIds = assemblyLectures(state).map((lecture) => lecture.materialId);
  const referenceIds = state.materials.filter((material) => material.role === "reference").map((material) => material.id);
  const values = {
    folderId,
    materialIds: [...lectureIds, ...referenceIds],
    title: state.folder.name,
    language: majorityLanguage(state.materials),
    graph: assembled.graph,
    conceptSources: assembled.conceptSources,
    updatedAt: new Date(),
  };
  await db
    .insert(materialTopicGraphs)
    .values({ graphId, ownerId, ...values, createdAt: new Date() })
    .onConflictDoUpdate({ target: materialTopicGraphs.graphId, set: values });
  return assembled;
}
