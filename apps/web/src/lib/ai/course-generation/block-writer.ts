import type { CourseBlock } from "@/lib/courses/types";
import type { TutorProviderSettings } from "../types";
import { languageDirective, type CourseContext } from "../deepagent/course-kg-context";
import { knowledgeBackgroundDirective } from "../../learner-profile/types";
import { invokeJson } from "./model-json";
import { compileBlockContent } from "./block-content-compiler";
import { WriterError } from "./generation-errors";
import type { GeneratableBlockType } from "./lesson-plan-ir";
import type { BlockGenerationJob, CompiledLessonPlan } from "./lesson-plan-compiler";

// Block Writer: generates each block's core content, batched by concept (2-3
// blocks) with quiz/transfer/summary as lesson-level tasks (Decision 3B). Each
// batch gets one targeted repair on failure (Decision 5B). Visual writers emit
// a full engine payload (Decision 4). Output is compiled by block-content-
// compiler; no generic fallback is ever produced.

export type BlockBatchKind = "activation" | "concept" | "transfer" | "quiz" | "summary";
export type BlockBatch = { kind: BlockBatchKind; jobs: BlockGenerationJob[] };

/** Raw batch generator — returns untrusted content (an array of per-block
 * objects, each carrying its `order`). Injectable for tests. */
export type BlockBatchInvoke = (input: { batch: BlockBatch; system: string; user: string; repairHint?: string }) => Promise<unknown>;

const isActivation = (j: BlockGenerationJob) => j.pedagogicalRole === "hook" || j.pedagogicalRole === "roadmap";

/** Deterministic checkpoint key for one batch (engineering doc §4.2). Stable
 * across worker restarts so a resumed worker reuses completed batch checkpoints
 * and regenerates only the missing ones. The block orders are the authoritative
 * identity within a kind; concept batches also pin the primary concept id. */
export function batchCheckpointKey(batch: BlockBatch): string {
  const orders = batch.jobs.map((job) => job.order).join("-");
  if (batch.kind === "concept") {
    const primaryConceptId = batch.jobs[0]?.conceptIds[0] ?? "_";
    return `batch:concept:${primaryConceptId}:${orders}`;
  }
  return `batch:${batch.kind}:${orders}`;
}

export function batchBlockJobs(jobs: BlockGenerationJob[]): BlockBatch[] {
  const batches: BlockBatch[] = [];

  const activation = jobs.filter(isActivation);
  if (activation.length) batches.push({ kind: "activation", jobs: activation });

  const conceptJobs = jobs.filter(
    (j) => !isActivation(j) && j.type !== "transfer" && j.type !== "quiz" && j.pedagogicalRole !== "summary",
  );
  const groups = new Map<string, BlockGenerationJob[]>();
  for (const job of conceptJobs) {
    const key = job.conceptIds[0] ?? "_";
    const group = groups.get(key) ?? [];
    group.push(job);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i += 3) {
      batches.push({ kind: "concept", jobs: group.slice(i, i + 3) });
    }
  }

  for (const job of jobs.filter((j) => j.type === "transfer")) batches.push({ kind: "transfer", jobs: [job] });
  for (const job of jobs.filter((j) => j.type === "quiz")) batches.push({ kind: "quiz", jobs: [job] });
  for (const job of jobs.filter((j) => j.pedagogicalRole === "summary")) batches.push({ kind: "summary", jobs: [job] });

  return batches;
}

const FIELD_HINTS: Record<GeneratableBlockType, string> = {
  text: `"title","markdown" (2-4 paragraphs of markdown)`,
  analogy: `"title","source" (familiar thing),"target" (concept),"mapping"`,
  transfer: `"title","fromDomain","toDomain","explanation","example"`,
  visual: `"title","description","engine" plus the payload for that engine (see the engine directive on this block)`,
  image: `"title","learningGoal","imageKind":"educational_illustration|structure_diagram|realistic_scene|analogy_illustration","prompt" (describe the scene/object/structure to draw — NO text, labels, numbers, axes, formulas, or chemical notation in the image),"alt","caption" (tell the learner what to notice),"negativePrompt"?,"aspectRatio"?:"1:1|4:3|16:9","resolution"?:"1K|2K|4K". You write a BRIEF; the image is generated later.`,
  code: `"title","language","code","explanation"`,
  quiz: `"title","questions":[{"kind":"single|multi|truefalse","id","question","choices":[{"id","text"}],"correctId"|"correctIds"|"correct","explanation","conceptId"}] (4-6 questions; conceptId is required on every question)`,
};

// Per-engine payload directive for a visual block. The engine is chosen by the
// KG concept's `visual` affordance, not by the writer — interactive engines
// (math_explorer/algorithm/physics/html) are the product's differentiator; static
// chart/diagram engines are only for genuinely data- or structure-shaped concepts.
const VISUAL_ENGINE_HINTS: Record<string, string> = {
  interactive: `"engine":"html" plus "html": a self-contained iframe fragment (no <html>/<head>/<body>, no 100vh) with at least one interactive control (slider/drag/button) that updates the visual live`,
  simulation: `"engine":"physics" plus "physicsScene": a Matter.js scene { render:{width,height}, bodies:[...], constraints?:[...], gravity?, walls? }`,
  algorithm: `"engine":"algorithm" plus "algorithmViz": { "algorithm": name, "steps": [ { "description", "kind":"array|tree|graph|table", and a state object whose KEY NAME EQUALS the kind (kind "array" -> "array":{...}, "tree" -> "tree":{...}, "graph" -> "graph":{...}, "table" -> "table":{...}); the matching state object is REQUIRED on EVERY step or the visualization fails. Shapes: "array":{ "values":[number|string,...] (required), optional "highlights":[{"index","role"}], "pointers":[{"index","label"}], "sortedIndices":[number] }. "tree":{ "nodes":[{ "id"(string), "value"(string/number), "parentId"(string or null for root), "left"(string or null), "right"(string or null) },...] }. "graph":{ "nodes":[{ "id","label","x","y" }], "edges":[{ "from","to" }] }. "table":{ "data":[[number|string|null,...],...] (required), optional "rowLabels":[string], "colLabels":[string] }. Valid "role" values: comparing|swapping|pivot|sorted|current|visited|queued|stacked|path|dependency|result|muted. } ] }`,
  function: `"engine":"math_explorer" plus "mathExplorer": { "mode":"cartesian|parametric", "functions":[{"expr"}] or "curves":[{"xExpr","yExpr"}], "parameters":[{"name","min","max","default"}] (sliders), optional ranges/labels }`,
  chart: `"engine":"echarts" plus "echartsOption": a complete ECharts option object`,
  diagram: `"engine":"mermaid" plus "mermaidDefinition": a Mermaid diagram string`,
};

function describeJob(job: BlockGenerationJob, kg: CourseContext): string {
  const concepts = job.conceptIds
    .map((id) => {
      const name = kg.startTopic.concepts?.find((concept) => concept.conceptId === id)?.name ?? id;
      return `${name} [id=${id}]`;
    })
    .join(", ");
  const neighbors = [
    job.neighborGoals.prev ? `prev goal: ${job.neighborGoals.prev}` : "",
    job.neighborGoals.next ? `next goal: ${job.neighborGoals.next}` : "",
  ]
    .filter(Boolean)
    .join("; ");

  let fields = FIELD_HINTS[job.type];
  if (job.type === "visual") {
    const concept = kg.startTopic.concepts?.find((c) => c.conceptId === job.conceptIds[0]);
    const engineHint = concept?.visual ? VISUAL_ENGINE_HINTS[concept.visual] : undefined;
    if (engineHint) {
      fields = `"title","description",${engineHint}`;
      if (concept?.visualHint) fields += `. Visualize specifically: ${concept.visualHint}`;
    }
  }

  return `- order ${job.order}: ${job.type} (role ${job.pedagogicalRole}), concepts: ${concepts}. Goal: ${job.goal}. Fields: ${fields}.${neighbors ? ` Avoid overlap — ${neighbors}.` : ""}`;
}

export function buildBatchPrompt(batch: BlockBatch, plan: CompiledLessonPlan, kg: CourseContext): { system: string; user: string } {
  const quizContract = batch.kind === "quiz"
    ? `

QUIZ CONCEPT ATTRIBUTION CONTRACT:
- Every question MUST include exactly one "conceptId" copied verbatim from the allowed [id=...] values listed for the quiz block.
- Every allowed conceptId MUST appear on at least one question.
- Never invent, translate, shorten, or infer a different conceptId.
- Tag a cross-concept question with the single conceptId that is primarily being assessed.`
    : "";
  const system = `You are Primoria's Block Writer for the lesson "${plan.title}" on topic "${kg.startTopic.name}". Write the content for the blocks listed below. Planner-owned block metadata is fixed: do not emit block-level "type" or "conceptIds". You MUST emit "order" so each result can be matched to its block. Keep blocks distinct from their neighbors. ${languageDirective(kg.language)}
${knowledgeBackgroundDirective(kg.knowledgeBackground)}${quizContract}

OUTPUT a single compact JSON array, one object per block, each including its "order" and the listed fields. No prose, no code fences.`;
  const user = `Blocks to write:\n${batch.jobs.map((job) => describeJob(job, kg)).join("\n")}`;
  return { system, user };
}

function indexByOrder(raw: unknown): Map<number, unknown> {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { blocks?: unknown }).blocks)
      ? (raw as { blocks: unknown[] }).blocks
      : null;
  if (!list) throw new WriterError("block writer did not return a JSON array of block content");
  const map = new Map<number, unknown>();
  for (const item of list) {
    if (item && typeof item === "object" && typeof (item as { order?: unknown }).order === "number") {
      map.set((item as { order: number }).order, item);
    }
  }
  return map;
}

async function generateBatch(
  batch: BlockBatch,
  plan: CompiledLessonPlan,
  kg: CourseContext,
  lessonId: string,
  invoke: BlockBatchInvoke,
): Promise<{ order: number; block: CourseBlock }[]> {
  const { system, user } = buildBatchPrompt(batch, plan, kg);

  const attempt = async (repairHint?: string) => {
    const raw = await invoke({ batch, system, user, repairHint });
    const byOrder = indexByOrder(raw);
    return batch.jobs.map((job) => {
      const content = byOrder.get(job.order);
      if (content === undefined) throw new WriterError(`block ${job.order} missing from writer output`);
      return { order: job.order, block: compileBlockContent(job, content, lessonId) };
    });
  };

  try {
    return await attempt();
  } catch (firstError) {
    // Decision 5B: one targeted repair, then fail the batch.
    try {
      return await attempt(`Previous attempt failed: ${(firstError as Error).message}. Return valid JSON for every listed block.`);
    } catch (secondError) {
      throw secondError;
    }
  }
}

/** One compiled block with its plan order — the checkpointable unit so a resumed
 * worker can reassemble blocks across batches in global order. */
export type CompiledBatchBlock = { order: number; block: CourseBlock };

/** Generate and compile exactly one batch (engineering doc §9.3). Used by the
 * recoverable worker so each batch can be checkpointed independently; a single
 * targeted repair is attempted before the batch (and the job attempt) fails.
 * Returns compiled blocks with their plan order. */
export async function generateBlockBatch(args: {
  batch: BlockBatch;
  plan: CompiledLessonPlan;
  kg: CourseContext;
  lessonId: string;
  settings?: TutorProviderSettings;
  invoke?: BlockBatchInvoke;
}): Promise<CompiledBatchBlock[]> {
  const { batch, plan, kg, lessonId } = args;
  const invoke = args.invoke ?? defaultInvoke(args.settings);
  const compiled = await generateBatch(batch, plan, kg, lessonId, invoke);
  return compiled.sort((a, b) => a.order - b.order);
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function defaultInvoke(settings?: TutorProviderSettings): BlockBatchInvoke {
  return ({ system, user, repairHint }) =>
    invokeJson({ system, user: repairHint ? `${user}\n\n${repairHint}` : user, settings, timeoutMs: 120_000 });
}

/** Generate and compile every block for a compiled plan. Returns CourseBlocks
 * ordered by plan order. A single batch failure does not discard other batches'
 * results — but a hard batch failure (after repair) rejects the lesson. */
export async function writeLessonBlocks(args: {
  plan: CompiledLessonPlan;
  lessonId: string;
  kg: CourseContext;
  settings?: TutorProviderSettings;
  invoke?: BlockBatchInvoke;
  concurrency?: number;
}): Promise<CourseBlock[]> {
  const { plan, lessonId, kg, concurrency = 3 } = args;
  const invoke = args.invoke ?? defaultInvoke(args.settings);
  const batches = batchBlockJobs(plan.jobs);
  const compiled = await mapLimit(batches, concurrency, (batch) => generateBatch(batch, plan, kg, lessonId, invoke));
  return compiled
    .flat()
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.block);
}
