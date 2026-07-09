import { createUtilityModel } from "../ai/deepagent/model";
import type { LibrarySubject, Stage2Decision } from "./positioning";
import type { KgLanguage } from "./display-name";

export type FreeformGoalGateDecision = Extract<Stage2Decision, { outcome: "out_of_library" | "fallback" }>;

export type FreeformGoalGateInput = {
  query: string;
  language: KgLanguage;
  librarySubjects: LibrarySubject[];
};

export type FreeformGoalGateInvoker = (input: { system: string; user: string }) => Promise<string>;

const defaultInvoker: FreeformGoalGateInvoker = async ({ system, user }) => {
  const model = createUtilityModel({}, { maxTokens: 512, timeoutMs: 20_000 });
  const response = await model.invoke([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
  return typeof response.content === "string" ? response.content : JSON.stringify(response.content);
};

const SYSTEM_PROMPT = [
  "You classify a learner's goal after knowledge-graph recall found no trustworthy library match.",
  "Return ONLY JSON (no prose, no markdown). Choose exactly one outcome:",
  "",
  '1. {"outcome":"out_of_library","topic":"<concise course topic in the learner language>","message":"<one warm sentence saying a custom course graph will be designed>"}',
  "   - Use this only when the query is a concrete, real, teachable topic absent from the library subjects.",
  '2. {"outcome":"fallback","message":"<ask for a more specific learning goal in the learner language>"}',
  "   - Use this when the query is too vague, nonsense, not a learning topic, or already covered by one of the library subjects.",
  "",
  "Do not force a new course for broad requests like 'learn anything' or short junk text.",
  "Match library subjects by meaning across languages, not just exact wording.",
].join("\n");

function buildUserPrompt(input: FreeformGoalGateInput): string {
  const lines = [`Learner goal: "${input.query}"`, "", "Library subjects (graphId — name):"];
  if (input.librarySubjects.length === 0) {
    lines.push("  (none)");
  } else {
    lines.push(...input.librarySubjects.map((s) => `  ${s.graphId} — ${s.subject}`));
  }
  return lines.join("\n");
}

function parseDecision(text: string): FreeformGoalGateDecision | null {
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

  if (obj.outcome === "out_of_library") {
    const topic = typeof obj.topic === "string" ? obj.topic.trim() : "";
    if (!topic) return null;
    return {
      outcome: "out_of_library",
      topic,
      message: typeof obj.message === "string" ? obj.message.trim() : undefined,
    };
  }

  if (obj.outcome === "fallback") {
    return {
      outcome: "fallback",
      message: typeof obj.message === "string" ? obj.message.trim() : undefined,
    };
  }

  return null;
}

export async function runFreeformGoalGate(
  input: FreeformGoalGateInput,
  invokeModel: FreeformGoalGateInvoker = defaultInvoker,
): Promise<FreeformGoalGateDecision | null> {
  try {
    const text = await invokeModel({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(input),
    });
    const decision = parseDecision(text);
    if (process.env.KG_POSITION_DEBUG === "1") {
      console.log("[kg-freeform-gate]", { query: input.query, decision });
    }
    return decision;
  } catch (error) {
    console.warn("[kg-freeform-gate] classification failed:", error instanceof Error ? error.message : error);
    return null;
  }
}
