import type { TutorProviderSettings } from "../types";
import type { CourseContext, CourseContextTopic } from "../deepagent/course-kg-context";
import { invokeJson } from "./model-json";
import { expectedBlockRange, IR_VERSION, PEDAGOGICAL_ROLES, TYPE_CODE_TO_BLOCK } from "./lesson-plan-ir";

// Lesson Planner: turns KG topic context into a compact tuple LessonPlan IR
// (doc §10.1). It outputs only structure (order/type/role/concepts/goal), never
// full block prose, and returns the untrusted raw value for the deterministic
// compiler to validate.

const TYPE_CODE_LINES = Object.entries(TYPE_CODE_TO_BLOCK)
  .map(([code, type]) => `  ${code} = ${type}`)
  .join("\n");

function fmtConcepts(topic: CourseContextTopic): string {
  return [...(topic.concepts ?? [])]
    .sort((a, b) => a.defaultOrder - b.defaultOrder)
    .map((c) => `  ${c.defaultOrder}. ${c.name} (${c.conceptId})`)
    .join("\n");
}

export function buildPlannerPrompt(kg: CourseContext): string {
  const conceptCount = kg.startTopic.concepts?.length ?? 0;
  const { min, max } = expectedBlockRange(conceptCount);
  const conceptIds = (kg.startTopic.concepts ?? []).map((c) => c.conceptId);

  return `You are Primoria's Lesson Planner. You design the STRUCTURE of one lesson for a knowledge-graph topic, as a compact tuple IR. You do NOT write block content — only a plan the compiler will expand.

TOPIC: ${kg.startTopic.name} (${kg.startTopic.topicId})
CONCEPTS (teach in this default order):
${fmtConcepts(kg.startTopic)}
${kg.targetConceptId ? `TARGET CONCEPT (center the lesson on it): ${kg.targetConceptId}` : ""}
VALID CONCEPT IDS: ${conceptIds.join(", ")}

BLOCK TYPE CODES (use only these six):
${TYPE_CODE_LINES}

PEDAGOGICAL ROLES (use only these): ${PEDAGOGICAL_ROLES.join(", ")}

TEACHING STRUCTURE (doc §4.3):
- 2 activation text blocks: one "hook", one "roadmap".
- Per concept, in default order, at least one "explanation" block and one "example" block.
- 2-3 "deepening"/"misconception" blocks concentrated on the hardest 1-2 concepts (use A=analogy or V=visual here).
- Exactly 1 X=transfer block (role "transfer").
- Exactly 1 Q=quiz block (role "assessment") whose conceptIds list EVERY concept.
- Exactly 1 final text block with role "summary".
- At most ONE V=visual block in the whole lesson.
- Target ${min}-${max} blocks for ${conceptCount} concepts. Hard range 12-20. Never pad with filler.

OUTPUT — a single compact JSON object, no indentation, no prose, no code fences:
{"v":${IR_VERSION},"lesson":["<lesson title>",<estimatedMinutes>],"blocks":[[<order:int starting 1, strictly increasing>,"<typeCode>","<role>",["<conceptId>",...],"<one-line goal>"], ...]}

Rules:
- order is a strictly increasing integer starting at 1.
- conceptIds must be drawn only from the VALID CONCEPT IDS above.
- goal is a short phrase describing what the block teaches, in the topic's language.`;
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
