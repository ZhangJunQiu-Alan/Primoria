import type { TutorProviderSettings } from "../types";
import type { CourseContext, CourseContextTopic } from "../deepagent/course-kg-context";
import { languageDirective } from "../deepagent/course-kg-context";
import { knowledgeBackgroundDirective } from "../../learner-profile/types";
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

// KG visual affordances are strong hints, not hard quotas. The planner decides
// whether/how many V=visual blocks are useful, and the compiler validates media
// density and concept binding instead of forcing exactly one visual per hint.
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
  const { min, max } = expectedBlockRange(conceptCount);
  const conceptIds = (kg.startTopic.concepts ?? []).map((c) => c.conceptId);

  return `You are Primoria's Lesson Planner. You design the STRUCTURE of one lesson for a knowledge-graph topic, as a compact tuple IR. You do NOT write block content — only a plan the compiler will expand.

LANGUAGE: ${languageDirective(kg.language)}
${knowledgeBackgroundDirective(kg.knowledgeBackground)}

TOPIC: ${kg.startTopic.name} (${kg.startTopic.topicId})
CONCEPTS (teach in this default order; [..] = learner's prior mastery):
${fmtConcepts(kg.startTopic)}
${kg.targetConceptId ? `TARGET CONCEPT (center the lesson on it): ${kg.targetConceptId}` : ""}
VALID CONCEPT IDS: ${conceptIds.join(", ")}

MASTERY ADAPTATION (the [..] tag after each concept; adjust teaching DEPTH only — still cover EVERY concept, and never drop per-concept quiz or transfer blocks):
- [mastered]: compress — a brief refresher explanation plus one short confirming example. Do not belabor it.
- [learning]: light review — one focused explanation and one example.
- [weak] / [untested]: teach fully as if new — a clear explanation plus extra worked examples. Spend your depth here.

VISUAL AFFORDANCE HINTS (strong hints, not quotas; V=visual is the product's core differentiator when it teaches a mechanism):
${visuals.length ? fmtVisualConcepts(kg.startTopic) : "  (none for this topic)"}

BLOCK TYPE CODES (use only these):
${TYPE_CODE_LINES}

IMAGE vs VISUAL (I=image is a STATIC cognitive anchor; V=visual is an INTERACTIVE mechanism model):
- Use I=image when the learner needs to SEE a concrete object, structure, scene, or analogy picture (e.g. a chloroplast cross-section, real lab apparatus, "a stack is like a pile of plates"). Static, look-once-to-recognize.
- Use V=visual when the learner needs to OPERATE variables, watch a process, or understand a mechanism (sliders, sorting steps, gradient descent). Try-it-to-understand.
- I=image is OPTIONAL and never decorative: only add one when a concrete/spatial/analogy picture materially helps recognition or memory. The same concept may have both an I and a V when they serve different goals.
- Never use I=image for precise text, formulas, axes, labels, or chemical notation — those must be a V=visual (Mermaid/ECharts/Math Explorer).

CODE ELIGIBILITY (C=code is opt-in, never template filler):
- Default to T=text examples, I=image, V=visual, and A=analogy across biology, chemistry, physics, math, and general conceptual lessons.
- Use C=code ONLY when the topic/user goal is about programming languages, algorithms/data structures, web/software engineering, numerical/scientific computing, machine-learning implementation, or explicitly asks to write/run code, use a programming language, code implementation, or implement an algorithm/function/API/interface.
- Do NOT treat generic "implementation" / "实现" language as code intent by itself (e.g. "self-actualization" or "实现共同富裕" is not code-eligible).
- Do not emit C=code just to satisfy an example slot. If code is not naturally the thing being learned, use T=text with role "example".

PEDAGOGICAL ROLES (use only these): ${PEDAGOGICAL_ROLES.join(", ")}

TEACHING STRUCTURE (doc §4.3):
- 2 activation text blocks: one "hook", one "roadmap".
- Per concept, in default order, at least one "explanation" block and one "example" block.
- For each concept, place exactly one Q=quiz block (role "assessment") at that concept loop's close. Its conceptIds MUST be exactly [that one concept], not all concepts.
- Use I=image and V=visual when they materially teach recognition or mechanism. Combined I+V count should generally target 30%-45% of all blocks as a guideline (but you may adjust this between 15% and 60% based on the concept's actual pedagogical value; do not add decorative or filler media just to satisfy a number). Every media block must bind to conceptIds and have a distinct learning goal.
- V=visual may target any concept when it has a clear mechanism/process/variable/state/comparison purpose; visual affordance hints above should bias the choice but do not create an exact-one quota.
- Optionally 1-2 A=analogy "deepening"/"misconception" blocks on the hardest concepts (use A=analogy here, never V).
- Optionally I=image "example"/"deepening" blocks for concrete/spatial/analogy concepts (see IMAGE vs VISUAL above). Each I=image MUST list exactly the one conceptId it anchors and have a clear goal. An image never replaces a concept's required explanation/example text block.
- Exactly 1 transfer block with role "transfer"; use X=transfer for prose/application transfer, or V=visual with role "transfer" when an interactive transfer simulation materially helps.
- Exactly 1 final text block with role "summary".
- Target ${min}-${max} blocks for ${conceptCount} concepts. Never pad with filler.

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
