import { z } from "zod";

import { invokeJson } from "../ai/course-generation/model-json";
import { fastTierSettings } from "../ai/deepagent/model";
import { resolveKgDisplayName, type KgLanguage } from "./display-name";
import { getTopicGraph } from "./topic-graph";

export type GoalScopeSelection =
  | { coverage: "full"; targetConceptIds: string[]; reason: string }
  | { coverage: "partial"; targetConceptIds: string[]; reason: string };

export type GoalScopeModelInvoker = (input: { system: string; user: string }) => Promise<string>;

const MAX_TARGET_CONCEPTS = 8;

const GoalScopeSchema = z.object({
  coverage: z.enum(["full", "partial"]),
  targetConceptIds: z.array(z.string()).max(MAX_TARGET_CONCEPTS),
  reason: z.string(),
});

const defaultInvoker: GoalScopeModelInvoker = async ({ system, user }) => {
  const response = await invokeJson({
    system,
    user,
    settings: fastTierSettings(),
    schema: GoalScopeSchema,
    schemaName: "goal_scope",
    maxTokens: 2048,
    timeoutMs: 45_000,
  });
  return JSON.stringify(response);
};

const SYSTEM_PROMPT = [
  "You select the smallest useful concept scope for a learner's goal inside one curated knowledge graph.",
  "The selected concepts are TERMINAL learning targets. Their hard prerequisites are added automatically, so do not select every prerequisite.",
  "Reply with ONLY JSON:",
  '{"coverage":"full|partial","targetConceptIds":["<real concept id>",...],"reason":"<short>"}',
  "",
  "Rules:",
  `- Select 1-${MAX_TARGET_CONCEPTS} concepts only when this graph covers the learner's requested subject outcomes.`,
  "- `full` means the graph can supply the requested knowledge. An external purpose such as 'linear algebra for deep learning' may still be full when this graph covers the linear-algebra knowledge and the purpose only shapes examples.",
  "- `partial` means a named outcome is missing. For example, a deep-learning graph does not fully cover building LLM applications, RAG, deployment, or agent tooling.",
  "- A modifier such as 'for X', 'through X', 'centered on X', or an application context requires a tailored subset, never the whole graph by default.",
  "- Prefer the minimal sufficient targets. Exclude historically adjacent material that does not help the stated goal.",
  "- Copy concept ids exactly from the provided graph. Never invent ids.",
].join("\n");

function graphPrompt(query: string, graphId: string, language: KgLanguage) {
  const graph = getTopicGraph(graphId);
  const topics = [...graph.topics]
    .sort((a, b) => a.defaultOrder - b.defaultOrder)
    .map((topic) => {
      const concepts = [...topic.conceptIds]
        .sort((a, b) => a.defaultOrder - b.defaultOrder)
        .map((concept) => `${concept.conceptId}:${resolveKgDisplayName(concept, language)}`)
        .join(", ");
      return `[${topic.defaultOrder}] ${topic.topicId} — ${resolveKgDisplayName(topic, language)} (${concepts})`;
    });
  return [`Learner goal: "${query}"`, `Graph: ${graph.graphId} — ${graph.subject}`, ...topics].join("\n");
}

export function parseGoalScopeSelection(text: string, graphId: string): GoalScopeSelection | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const value = parsed as Record<string, unknown>;
  if (value.coverage !== "full" && value.coverage !== "partial") return null;

  const graph = getTopicGraph(graphId);
  const validIds = new Set(graph.topics.flatMap((topic) => topic.conceptIds.map((concept) => concept.conceptId)));
  const targetConceptIds = Array.isArray(value.targetConceptIds)
    ? [...new Set(value.targetConceptIds.filter((id): id is string => typeof id === "string" && validIds.has(id)))].slice(
        0,
        MAX_TARGET_CONCEPTS,
      )
    : [];
  if (value.coverage === "full" && targetConceptIds.length === 0) return null;
  return {
    coverage: value.coverage,
    targetConceptIds,
    reason: typeof value.reason === "string" ? value.reason.trim().slice(0, 240) : "",
  };
}

export async function selectGoalScope(
  input: { query: string; graphId: string; language: KgLanguage; failOnModelError?: boolean },
  invokeModel: GoalScopeModelInvoker = defaultInvoker,
): Promise<GoalScopeSelection | null> {
  try {
    const text = await invokeModel({
      system: SYSTEM_PROMPT,
      user: graphPrompt(input.query, input.graphId, input.language),
    });
    const selection = parseGoalScopeSelection(text, input.graphId);
    if (!selection && input.failOnModelError) throw new Error("Goal-scope selector returned an invalid decision");
    return selection;
  } catch (error) {
    if (input.failOnModelError) throw error;
    console.warn("[kg-goal-scope] selection failed:", error instanceof Error ? error.message : error);
    return null;
  }
}
