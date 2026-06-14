import type { EncodedKnowledgeGraphQuery } from "./query-encoding";
import type { KnowledgeGraphSearchResponse } from "./search";
import type { PositioningResult } from "./positioning";

// Log-and-tune: emit one structured line per positioning call so TAU/FLOOR can
// later be calibrated against real traffic and user outcomes. The `outcome`
// field is filled in after the user accepts an entry or re-inputs a goal.

export type PositioningLogRecord = {
  ts: string;
  graphId: string;
  modelVersion: string;
  topK: number;
  rawQuery: string;
  coreQuery: string;
  appliedRules: string[];
  params: PositioningResult["params"];
  branch: PositioningResult["branch"];
  maxSimilarity: number;
  topTopicMass: Array<{ topicId: string; mass: number }>;
  topResults: Array<{ nodeId: string; kind: string; similarity: number }>;
  startTopicId?: string;
  targetConceptId?: string | null;
  menuTopicIds?: string[];
  outcome?: "accepted" | "reinput" | "abandoned";
};

export function buildPositioningLog(input: {
  encodedQuery: EncodedKnowledgeGraphQuery;
  search: KnowledgeGraphSearchResponse;
  result: PositioningResult;
}): PositioningLogRecord {
  const { encodedQuery, search, result } = input;
  return {
    ts: new Date().toISOString(),
    graphId: search.graphId,
    modelVersion: search.modelVersion,
    topK: search.topK,
    rawQuery: encodedQuery.rawQuery,
    coreQuery: encodedQuery.coreQuery,
    appliedRules: encodedQuery.appliedRules,
    params: result.params,
    branch: result.branch,
    maxSimilarity: result.diagnostics.maxSimilarity,
    topTopicMass: result.diagnostics.topicMass.slice(0, 5),
    topResults: search.results.slice(0, 5).map((r) => ({ nodeId: r.nodeId, kind: r.kind, similarity: r.similarity })),
    startTopicId: result.startTopicId,
    targetConceptId: result.targetConceptId,
    menuTopicIds: result.menu?.map((m) => m.topicId),
  };
}

export function logPositioning(record: PositioningLogRecord) {
  // Single-line JSON tag for easy grep/ingestion into the tuning dataset.
  console.log(`[kg-position-log] ${JSON.stringify(record)}`);
}
