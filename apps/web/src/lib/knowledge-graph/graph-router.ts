import { getTopicGraph, listTopicGraphIds } from "./topic-graph";
import type { KnowledgeGraphSearchResult } from "./search";

// Cross-graph recall grouped into ranked candidate subjects. Subject selection
// itself now happens inside the single Stage-2 positioning LLM call
// (positioning-llm.ts), which receives these candidates' full topic lists; this
// module only produces the candidate set (with best similarity + sample topics
// as evidence) used to pick which graphs to hand the model.

export const DEFAULT_KG_ROUTER_CANDIDATES = 6;
const EVIDENCE_PER_GRAPH = 4;
const SUBJECT_STOP_WORDS = new Set(["and", "fundamentals", "introduction", "of", "the", "theory", "to"]);

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

function words(value: string) {
  return (value.toLocaleLowerCase().match(/[\p{L}\p{N}+#]+/gu) ?? []).filter((word) => word.length > 1);
}

function lexicalSubjectScore(query: string, subject: string): number | null {
  const queryWords = new Set(words(query));
  const subjectWords = words(subject).filter((word) => !SUBJECT_STOP_WORDS.has(word));
  if (queryWords.size === 0 || subjectWords.length === 0) return null;

  const matched = subjectWords.filter((word) => queryWords.has(word)).length;
  if (matched === 0) return null;

  // Exact subject terms are strong routing evidence, while still leaving
  // several candidates tied for genuinely broad words such as "computer".
  return 0.92 + 0.07 * (matched / subjectWords.length);
}

// Group cross-graph recall hits into ranked candidate subjects with evidence.
export function buildGraphCandidates(
  results: KnowledgeGraphSearchResult[],
  limit: number = DEFAULT_KG_ROUTER_CANDIDATES,
  query?: string,
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

  if (query) {
    for (const graphId of listTopicGraphIds()) {
      const subject = safeSubject(graphId);
      if (!subject) continue;
      const lexicalScore = lexicalSubjectScore(query, subject);
      if (lexicalScore === null) continue;

      const entry = byGraph.get(graphId) ?? { best: -Infinity, evidence: [] };
      entry.best = Math.max(entry.best, lexicalScore);
      if (!entry.evidence.includes(subject) && entry.evidence.length < EVIDENCE_PER_GRAPH) {
        entry.evidence.unshift(subject);
      }
      byGraph.set(graphId, entry);
    }
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
