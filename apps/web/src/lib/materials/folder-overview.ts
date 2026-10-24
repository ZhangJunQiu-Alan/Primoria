import { resolveKgDisplayName } from "../knowledge-graph/display-name";
import { listConceptMasteryByOwner } from "../mastery/owner-store";
import type { MasteryStatus } from "../mastery/store";
import { folderGraphId } from "./folder-graph";
import { assembleState, assemblyLectures, loadFolderLectures, type FolderLectureState } from "./folder-graph-store";

// Read model for the folder page: the assembled KG grouped by the lecture that
// introduces each concept, with the learner's mastery per concept.

export type FolderOverviewConcept = {
  conceptId: string;
  name: string;
  status: MasteryStatus;
  /** Other lectures that revisit this concept (merged by sameAs). */
  revisitedIn: number;
};

export type FolderGraphOverview = {
  graphId: string;
  conceptCount: number;
  lectures: { materialId: string; title: string; concepts: FolderOverviewConcept[] }[];
};

export function buildFolderOverview(
  state: FolderLectureState,
  mastery: Map<string, MasteryStatus>,
  language: string | null,
): FolderGraphOverview {
  const assembled = assembleState(state);
  // Lectures (beyond the introducing one) whose small KG contains the concept.
  const appearances = new Map<string, number>();
  for (const lecture of assemblyLectures(state)) {
    const ids = new Set(lecture.subgraph.topics.flatMap((topic) => topic.concepts.map((concept) => concept.conceptId)));
    for (const id of ids) appearances.set(id, (appearances.get(id) ?? 0) + 1);
  }
  const byLecture = new Map<string, FolderOverviewConcept[]>();
  for (const topic of assembled.graph.topics) {
    for (const concept of topic.conceptIds) {
      const lectureId = assembled.conceptLecture[concept.conceptId];
      const list = byLecture.get(lectureId) ?? [];
      list.push({
        conceptId: concept.conceptId,
        name: resolveKgDisplayName(concept, language === "zh" ? "zh" : "en"),
        status: mastery.get(concept.conceptId) ?? "untested",
        revisitedIn: Math.max(0, (appearances.get(concept.conceptId) ?? 1) - 1),
      });
      byLecture.set(lectureId, list);
    }
  }
  const lectures = state.materials
    .filter((material) => byLecture.has(material.id))
    .map((material) => ({ materialId: material.id, title: material.title, concepts: byLecture.get(material.id)! }));
  return {
    graphId: assembled.graph.graphId,
    conceptCount: lectures.reduce((total, lecture) => total + lecture.concepts.length, 0),
    lectures,
  };
}

export async function loadFolderOverview(ownerId: string, folderId: string, language: string | null): Promise<FolderGraphOverview | null> {
  const state = await loadFolderLectures(ownerId, folderId);
  if (!state) return null;
  const rows = await listConceptMasteryByOwner(ownerId, folderGraphId(folderId)).catch(() => []);
  return buildFolderOverview(state, new Map(rows.map((row) => [row.conceptId, row.status])), language);
}
