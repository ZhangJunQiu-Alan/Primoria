import type { TutorProviderSettings } from "../types";
import type { CourseContext, CourseContextTopic } from "../deepagent/course-kg-context";
import { languageDirective } from "../deepagent/course-kg-context";
import { invokeJson } from "./model-json";
import { expectedBlockRange, IR_VERSION, PEDAGOGICAL_ROLES, TYPE_CODE_TO_BLOCK } from "./lesson-plan-ir";

// Lesson Planner: turns KG topic context into a compact tuple LessonPlan IR
// (doc §10.1). It outputs only structure (order/type/role/concepts/goal), never
// full block prose, and returns the untrusted raw value for the deterministic
// compiler to validate.

const TYPE_CODE_LINES = Object.entries(TYPE_CODE_TO_BLOCK)
  .map(([code, type]) => `  ${code} = ${type}`)
  .join("\n");

function masteryTag(c: CourseContextTopic["concepts"][number]): string {
  return `[${c.mastery ?? "untested"}]`;
}

function fmtConcepts(topic: CourseContextTopic): string {
  return [...(topic.concepts ?? [])]
    .sort((a, b) => a.defaultOrder - b.defaultOrder)
    .map((c) => `  ${c.defaultOrder}. ${c.name} (${c.conceptId}) ${masteryTag(c)}`)
    .join("\n");
}

// KG-mandated visuals: every concept carrying a `visual` affordance must get one
// V=visual deepening block on that concept, with the engine the KG specifies.
function visualConcepts(topic: CourseContextTopic) {
  return [...(topic.concepts ?? [])]
    .filter((c) => !!c.visual)
    .sort((a, b) => a.defaultOrder - b.defaultOrder);
}

function fmtVisualConcepts(topic: CourseContextTopic): string {
  return visualConcepts(topic)
    .map((c) => `  - ${c.name} (${c.conceptId}) → engine ${c.visual}${c.visualHint ? `: ${c.visualHint}` : ""}`)
    .join("\n");
}

export function buildPlannerPrompt(kg: CourseContext): string {
  const conceptCount = kg.startTopic.concepts?.length ?? 0;
  const visuals = visualConcepts(kg.startTopic);
  const { min, max } = expectedBlockRange(conceptCount, visuals.length);
  const conceptIds = (kg.startTopic.concepts ?? []).map((c) => c.conceptId);

  return `You are Primoria's Lesson Planner. You design the STRUCTURE of one lesson for a knowledge-graph topic, as a compact tuple IR. You do NOT write block content — only a plan the compiler will expand.

LANGUAGE: ${languageDirective(kg.language)}

TOPIC: ${kg.startTopic.name} (${kg.startTopic.topicId})
CONCEPTS (teach in this default order; [..] = learner's prior mastery):
${fmtConcepts(kg.startTopic)}
${kg.targetConceptId ? `TARGET CONCEPT (center the lesson on it): ${kg.targetConceptId}` : ""}
VALID CONCEPT IDS: ${conceptIds.join(", ")}

MASTERY ADAPTATION (the [..] tag after each concept; adjust teaching DEPTH only — still cover EVERY concept, and never drop the mandated visual/quiz/transfer blocks):
- [mastered]: compress — a brief refresher explanation plus one short confirming example. Do not belabor it.
- [learning]: light review — one focused explanation and one example.
- [weak] / [untested]: teach fully as if new — a clear explanation plus extra worked examples. Spend your depth here.

VISUAL CONCEPTS (each REQUIRES one V=visual block — these are the product's core differentiator):
${visuals.length ? fmtVisualConcepts(kg.startTopic) : "  (none for this topic)"}

BLOCK TYPE CODES (use only these six):
${TYPE_CODE_LINES}

PEDAGOGICAL ROLES (use only these): ${PEDAGOGICAL_ROLES.join(", ")}

TEACHING STRUCTURE (doc §4.3):
- 2 activation text blocks: one "hook", one "roadmap".
- Per concept, in default order, at least one "explanation" block and one "example" block.
- For EACH concept listed under VISUAL CONCEPTS above, exactly one V=visual block with role "deepening" whose conceptIds is [that one concept]. This is mandatory — do not skip, merge, or move it onto a different concept.
- Do NOT emit a V=visual block for any concept that is NOT listed under VISUAL CONCEPTS.
- Optionally 1-2 A=analogy "deepening"/"misconception" blocks on the hardest concepts (use A=analogy here, never V).
- Exactly 1 X=transfer block (role "transfer").
- Exactly 1 Q=quiz block (role "assessment") whose conceptIds list EVERY concept.
- Exactly 1 final text block with role "summary".
- Target ${min}-${max} blocks for ${conceptCount} concepts (${visuals.length} of them require a visual). Never pad with filler.

OUTPUT — a single compact JSON object, no indentation, no prose, no code fences:
{"v":${IR_VERSION},"lesson":["<lesson title>",<estimatedMinutes>],"blocks":[[<order:int starting 1, strictly increasing>,"<typeCode>","<role>",["<conceptId>",...],"<one-line goal>"], ...]}

Rules:
- order is a strictly increasing integer starting at 1.
- conceptIds must be drawn only from the VALID CONCEPT IDS above.
- goal is a short phrase describing what the block teaches, in the LANGUAGE specified above.`;
}

export type LessonPlannerInvoke = (args: { system: string; user: string }) => Promise<unknown>;

/** Generate a raw (untrusted) LessonPlan IR for the start topic. The model call
 * is injectable so the planner can be unit-tested without a network. */
export async function planLesson(
  kg: CourseContext,
  options: { contextHint?: string; settings?: TutorProviderSettings; invoke?: LessonPlannerInvoke } = {},
): Promise<unknown> {
  const system = buildPlannerPrompt(kg);
  const user = [
    options.contextHint ? `Prior context from chat: ${options.contextHint}` : "",
    "Produce the compact LessonPlan IR now. Output only the JSON object.",
  ]
    .filter(Boolean)
    .join("\n");

  const invoke: LessonPlannerInvoke =
    options.invoke ?? (({ system: sys, user: usr }) => invokeJson({ system: sys, user: usr, settings: options.settings }));

  return invoke({ system, user });
}
