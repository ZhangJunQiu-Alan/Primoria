import type { CourseBlock } from "@/lib/courses/types";
import type { TutorProviderSettings } from "../types";
import { languageDirective, type CourseContext } from "../deepagent/course-kg-context";
import { knowledgeBackgroundDirective } from "../../learner-profile/types";
import { invokeJson } from "./model-json";
import { fastTierSettings } from "../deepagent/model";
import { compileBlockContent } from "./block-content-compiler";
import { BlockCompileError, WriterError } from "./generation-errors";
import {
  assertPersistableCourseBlock,
  InvalidMermaidDefinitionError,
} from "../../courses/mermaid-validation";
import type { GeneratableBlockType } from "./lesson-plan-ir";
import type { BlockGenerationJob, CompiledLessonPlan, VisualEngine } from "./lesson-plan-compiler";

// Block Writer: generates each block's core content, batched by concept (2-3
// blocks) with per-concept quiz plus transfer/summary tasks (Decision 3B). Each
// batch gets one targeted repair on failure (Decision 5B). Visual writers emit
// a full engine payload (Decision 4). Output is compiled by block-content-
// compiler; no generic fallback is ever produced.

export type BlockBatchKind = "activation" | "concept" | "transfer" | "quiz" | "summary";
export type BlockBatch = { kind: BlockBatchKind; jobs: BlockGenerationJob[] };

/** Raw batch generator — returns untrusted content (an array of per-block
 * objects, each carrying its `order`). Injectable for tests. */
export type BlockBatchInvoke = (input: { batch: BlockBatch; system: string; user: string; repairHint?: string }) => Promise<unknown>;

const isActivation = (j: BlockGenerationJob) => j.pedagogicalRole === "hook" || j.pedagogicalRole === "roadmap";

// Batch kinds whose output is short and schema-tight (validated block-by-block by
// the compiler), so they run on the fast tier. concept/transfer batches — which
// carry interactive visuals — stay on the default model.
const FAST_TIER_BATCH_KINDS = new Set<BlockBatchKind>(["activation", "quiz", "summary"]);

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
    (j) => !isActivation(j) && j.pedagogicalRole !== "transfer" && j.type !== "quiz" && j.pedagogicalRole !== "summary",
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

  for (const job of jobs.filter((j) => j.pedagogicalRole === "transfer")) batches.push({ kind: "transfer", jobs: [job] });
  for (const job of jobs.filter((j) => j.type === "quiz")) batches.push({ kind: "quiz", jobs: [job] });
  for (const job of jobs.filter((j) => j.pedagogicalRole === "summary")) batches.push({ kind: "summary", jobs: [job] });

  return batches;
}

const FIELD_HINTS: Record<GeneratableBlockType, string> = {
  text: `"title","markdown" (2-4 paragraphs of markdown)`,
  analogy: `"title","source" (familiar thing),"target" (concept),"mapping"`,
  transfer: `"title","fromDomain","toDomain","explanation","example"`,
  visual: `"title","description","engine" plus the payload for that engine (see the engine directive on this block)`,
  image: `"title","learningGoal","imageKind":"educational_illustration|structure_diagram|realistic_scene|analogy_illustration","prompt" (describe the scene/object/structure to draw — NO text, labels, numbers, axes, formulas, or chemical notation in the image),"alt","caption" (tell the learner what to notice),"negativePrompt"?. You write a BRIEF; the image is generated later.`,
  code: `"title","language","code","explanation"`,
  quiz: `"title","questions":[{"kind":"single","id","question","choices":[{"id","text"}] (2-4 options),"correctId","explanation"}] (1-3 focused questions). Use "kind":"single" (single correct choice) by default; do NOT attribute concepts — the system assigns conceptId automatically.`,
};

// Per-engine payload directive for a visual block. The engine is chosen by the
// KG concept's `visual` affordance, not by the writer — interactive engines
// (math_explorer/algorithm/physics/html) are the product's differentiator; static
// chart/diagram engines are only for genuinely data- or structure-shaped concepts.
// Keyed by the pinned engine (not the KG affordance). The writer supplies only
// the payload; the engine is injected by the compiler.
const VISUAL_ENGINE_HINTS: Record<VisualEngine, string> = {
  html: `"html": a self-contained iframe fragment (no <html>/<head>/<body>, no 100vh) with at least one interactive control (slider/drag/button) that updates the visual live. Example: {"title":"...","description":"...","html":"<div>...<input type=\\"range\\">...<script>...</script></div>"}`,
  physics: `"physicsScene": a Matter.js scene { render:{width,height}, bodies:[...], constraints?:[...], gravity?, walls? }. Example: {"title":"...","description":"...","physicsScene":{"render":{"width":600,"height":400},"bodies":[{"shape":"circle","x":300,"y":50,"r":20}],"gravity":{"x":0,"y":1}}}`,
  algorithm: `"algorithmViz": { "algorithm": name, "steps": [ { "description", "kind":"array|tree|graph|table" — choose ONE kind that fits this algorithm and use the SAME kind on EVERY step, and a state object whose KEY NAME EQUALS the kind (kind "array" -> "array":{...}); the matching state object is REQUIRED on EVERY step or the visualization fails. Shapes: "array":{ "values":[number|string,...] (required), optional "highlights":[{"index","role"}], "pointers":[{"index","label"}], "sortedIndices":[number] }. "tree":{ "nodes":[{ "id"(string), "value"(string/number), "parentId"(string or null for root), "left"(string or null), "right"(string or null) },...] }. "graph":{ "nodes":[{ "id","label","x","y" }], "edges":[{ "from","to" }] }. "table":{ "data":[[number|string|null,...],...] (required), optional "rowLabels":[string], "colLabels":[string] }. Valid "role" values: comparing|swapping|pivot|sorted|current|visited|queued|stacked|path|dependency|result|muted. } ] }. Example: {"title":"...","description":"...","algorithmViz":{"algorithm":"Bubble Sort","steps":[{"description":"compare 5 and 3","kind":"array","array":{"values":[5,3,8],"highlights":[{"index":0,"role":"comparing"},{"index":1,"role":"comparing"}]}}]}}`,
  math_explorer: `"mathExplorer": { "mode":"cartesian|parametric", "functions":[{"expr"}] or "curves":[{"xExpr","yExpr"}], "parameters":[{"name","min","max","default"}] (sliders), optional ranges/labels }. Example: {"title":"...","description":"...","mathExplorer":{"mode":"cartesian","functions":[{"expr":"a*x^2"}],"parameters":[{"name":"a","min":-2,"max":2,"default":1}]}}`,
  echarts: `"echartsOption": a complete ECharts option object. Example: {"title":"...","description":"...","echartsOption":{"xAxis":{"type":"category","data":["A","B"]},"yAxis":{"type":"value"},"series":[{"type":"bar","data":[5,8]}]}}`,
  mermaid: `"mermaidDefinition": a Mermaid diagram string. Example: {"title":"...","description":"...","mermaidDefinition":"flowchart LR\\nA-->B"}`,
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
  if (job.type === "visual" && job.engine) {
    const concept = kg.startTopic.concepts?.find((c) => c.conceptId === job.conceptIds[0]);
    // The engine is FIXED by the system (from the KG affordance); the writer must
    // not output, rename, or invent an "engine" — only the payload for this engine.
    fields = `"title","description",${VISUAL_ENGINE_HINTS[job.engine]}. The engine is FIXED to "${job.engine}" by the system — do NOT output an "engine" field and do NOT invent another; provide only the payload key shown above as a sibling of title/description`;
    if (concept?.visualHint) fields += `. Visualize specifically: ${concept.visualHint}`;
  }

  return `- order ${job.order}: ${job.type} (role ${job.pedagogicalRole}), concepts: ${concepts}. Goal: ${job.goal}. Writer instruction: ${job.writerInstruction} Fields: ${fields}.${neighbors ? ` Avoid overlap — ${neighbors}.` : ""}`;
}

export function buildBatchPrompt(batch: BlockBatch, plan: CompiledLessonPlan, kg: CourseContext): { system: string; user: string } {
  const quizContract = batch.kind === "quiz"
    ? `

QUIZ:
- This is a concept-closing quiz. Use "kind":"single" (exactly one correct choice) with 2-4 options unless multi/truefalse genuinely tests better.
- Do NOT emit any "conceptId" — the system assigns concept attribution deterministically.`
    : "";
  const system = `You are Primoria's Block Writer for the lesson "${plan.title}" on topic "${kg.startTopic.name}". The Planner has already designed this lesson; you only EXECUTE each block. Write the content for the blocks listed below, following each block's "Writer instruction" exactly. Do NOT re-plan the lesson, do NOT add or drop blocks, and do NOT reorder. Planner-owned block metadata is fixed: do not emit block-level "type" or "conceptIds", and never change a block's type, role, or concepts. You MUST emit "order" so each result can be matched to its block. Keep blocks distinct from their neighbors. ${languageDirective(kg.language)}
${knowledgeBackgroundDirective(kg.knowledgeBackground)}${quizContract}

OUTPUT a single compact JSON array, one object per block, each including its "order" as a JSON number and the listed fields. No prose, no code fences.`;
  const user = `Blocks to write:\n${batch.jobs.map((job) => describeJob(job, kg)).join("\n")}`;
  return { system, user };
}

function normalizeWriterOrder(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const order = Number(value.trim());
    return Number.isSafeInteger(order) ? order : null;
  }
  return null;
}

function indexByOrder(raw: unknown, expectedOrders: Iterable<number>): Map<number, unknown> {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { blocks?: unknown }).blocks)
      ? (raw as { blocks: unknown[] }).blocks
      : null;
  if (!list) throw new WriterError("block writer did not return a JSON array of block content");

  const expected = new Set(expectedOrders);
  const map = new Map<number, unknown>();
  for (const item of list) {
    if (!item || typeof item !== "object") {
      throw new WriterError("block writer returned an item that is not an object");
    }

    const rawOrder = (item as { order?: unknown }).order;
    const order = normalizeWriterOrder(rawOrder);
    if (order === null) {
      throw new WriterError(`block writer returned invalid order ${JSON.stringify(rawOrder)}`);
    }
    if (!expected.has(order)) {
      throw new WriterError(`block writer returned unexpected order ${order}`);
    }
    if (map.has(order)) {
      throw new WriterError(`block writer returned duplicate order ${order}`);
    }
    map.set(order, item);
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
  const orders = batch.jobs.map((job) => job.order);
  // Plan B: initial attempt + up to 2 targeted repairs. Each repair carries the
  // PRECISE per-block validation errors (incl. the visual diagnostic), so the
  // writer self-corrects the long tail of shape deviations instead of us having
  // to hand-map every one. The original error TYPE is preserved on final failure
  // (WriterError for batch-shape, BlockCompileError for per-block) so callers and
  // error classification stay intact.
  const MAX_ATTEMPTS = 3;
  let repairHint: string | undefined;
  let lastError: unknown;

  const tier = FAST_TIER_BATCH_KINDS.has(batch.kind) ? "fast" : "default";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 1) {
      // Repair fired — one structured line per repair so repair rate is observable
      // per batch kind/tier when validating a fast-tier model swap.
      console.warn(
        JSON.stringify({ ts: new Date().toISOString(), message: "block batch repair", kind: batch.kind, tier, attempt, lessonId }),
      );
    }
    let byOrder: Map<number, unknown>;
    try {
      const raw = await invoke({ batch, system, user, repairHint });
      byOrder = indexByOrder(raw, orders);
    } catch (shapeError) {
      lastError = shapeError;
      repairHint = `Your previous output could not be parsed: ${(shapeError as Error).message}. Return ONE JSON array — exactly one object per block, each including its numeric "order" and the fields listed for that block. No prose, no code fences, no wrapper object.`;
      continue;
    }

    const blocks: { order: number; block: CourseBlock }[] = [];
    const failures: string[] = [];
    let firstFailure: unknown;
    for (const job of batch.jobs) {
      const content = byOrder.get(job.order);
      if (content === undefined) {
        firstFailure ??= new WriterError(`block ${job.order} missing from writer output`);
        failures.push(`block ${job.order} (${job.type}): missing from your output`);
        continue;
      }
      try {
        const block = compileBlockContent(job, content, lessonId);
        try {
          await assertPersistableCourseBlock(block);
        } catch (error) {
          if (error instanceof InvalidMermaidDefinitionError) {
            throw new BlockCompileError(
              `block ${job.order} (visual) has invalid Mermaid syntax: ${error.diagnostic}`,
              { jobId: job.jobId, diagnostic: error.diagnostic },
            );
          }
          throw error;
        }
        blocks.push({ order: job.order, block });
      } catch (compileError) {
        firstFailure ??= compileError;
        failures.push(`block ${job.order} (${job.type}): ${(compileError as Error).message}`);
      }
    }
    if (firstFailure === undefined) return blocks;

    lastError = firstFailure;
    repairHint = `Your previous output had these specific problems. Fix ONLY these blocks and resend the COMPLETE JSON array for ALL blocks (keep the others unchanged):\n${failures
      .map((f) => `- ${f}`)
      .join(
        "\n",
      )}\nReminders: put each visual block's payload under its engine-specific key ("mermaidDefinition"/"echartsOption"/"physicsScene"/"algorithmViz"/"mathExplorer"/"html"), never a generic "payload" wrapper; "engine" must be exactly one of html|echarts|mermaid|physics|algorithm|math_explorer; write every number as a JSON number; every quiz question needs its required fields (single: choices+correctId; truefalse: a boolean "correct"; multi: correctIds).`;
  }

  throw lastError ?? new WriterError(`block batch failed after ${MAX_ATTEMPTS} attempts`);
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
  return ({ batch, system, user, repairHint }) =>
    invokeJson({
      system,
      user: repairHint ? `${user}\n\n${repairHint}` : user,
      settings: FAST_TIER_BATCH_KINDS.has(batch.kind) ? fastTierSettings(settings) : settings,
      timeoutMs: 120_000,
    });
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
