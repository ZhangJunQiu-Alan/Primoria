import { createHash, randomBytes } from "node:crypto";

import { slugify } from "../knowledge-graph/generated-graph";
import type { ConceptPrerequisiteEdge, ConceptVisual, TopicConcept, TopicGraph, TopicNode } from "../knowledge-graph/topic-graph";
import type { RawMaterialGraph } from "./material-graph";
import { MATERIAL_GRAPH_PREFIX, type MaterialChunkRef } from "./types";

// Subject-folder graphs (docs/product/subject-folders.md §3–§4.2). Each lecture
// file has a small KG whose concepts already carry folder-wide concept ids
// (new ids for new ideas, an existing id when the model matched a concept
// another lecture introduced). The folder graph is a pure, deterministic
// assembly of those small KGs in lecture order, so reordering, inserting, or
// deleting a lecture never changes an existing concept id — and mastery keyed
// by (graph, concept) survives.

export const LECTURE_SUBGRAPH_VERSION = 1;
const MAX_SOURCES_PER_FOLDER_CONCEPT = 12;

export type SubgraphConcept = {
  /** Folder-wide concept id. */
  conceptId: string;
  /** True when the lecture re-teaches a concept another lecture introduced. */
  sameAs: boolean;
  name: string;
  nameZh: string | null;
  visual?: ConceptVisual;
  visualHint?: string;
  reason?: string;
  assessmentHint?: string;
  refs: MaterialChunkRef[];
  /** Folder concept ids (from other lectures) this concept builds on. */
  requires: string[];
};

export type SubgraphTopic = { name: string; nameZh: string | null; concepts: SubgraphConcept[] };

export type LectureSubgraph = {
  version: number;
  title: string;
  codeAdapted: boolean;
  topics: SubgraphTopic[];
};

export function folderGraphId(folderId: string): string {
  return `${MATERIAL_GRAPH_PREFIX}${createHash("sha256").update(`folder:${folderId}`).digest("hex").slice(0, 16)}`;
}

export function newFolderConceptId(name: string): string {
  return `fc_${randomBytes(4).toString("hex")}_${slugify(name, "concept")}`;
}

/** Resolve the model's K-labels against the folder's existing concepts. A
 * concept matched twice in one lecture keeps the match only once; the second
 * becomes a new concept rather than silently collapsing two ideas. */
export function toLectureSubgraph(
  raw: RawMaterialGraph,
  existingByLabel: Map<string, string>,
  newId: (name: string) => string = newFolderConceptId,
): LectureSubgraph {
  const usedSameAs = new Set<string>();
  const topics = raw.topics.map((topic): SubgraphTopic => ({
    name: topic.name,
    nameZh: topic.nameZh || null,
    concepts: topic.concepts.map((concept): SubgraphConcept => {
      const match = concept.sameAs ? existingByLabel.get(concept.sameAs) : undefined;
      const sameAs = Boolean(match && !usedSameAs.has(match));
      if (sameAs) usedSameAs.add(match!);
      const conceptId = sameAs ? match! : newId(concept.name);
      const requires = [...new Set((concept.requires ?? []).map((label) => existingByLabel.get(label)).filter((id): id is string => Boolean(id)))]
        .filter((id) => id !== conceptId);
      return {
        conceptId,
        sameAs,
        name: concept.name,
        nameZh: concept.nameZh || null,
        ...(concept.visual ? { visual: concept.visual } : {}),
        ...(concept.visualHint ? { visualHint: concept.visualHint } : {}),
        ...(concept.reason ? { reason: concept.reason } : {}),
        ...(concept.assessmentHint ? { assessmentHint: concept.assessmentHint } : {}),
        refs: concept.refs,
        requires,
      };
    }),
  }));
  return { version: LECTURE_SUBGRAPH_VERSION, title: raw.title, codeAdapted: raw.codeAdapted, topics };
}

export type AssemblyLecture = { materialId: string; position: number; createdAt: number; subgraph: LectureSubgraph };

export type AssembledFolderGraph = {
  graph: TopicGraph;
  conceptSources: Record<string, MaterialChunkRef[]>;
  /** Lecture (material id) where each concept is placed. */
  conceptLecture: Record<string, string>;
};

function mergeRefs(into: MaterialChunkRef[], refs: MaterialChunkRef[]) {
  const seen = new Set(into.map((ref) => `${ref.materialId}#${ref.ordinal}`));
  for (const ref of refs) {
    if (into.length >= MAX_SOURCES_PER_FOLDER_CONCEPT) break;
    const key = `${ref.materialId}#${ref.ordinal}`;
    if (seen.has(key)) continue;
    seen.add(key);
    into.push(ref);
  }
}

/** Deterministic folder graph: lectures in (position, createdAt) order; a
 * concept is placed where it first appears in that order and later
 * occurrences only add sources; every edge points from an earlier placement
 * to a later one, so the result is always a DAG. */
export function assembleFolderGraph(input: { folderId: string; title: string; lectures: AssemblyLecture[] }): AssembledFolderGraph {
  const lectures = [...input.lectures].sort((a, b) => a.position - b.position || a.createdAt - b.createdAt);
  const placement = new Map<string, number>();
  const conceptSources: Record<string, MaterialChunkRef[]> = {};
  const conceptLecture: Record<string, string> = {};
  const topics: TopicNode[] = [];
  const edges = new Map<string, ConceptPrerequisiteEdge>();
  const addEdge = (from: string, to: string, reason?: string) => {
    const fromIndex = placement.get(from);
    const toIndex = placement.get(to);
    if (fromIndex === undefined || toIndex === undefined || fromIndex >= toIndex) return;
    const key = `${from}>${to}`;
    if (!edges.has(key)) edges.set(key, { from, to, strength: "hard", ...(reason ? { reason } : {}) });
  };

  let previousLectureLast: string | null = null;
  let codeAdapted = false;
  for (const lecture of lectures) {
    codeAdapted ||= lecture.subgraph.codeAdapted;
    const short = lecture.materialId.replace(/^lm_/, "").slice(0, 8);
    const placedHere: { conceptId: string; reason?: string }[] = [];
    lecture.subgraph.topics.forEach((topic, topicIndex) => {
      const conceptIds: TopicConcept[] = [];
      for (const concept of topic.concepts) {
        if (placement.has(concept.conceptId)) {
          mergeRefs(conceptSources[concept.conceptId], concept.refs);
          continue;
        }
        placement.set(concept.conceptId, placement.size);
        conceptSources[concept.conceptId] = [];
        mergeRefs(conceptSources[concept.conceptId], concept.refs);
        conceptLecture[concept.conceptId] = lecture.materialId;
        placedHere.push({ conceptId: concept.conceptId, ...(concept.reason ? { reason: concept.reason } : {}) });
        conceptIds.push({
          conceptId: concept.conceptId,
          name: concept.name,
          nameZh: concept.nameZh,
          defaultOrder: conceptIds.length + 1,
          ...(concept.visual ? { visual: concept.visual } : {}),
          ...(concept.visualHint ? { visualHint: concept.visualHint } : {}),
          ...(concept.assessmentHint ? { assessmentHint: concept.assessmentHint } : {}),
        });
      }
      if (conceptIds.length === 0) return;
      topics.push({
        topicId: `${short}_t${topicIndex + 1}_${slugify(topic.name, `topic${topicIndex + 1}`)}`,
        name: topic.name,
        nameZh: topic.nameZh,
        defaultOrder: topics.length + 1,
        conceptIds,
        successors: [],
        prereqTopics: [],
        isRoot: topics.length === 0,
      });
    });

    // In-lecture chain (with the generator's rationale) and the hand-off from
    // the previous lecture's last new concept to this lecture's first one.
    for (let i = 1; i < placedHere.length; i += 1) addEdge(placedHere[i - 1].conceptId, placedHere[i].conceptId, placedHere[i].reason);
    if (previousLectureLast && placedHere.length > 0) addEdge(previousLectureLast, placedHere[0].conceptId);
    if (placedHere.length > 0) previousLectureLast = placedHere[placedHere.length - 1].conceptId;
  }

  // Cross-lecture dependencies the model named; backward ones are dropped.
  for (const lecture of lectures) {
    for (const topic of lecture.subgraph.topics) {
      for (const concept of topic.concepts) {
        for (const required of concept.requires) addEdge(required, concept.conceptId);
      }
    }
  }

  for (let i = 0; i < topics.length; i += 1) {
    if (i + 1 < topics.length) topics[i].successors = [{ topicId: topics[i + 1].topicId, hard: true }];
    if (i > 0) topics[i].prereqTopics = [topics[i - 1].topicId];
  }

  const conceptEdges = [...edges.values()];
  return {
    graph: {
      graphId: folderGraphId(input.folderId),
      subject: input.title,
      topics,
      ...(conceptEdges.length ? { conceptEdges } : {}),
      ...(codeAdapted ? { codeAdapted: true } : {}),
    },
    conceptSources,
    conceptLecture,
  };
}
