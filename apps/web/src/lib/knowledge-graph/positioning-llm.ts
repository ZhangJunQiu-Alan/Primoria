import { createUtilityModel } from "../ai/deepagent/model";
import { getTopicGraph } from "./topic-graph";
import { resolveKgDisplayName, type KgLanguage } from "./display-name";
import type { PositioningMode, Stage2Decision } from "./positioning";

// Stage 2 of cold-start positioning: one retrieval-grounded LLM call that both
// picks the subject (among the candidate graphs recall surfaced) and positions
// the goal inside it. The full topic list of each candidate graph is in the
// prompt (a single graph is ~10K tokens, 3 graphs ~30K) so the model can only
// reference real ids — no hallucinated topics. It runs on the MAIN tutor model
// (createUtilityModel with no settings → AI_PROVIDER/OPENAI_MODEL), deliberately
// NOT bound to KG_ROUTER_MODEL: this is the heavy positioning decision, not the
// cheap subject router. Returns an untrusted Stage2Decision (validated by
// finalizeStage2) or null on error/parse failure (caller degrades to subject_start).

const MODES: PositioningMode[] = ["specific", "subject_start", "directed"];

export type Stage2Graph = { graphId: string; subject: string };

export type Stage2ModelInvoker = (input: { system: string; user: string }) => Promise<string>;

const defaultInvoker: Stage2ModelInvoker = async ({ system, user }) => {
  const model = createUtilityModel({}, { maxTokens: 2048, timeoutMs: 30_000 });
  const response = await model.invoke([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
  return typeof response.content === "string" ? response.content : JSON.stringify(response.content);
};

const SYSTEM_PROMPT = [
  "You position a learner's study goal inside a fixed set of subject knowledge graphs.",
  "You are given one or more candidate subjects, each with its full ordered topic list.",
  "Decide ONE of three outcomes and reply with ONLY JSON (no prose, no markdown):",
  "",
  '1. {"outcome":"positioned","graphId":"<id>","mode":"specific|subject_start|directed","startTopicId":"<id>","targetConceptId":"<id|null>","reason":"<short>"}',
  '   - subject_start: the goal is just the bare subject with no direction → start at the FIRST topic (smallest order).',
  '   - directed: the goal names a sub-area / a level / says "review" / "I already know the basics" → start at the UPSTREAM topic of that region (do NOT start at topic 1, do NOT skip past the named region).',
  '   - specific: the goal clearly targets one concept → start at that concept\'s topic and set targetConceptId to it.',
  '2. {"outcome":"clarify_subject","candidateGraphIds":["<id>",...],"message":"<warm message in the learner\'s language listing the subjects and asking which to start>"}',
  "   - use ONLY when several candidate subjects are genuinely plausible and none clearly wins.",
  '3. {"outcome":"fallback","message":"<ask for a more specific goal, in the learner\'s language>"}',
  "   - use only when nothing offered fits the goal.",
  "",
  "Rules: graphId and every topic/concept id MUST be copied verbatim from the provided graphs — never invent ids.",
  "Match on meaning across languages, not surface words. Prefer a dedicated subject over a broad one that merely mentions the topic.",
].join("\n");

function buildGraphBlock(graphId: string, subject: string, language: KgLanguage): string {
  const graph = getTopicGraph(graphId);
  const topics = [...graph.topics].sort((a, b) => a.defaultOrder - b.defaultOrder);
  const lines = topics.map((t) => {
    const concepts = t.conceptIds.map((c) => `${c.conceptId}:${resolveKgDisplayName(c, language)}`).join(", ");
    return `  [${t.defaultOrder}] ${t.topicId} — ${resolveKgDisplayName(t, language)}${concepts ? ` (concepts: ${concepts})` : ""}`;
  });
  return [`subject id=${graphId} | name=${subject}`, ...lines].join("\n");
}

function buildUserPrompt(query: string, graphs: Stage2Graph[], language: KgLanguage): string {
  return [
    `Learner goal: "${query}"`,
    "",
    "Candidate subjects (each line: [order] topicId — name (concepts)):",
    "",
    ...graphs.map((g) => buildGraphBlock(g.graphId, g.subject, language)),
  ].join("\n");
}

function parseDecision(text: string, validGraphIds: Set<string>): Stage2Decision | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const outcome = obj.outcome;

  if (outcome === "fallback") {
    return { outcome: "fallback", message: typeof obj.message === "string" ? obj.message : undefined };
  }
  if (outcome === "clarify_subject") {
    const ids = Array.isArray(obj.candidateGraphIds)
      ? obj.candidateGraphIds.filter((id): id is string => typeof id === "string")
      : [];
    return {
      outcome: "clarify_subject",
      candidateGraphIds: ids,
      message: typeof obj.message === "string" ? obj.message : undefined,
    };
  }
  if (outcome === "positioned") {
    const graphId = typeof obj.graphId === "string" ? obj.graphId : "";
    const mode = MODES.includes(obj.mode as PositioningMode) ? (obj.mode as PositioningMode) : null;
    const startTopicId = typeof obj.startTopicId === "string" ? obj.startTopicId : "";
    if (!validGraphIds.has(graphId) || !mode || !startTopicId) return null;
    return {
      outcome: "positioned",
      graphId,
      mode,
      startTopicId,
      targetConceptId: typeof obj.targetConceptId === "string" ? obj.targetConceptId : null,
      reason: typeof obj.reason === "string" ? obj.reason : undefined,
    };
  }
  return null;
}

export async function runStage2Positioning(
  input: { query: string; language: KgLanguage; graphs: Stage2Graph[] },
  invokeModel: Stage2ModelInvoker = defaultInvoker,
): Promise<Stage2Decision | null> {
  if (input.graphs.length === 0) return null;
  const validGraphIds = new Set(input.graphs.map((g) => g.graphId));
  try {
    const text = await invokeModel({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(input.query, input.graphs, input.language),
    });
    const decision = parseDecision(text, validGraphIds);
    if (process.env.KG_POSITION_DEBUG === "1") {
      console.log("[kg-stage2]", { query: input.query, graphs: [...validGraphIds], decision });
    }
    return decision;
  } catch (error) {
    console.warn("[kg-stage2] positioning failed:", error instanceof Error ? error.message : error);
    return null;
  }
}
