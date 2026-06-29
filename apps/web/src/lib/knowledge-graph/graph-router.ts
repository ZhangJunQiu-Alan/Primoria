import { getTopicGraph } from "./topic-graph";
import type { KnowledgeGraphSearchResult } from "./search";

// Cross-graph recall grouped into ranked candidate subjects. Subject selection
// itself now happens inside the single Stage-2 positioning LLM call
// (positioning-llm.ts), which receives these candidates' full topic lists; this
// module only produces the candidate set (with best similarity + sample topics
// as evidence) used to pick which graphs to hand the model.

export const DEFAULT_KG_ROUTER_CANDIDATES = 6;
const EVIDENCE_PER_GRAPH = 4;

export type GraphCandidate = {
  graphId: string;
  subject: string;
  bestSimilarity: number;
  evidence: string[];
};

function safeSubject(graphId: string): string | null {
  try {
    return getTopicGraph(graphId).subject || graphId;
  } catch {
    // Unknown/dirty graphId (not in the generated topic graphs) — skip it.
    return null;
  }
}

// Group cross-graph recall hits into ranked candidate subjects with evidence.
export function buildGraphCandidates(
  results: KnowledgeGraphSearchResult[],
  limit: number = DEFAULT_KG_ROUTER_CANDIDATES,
): GraphCandidate[] {
  const byGraph = new Map<string, { best: number; evidence: string[] }>();
  for (const r of results) {
    const entry = byGraph.get(r.graphId) ?? { best: -Infinity, evidence: [] };
    entry.best = Math.max(entry.best, r.similarity);
    const label = (r.topicName ?? r.name)?.trim();
    if (label && !entry.evidence.includes(label) && entry.evidence.length < EVIDENCE_PER_GRAPH) {
      entry.evidence.push(label);
    }
    byGraph.set(r.graphId, entry);
  }

  return [...byGraph.entries()]
    .map(([graphId, { best, evidence }]) => {
      const subject = safeSubject(graphId);
      return subject ? { graphId, subject, bestSimilarity: best, evidence } : null;
    })
    .filter((c): c is GraphCandidate => c !== null)
    .sort((a, b) => b.bestSimilarity - a.bestSimilarity)
    .slice(0, limit);
}
