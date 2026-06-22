import type { CourseBlock } from "@/lib/courses/types";
import type { TutorProviderSettings } from "../types";
import type { CourseContext } from "../deepagent/course-kg-context";
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
  visual: `"title","description","engine":"echarts|mermaid|physics|html", plus the payload for that engine: echarts->"echartsOption" object; mermaid->"mermaidDefinition" string; physics->"physicsScene"; html->"html" self-contained fragment with an interactive control`,
  code: `"title","language","code","explanation"`,
  quiz: `"title","questions":[{"kind":"single|multi|truefalse","id","question","choices":[{"id","text"}],"correctId"|"correctIds"|"correct","explanation"}] (4-6 questions, at least one per concept)`,
};

function describeJob(job: BlockGenerationJob, kg: CourseContext): string {
  const conceptNames = job.conceptIds
    .map((id) => kg.startTopic.concepts?.find((c) => c.conceptId === id)?.name ?? id)
    .join(", ");
  const neighbors = [
    job.neighborGoals.prev ? `prev goal: ${job.neighborGoals.prev}` : "",
    job.neighborGoals.next ? `next goal: ${job.neighborGoals.next}` : "",
  ]
    .filter(Boolean)
    .join("; ");
  return `- order ${job.order}: ${job.type} (role ${job.pedagogicalRole}), concepts: ${conceptNames}. Goal: ${job.goal}. Fields: ${FIELD_HINTS[job.type]}.${neighbors ? ` Avoid overlap — ${neighbors}.` : ""}`;
}

export function buildBatchPrompt(batch: BlockBatch, plan: CompiledLessonPlan, kg: CourseContext): { system: string; user: string } {
  const system = `You are Primoria's Block Writer for the lesson "${plan.title}" on topic "${kg.startTopic.name}". Write the content for the blocks listed below. Do NOT repeat type/order/conceptIds — those are fixed. Keep blocks distinct from their neighbors. Write in the topic's language.

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
