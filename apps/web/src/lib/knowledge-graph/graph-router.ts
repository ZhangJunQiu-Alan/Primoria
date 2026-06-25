import { createUtilityModel } from "../ai/deepagent/model";
import { getTopicGraph } from "./topic-graph";
import type { KnowledgeGraphSearchResult } from "./search";

// LLM-based coarse routing: pick the single subject KG a learner's goal belongs
// to. Cross-graph vector recall narrows the field to the graphs that actually
// surfaced; the model only chooses among those candidates. This handles the
// cases raw cosine cannot: aliases, cross-language queries, and near-miss
// subjects (e.g. "数值分析" vs A-Level math). It is bounded by the candidate set;
// when it cannot pick a subject it returns null and the caller treats cold-start
// as a fallback ("ask for a more specific goal").

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

function buildPrompt(query: string, candidates: GraphCandidate[]): string {
  const lines = candidates.map(
    (c, i) =>
      `${i + 1}. id=${c.graphId} | subject=${c.subject}` +
      (c.evidence.length ? ` | sample topics: ${c.evidence.join("; ")}` : ""),
  );
  return [
    `Learner goal: "${query}"`,
    "",
    "Candidate subjects (retrieved by semantic search; may include near-miss subjects):",
    ...lines,
    "",
    "Pick the ONE subject id that best matches the learner's intent by meaning.",
    "The goal may be in any language; match on meaning, not surface words.",
    "If a dedicated subject exists, prefer it over a broader subject that merely mentions the topic.",
    'If none is a reasonable fit, use null.',
    'Reply with ONLY JSON, no prose: {"graphId": "<one id from the list, or null>"}',
  ].join("\n");
}

function parseGraphId(text: string, valid: Set<string>): string | null {
  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as { graphId?: unknown };
    const id = typeof parsed.graphId === "string" ? parsed.graphId : null;
    return id && valid.has(id) ? id : null;
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT =
  "You route a learner's study goal to exactly one subject from a fixed candidate list. " +
  "You never invent ids; you only choose from the provided candidates or return null.";

// Returns the chosen graphId, or null to signal "fall back to deterministic routing".
export async function routeDominantGraph(
  query: string,
  candidates: GraphCandidate[],
): Promise<string | null> {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0].graphId;

  const valid = new Set(candidates.map((c) => c.graphId));

  try {
    const model = createUtilityModel(
      {
        // Pin routing to the OpenAI-compatible endpoint regardless of the tutor's
        // AI_PROVIDER. The router is a cheap utility classifier, not the tutor;
        // switching the tutor to an anthropic-compatible model must not break (or
        // slow down) cold-start positioning. KG_ROUTER_MODEL selects a small
        // model on that endpoint; it falls back to OPENAI_MODEL.
        provider: "openai-compatible",
        baseUrl: process.env.OPENAI_BASE_URL,
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.KG_ROUTER_MODEL || process.env.OPENAI_MODEL,
      },
      // Headroom for reasoning models: they spend ~120-160 tokens thinking
      // before emitting the JSON. Too small a cap truncates before the answer.
      { temperature: 0, maxTokens: 1024 },
    );
    const response = await model.invoke([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildPrompt(query, candidates) },
    ]);
    const text = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    const picked = parseGraphId(text, valid);
    if (process.env.KG_ROUTER_DEBUG === "1") {
      console.log("[kg-router]", { query, candidates: [...valid], picked });
    }
    return picked;
  } catch (error) {
    console.warn("[kg-router] routing failed, falling back:", error instanceof Error ? error.message : error);
    return null;
  }
}
