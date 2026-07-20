import { z } from "zod";

import { invokeJson } from "../ai/course-generation/model-json";
import { fastTierSettings } from "../ai/deepagent/model";
import { getTopicGraph } from "./topic-graph";
import { resolveKgDisplayName, type KgLanguage } from "./display-name";
import type { PositioningMode, Stage2Decision } from "./positioning";

// Stage 2 of cold-start positioning: one retrieval-grounded LLM call that both
// picks the subject (among the candidate graphs recall surfaced) and positions
// the goal inside it. The full topic list of each candidate graph is in the
// prompt (a single graph is ~10K tokens, 3 graphs ~30K) so the model can only
// reference real ids — no hallucinated topics. It runs on the configured fast
// model tier because this is a bounded structured-routing task. Returns an
// untrusted Stage2Decision (validated by
// finalizeStage2) or null on error/parse failure (caller degrades safely in
// production; the evaluator opts into fail-closed model errors).

const MODES = ["specific", "subject_start", "directed", "goal_scoped"] as const;

export type Stage2Graph = { graphId: string; subject: string };

export type Stage2ModelInvoker = (input: { system: string; user: string }) => Promise<string>;

const Stage2DecisionSchema = z.discriminatedUnion("outcome", [
  z.object({
    outcome: z.literal("positioned"),
    graphId: z.string(),
    mode: z.enum(MODES),
    startTopicId: z.string(),
    targetConceptId: z.string().nullable().optional(),
    targetConceptIds: z.array(z.string()).optional(),
    reason: z.string().optional(),
  }),
  z.object({
    outcome: z.literal("clarify_subject"),
    candidateGraphIds: z.array(z.string()),
    message: z.string().optional(),
  }),
  z.object({
    outcome: z.literal("out_of_library"),
    topic: z.string().optional(),
    message: z.string().optional(),
  }),
  z.object({
    outcome: z.literal("fallback"),
    message: z.string().optional(),
  }),
]);

const defaultInvoker: Stage2ModelInvoker = async ({ system, user }) => {
  const response = await invokeJson({
    system,
    user,
    settings: fastTierSettings(),
    schema: Stage2DecisionSchema,
    schemaName: "kg_position",
    maxTokens: 4096,
    timeoutMs: 45_000,
  });
  return JSON.stringify(response);
};

const SYSTEM_PROMPT = [
  "You route a learner's study goal to the right subject in a course library, or declare it outside the library.",
  "You are given: (a) one or more candidate subjects with their full ordered topic lists, and (b) the complete list of every library subject (id + name only).",
  "Decide ONE of four outcomes and reply with ONLY JSON (no prose, no markdown):",
  "",
  '1. {"outcome":"positioned","graphId":"<id>","mode":"specific|subject_start|directed|goal_scoped","startTopicId":"<id>","targetConceptId":"<id|null>","targetConceptIds":["<id>",...],"reason":"<short>"}',
  '   - subject_start: the goal is just the bare subject with no direction → start at the FIRST topic (smallest order).',
  '   - directed: the goal names a sub-area / a level / says "review" / "I already know the basics" → start at the UPSTREAM topic of that region (do NOT start at topic 1, do NOT skip past the named region).',
  '   - specific: the goal clearly targets one concept → start at that concept\'s topic and set targetConceptId to it.',
  '   - goal_scoped: the learner names a primary subject but qualifies it by a purpose, application, audience, or desired outcome (for example "linear algebra for deep learning"). Select only concepts needed for that goal, not the whole subject. Set targetConceptIds when the graph is shown.',
  '   - If a goal-scoped subject is in the library list but its topics are NOT shown, return goal_scoped with that graphId, startTopicId "root", and an empty targetConceptIds array; a second grounded selector will resolve the concepts.',
  '2. {"outcome":"clarify_subject","candidateGraphIds":["<id>",...],"message":"<warm message in the learner\'s language listing the subjects and asking which to start>"}',
  "   - use ONLY when several library subjects are genuinely plausible and none clearly wins.",
  '3. {"outcome":"out_of_library","topic":"<concise course topic in the learner\'s language>","message":"<one warm sentence, in the learner\'s language, saying a custom course will be designed for this topic>"}',
  "   - use when no ONE library subject covers every named learning outcome. A conjunction such as LLM architecture AND building AI applications is out of library when the library covers architecture but not application building. Do NOT force partial coverage into the closest subject.",
  '4. {"outcome":"fallback","message":"<ask for a more specific goal, in the learner\'s language>"}',
  "   - use only when the goal is too vague or is not a learning topic at all.",
  "",
  "Rules: graphId and every topic/concept id MUST be copied verbatim from the provided data — never invent ids.",
  "Match on meaning across languages, not surface words. Prefer a dedicated subject over a broad one that merely mentions the topic.",
  "Distinguish a purpose from a second outcome: 'linear algebra for deep learning' is goal_scoped linear algebra; 'deep learning and production AI application engineering' is out_of_library when application engineering is absent.",
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

function buildUserPrompt(
  query: string,
  graphs: Stage2Graph[],
  librarySubjects: Stage2Graph[],
  language: KgLanguage,
): string {
  const lines = [
    `Learner goal: "${query}"`,
    "",
    "Candidate subjects (each line: [order] topicId — name (concepts)):",
    "",
    ...graphs.map((g) => buildGraphBlock(g.graphId, g.subject, language)),
  ];
  if (librarySubjects.length > 0) {
    lines.push("", "All library subjects (graphId — name):");
    lines.push(...librarySubjects.map((s) => `  ${s.graphId} — ${s.subject}`));
  }
  return lines.join("\n");
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
  if (outcome === "out_of_library") {
    return {
      outcome: "out_of_library",
      topic: typeof obj.topic === "string" ? obj.topic : undefined,
      message: typeof obj.message === "string" ? obj.message : undefined,
    };
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
  const shorthandMode = MODES.includes(outcome as PositioningMode) ? (outcome as PositioningMode) : null;
  if (outcome === "positioned" || shorthandMode) {
    const graphId = typeof obj.graphId === "string" ? obj.graphId : "";
    const mode = shorthandMode ?? (MODES.includes(obj.mode as PositioningMode) ? (obj.mode as PositioningMode) : null);
    const startTopicId = typeof obj.startTopicId === "string" ? obj.startTopicId : "";
    if (!validGraphIds.has(graphId) || !mode || !startTopicId) return null;
    return {
      outcome: "positioned",
      graphId,
      mode,
      startTopicId,
      targetConceptId: typeof obj.targetConceptId === "string" ? obj.targetConceptId : null,
      targetConceptIds: Array.isArray(obj.targetConceptIds)
        ? obj.targetConceptIds.filter((id): id is string => typeof id === "string")
        : [],
      reason: typeof obj.reason === "string" ? obj.reason : undefined,
    };
  }
  return null;
}

export async function runStage2Positioning(
  input: {
    query: string;
    language: KgLanguage;
    graphs: Stage2Graph[];
    librarySubjects?: Stage2Graph[];
    failOnModelError?: boolean;
  },
  invokeModel: Stage2ModelInvoker = defaultInvoker,
): Promise<Stage2Decision | null> {
  if (input.graphs.length === 0) return null;
  const librarySubjects = input.librarySubjects ?? [];
  const validGraphIds = new Set([...input.graphs, ...librarySubjects].map((g) => g.graphId));
  try {
    const text = await invokeModel({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(input.query, input.graphs, librarySubjects, input.language),
    });
    const decision = parseDecision(text, validGraphIds);
    if (!decision && input.failOnModelError) {
      throw new Error(`KG Stage 2 returned an invalid decision. Preview: ${text.replace(/\s+/g, " ").slice(0, 200)}`);
    }
    if (process.env.KG_POSITION_DEBUG === "1") {
      console.log("[kg-stage2]", { query: input.query, graphs: [...validGraphIds], decision });
    }
    return decision;
  } catch (error) {
    if (input.failOnModelError) throw error;
    console.warn("[kg-stage2] positioning failed:", error instanceof Error ? error.message : error);
    return null;
  }
}
