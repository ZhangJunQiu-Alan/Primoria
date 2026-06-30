import type { TutorProviderSettings } from "../types";
import type { CourseContext, CourseContextTopic } from "../deepagent/course-kg-context";
import { languageDirective } from "../deepagent/course-kg-context";
import { knowledgeBackgroundDirective } from "../../learner-profile/types";
import { invokeJson } from "./model-json";
import {
  expectedBlockRange,
  IR_VERSION,
  PEDAGOGICAL_ROLES,
  TYPE_CODE_TO_BLOCK,
  WRITER_INSTRUCTION_MAX,
  WRITER_INSTRUCTION_MIN,
  type TypeCode,
} from "./lesson-plan-ir";

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

// A deterministic, always-valid scaffold for the common 1-3 concept topic. The
// planner fills content into this instead of solving the block-count / media-% /
// quiz-per-concept constraints in its head (the recurring CoverageError source).
// Counts are pre-computed to land inside expectedBlockRange AND the 30%-45% media
// band, mirroring the doc §4.3 ideal structure. Returns null for 0 or >3 concepts
// (rare), where the soft range guidance still applies.
function buildLessonSkeleton(topic: CourseContextTopic): {
  text: string;
  targetBlocks: number;
  quizCount: number;
  mediaCount: number;
  mediaPct: number;
} | null {
  const concepts = [...(topic.concepts ?? [])].sort((a, b) => a.defaultOrder - b.defaultOrder);
  if (concepts.length < 1 || concepts.length > 3) return null;

  const rows: string[] = [];
  let order = 0;
  const add = (code: TypeCode, role: string, cids: string[], note: string) => {
    order += 1;
    rows.push(`  ${order}. ${code}=${TYPE_CODE_TO_BLOCK[code]} role=${role} conceptIds=[${cids.join(", ")}] — ${note}`);
  };
  const ids = concepts.map((c) => c.conceptId);

  add("T", "hook", [ids[0]], "counter-intuitive or real-life hook");
  add("T", "roadmap", ids, "map the lesson's concept path");
  for (const c of concepts) {
    add("T", "explanation", [c.conceptId], `introduce ${c.name}`);
    add("T", "example", [c.conceptId], `worked example / application for ${c.name}`);
    add("I", "example", [c.conceptId], `static anchor image for ${c.name} — swap to V=visual if no concrete picture helps, but do NOT drop it`);
    add("V", "deepening", [c.conceptId], `interactive mechanism for ${c.name}`);
    add("Q", "assessment", [c.conceptId], `closing quiz for ${c.name} (conceptIds = exactly [${c.conceptId}])`);
  }
  add("V", "transfer", ids, "interactive transfer combining the concepts — keep it a media block to stay in the 30%-45% band");
  add("T", "summary", ids, "metacognitive wrap-up");

  const targetBlocks = order;
  const quizCount = concepts.length;
  const mediaCount = concepts.length * 2 + 1; // image + visual per concept, plus the transfer visual
  const mediaPct = Math.round((mediaCount / targetBlocks) * 100);
  return { text: rows.join("\n"), targetBlocks, quizCount, mediaCount, mediaPct };
}

export function buildPlannerPrompt(kg: CourseContext): string {
  const conceptCount = kg.startTopic.concepts?.length ?? 0;
  const visuals = visualConcepts(kg.startTopic);
  const { min, max } = expectedBlockRange(conceptCount);
  const conceptIds = (kg.startTopic.concepts ?? []).map((c) => c.conceptId);
  const skeleton = buildLessonSkeleton(kg.startTopic);
  const targetsSection = skeleton
    ? `
EXACT TARGETS FOR THIS LESSON (${conceptCount} concept${conceptCount === 1 ? "" : "s"}) — hit these numbers exactly:
- Produce EXACTLY ${skeleton.targetBlocks} blocks (inside the ${min}-${max} window).
- EXACTLY ${skeleton.quizCount} Q=quiz block${skeleton.quizCount === 1 ? "" : "s"}: one per concept, each with conceptIds = exactly that single concept.
- ${skeleton.mediaCount} media blocks (I=image + V=visual together) = ${skeleton.mediaPct}%, inside the required 30%-45%.
- Exactly 1 transfer block and exactly 1 summary block.

RECOMMENDED SKELETON — fill real content into this exact scaffold, keeping the same block COUNT, quiz count, and media count. The note after each row is only a planning hint; every final JSON block must still carry its own concrete writerInstruction. You MAY swap an I=image for a V=visual when no concrete picture helps, but NEVER drop a media block or merge two blocks:
${skeleton.text}
`
    : "";

  return `You are Primoria's Lesson Planner. You are the teaching DESIGNER: you design the structure of one lesson for a knowledge-graph topic AND, for every block, a concrete execution brief (writerInstruction) that tells the Block Writer exactly how to write it. You do NOT write block content — the Writer executes your briefs.

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
- Use I=image and V=visual when they materially teach recognition or mechanism. Combined I+V count MUST be 30%-45% of all blocks (image + visual together; visual-first but not a hard per-concept quota). Every media block must bind to conceptIds and have a distinct learning goal.
- V=visual may target any concept when it has a clear mechanism/process/variable/state/comparison purpose; visual affordance hints above should bias the choice but do not create an exact-one quota.
- Optionally 1-2 A=analogy "deepening"/"misconception" blocks on the hardest concepts (use A=analogy here, never V).
- Optionally I=image "example"/"deepening" blocks for concrete/spatial/analogy concepts (see IMAGE vs VISUAL above). Each I=image MUST list exactly the one conceptId it anchors and have a clear goal. An image never replaces a concept's required explanation/example text block.
- Exactly 1 transfer block with role "transfer"; use X=transfer for prose/application transfer, or V=visual with role "transfer" when an interactive transfer simulation materially helps.
- Exactly 1 final text block with role "summary".
- Target ${min}-${max} blocks for ${conceptCount} concepts. Never pad with filler.
${targetsSection}
WRITER INSTRUCTION (you write one per block; it is the Writer's execution brief, NOT the block content):
- 1-2 concise sentences (${WRITER_INSTRUCTION_MIN}-${WRITER_INSTRUCTION_MAX} characters), in the LANGUAGE specified above.
- Give the Writer the specific angle, example style, intuition build-up, or constraint for THIS exact block (e.g. "open with a guessing game, introduce the formula only after the learner feels why uncertainty matters").
- Say whether this block needs an example, counter-example, analogy, or intuition warm-up, and how it serves its role.
- Say how to avoid repeating the adjacent blocks (do not re-explain the roadmap, do not restate the previous example).
- For visual/quiz/image/code blocks, name the interaction, checkpoint, or thing to make concrete.
- Do NOT restate the goal verbatim, do NOT write the block content, do NOT include JSON/schema instructions, do NOT mention unrelated concepts.

OUTPUT — a single compact JSON object, no indentation, no prose, no code fences. Each block is an OBJECT with named keys (never a positional array):
{"v":${IR_VERSION},"lesson":{"title":"<lesson title>","minutes":<int>},"blocks":[{"order":<int>,"type":"<typeCode>","role":"<role>","conceptIds":["<conceptId>",...],"goal":"<one-line goal>","writerInstruction":"<execution brief for the writer>"}, ...]}

EXAMPLE (shape only — do NOT copy this content; use the real topic, concepts, and language above):
{"v":${IR_VERSION},"lesson":{"title":"Example Lesson","minutes":30},"blocks":[{"order":1,"type":"T","role":"hook","conceptIds":["c1"],"goal":"spark curiosity with a real case","writerInstruction":"Open with a surprising real-life situation and end by naming the concept. Do not explain the full definition yet."},{"order":2,"type":"T","role":"roadmap","conceptIds":["c1","c2"],"goal":"map the two concepts","writerInstruction":"State the two questions the lesson answers in order; keep it to a 2-sentence map, do not start teaching c1."},{"order":3,"type":"V","role":"deepening","conceptIds":["c1"],"goal":"operate the mechanism","writerInstruction":"Give one slider that drives the mechanism live and prompt the learner to predict before dragging."}]}

Rules:
- order is a strictly increasing integer starting at 1, written as a JSON NUMBER (not a quoted string).
- type and role use only the codes/roles listed above; conceptIds must be drawn only from the VALID CONCEPT IDS above.
- goal is a short phrase describing what the block teaches, in the LANGUAGE specified above.
- writerInstruction is REQUIRED on every block and must be specific to that block — never empty, never generic boilerplate.`;
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
