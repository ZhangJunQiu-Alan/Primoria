#!/usr/bin/env tsx
import {
  finish,
  ok,
  resetTestDb,
  seedCourse,
  seedLesson,
  seedUser,
  setupTestDb,
  skipWithoutTestDb,
  teardownTestDb,
} from "./helpers/test-db";
import { processLessonGenerationJob } from "../src/lib/courses/lesson-generation-processor";
import { compileLessonPlanIr } from "../src/lib/ai/course-generation/lesson-plan-compiler";
import { CURRENT_CHECKPOINT_VERSIONS } from "../src/lib/ai/course-generation/versions";
import { LeaseLostError } from "../src/lib/ai/course-generation/generation-errors";
import type { CourseContext } from "../src/lib/ai/deepagent/course-kg-context";
import type { LessonGenerationContext } from "../src/lib/courses/lesson-generation-context";

const NAME = "lesson-generation-worker.db";
const CONCEPTS = ["c1", "c2", "c3", "c4"];
const TOTAL_BATCHES = 8; // activation + 4 concept groups + transfer + quiz + summary

const kg: CourseContext = {
  learningPathType: "linear",
  graphId: "g1",
  startTopic: {
    topicId: "t1",
    name: "导数",
    concepts: CONCEPTS.map((conceptId, index) => ({ conceptId, name: `概念${index + 1}`, defaultOrder: index + 1 })),
  },
  targetConceptId: "c1",
  nextTopic: null,
};

const fixedIr = {
  v: 1,
  lesson: ["导数入门", 45],
  blocks: [
    [1, "T", "hook", ["c1"], "hook"],
    [2, "T", "roadmap", CONCEPTS, "roadmap"],
    [3, "T", "explanation", ["c1"], "explain c1"],
    [4, "C", "example", ["c1"], "example c1"],
    [5, "T", "explanation", ["c2"], "explain c2"],
    [6, "T", "example", ["c2"], "example c2"],
    [7, "T", "explanation", ["c3"], "explain c3"],
    [8, "C", "example", ["c3"], "example c3"],
    [9, "T", "explanation", ["c4"], "explain c4"],
    [10, "C", "example", ["c4"], "example c4"],
    [11, "A", "deepening", ["c1"], "analogy"],
    [12, "V", "deepening", ["c2"], "visual"],
    [13, "X", "transfer", CONCEPTS, "transfer"],
    [14, "Q", "assessment", CONCEPTS, "quiz"],
    [15, "T", "summary", CONCEPTS, "summary"],
  ],
};

function contentFor(j: { order: number; type: string }) {
  const order = j.order;
  const title = `${j.type}${order}`;
  switch (j.type) {
    case "analogy":
      return { order, title, source: "s", target: "t", mapping: "m" };
    case "transfer":
      return { order, title, fromDomain: "f", toDomain: "to", explanation: "e", example: "ex" };
    case "code":
      return { order, title, language: "python", code: "print(1)", explanation: "e" };
    case "visual":
      return { order, title, description: "d", engine: "mermaid", mermaidDefinition: "flowchart LR\nA-->B" };
    case "quiz":
      return {
        order,
        title,
        questions: CONCEPTS.map((conceptId, i) => ({ kind: "single", id: `q${i + 1}`, question: `q${i + 1}?`, choices: [{ id: "a", text: "A" }, { id: "b", text: "B" }], correctId: "a", conceptId })),
      };
    default:
      return { order, title, markdown: `body ${order}` };
  }
}

function makeOptions(lessonId: string, onWriter?: () => void) {
  const ctx: LessonGenerationContext = {
    course: { id: "_", topic: "导数", graphId: "g1" } as unknown as LessonGenerationContext["course"],
    lesson: { id: lessonId, topicId: "t1" } as unknown as LessonGenerationContext["lesson"],
    kg,
  };
  return {
    loadContext: async () => ctx,
    settings: {},
    plannerInvoke: async () => fixedIr,
    writerInvoke: async ({ batch }: { batch: { jobs: { order: number; type: string }[] } }) => {
      onWriter?.();
      return batch.jobs.map((j) => contentFor(j));
    },
  };
}

async function main() {
  if (skipWithoutTestDb(NAME)) return;
  const sql = await setupTestDb();
  const store = await import("../src/lib/courses/lesson-generation-jobs");

  let seq = 0;
  async function freshLesson() {
    seq += 1;
    const ownerId = `wu_${seq}`;
    const courseId = `wcrs_${seq}`;
    const lessonId = `wlsn_${seq}`;
    await seedUser(sql, ownerId);
    await seedCourse(sql, { id: courseId, ownerId, graphId: `wg_${seq}` });
    await seedLesson(sql, { id: lessonId, courseId, ownerId });
    return { ownerId, courseId, lessonId };
  }

  try {
    await resetTestDb(sql);

    // ── Full successful job against the real store ────────────────────────────
    let firstJobId = "";
    {
      const { ownerId, courseId, lessonId } = await freshLesson();
      await store.enqueueLessonGenerationJob({ ownerId, courseId, lessonId });
      const claim = await store.claimNextLessonGenerationJob({ workerId: "worker-a" });
      firstJobId = claim!.job.id;
      let writerCalls = 0;
      await processLessonGenerationJob(claim!, makeOptions(lessonId, () => (writerCalls += 1)));
      ok(writerCalls === TOTAL_BATCHES, "clean run invokes the writer once per batch");
      const lr = await sql`select status, jsonb_array_length(blocks) n, title from lessons where id=${lessonId}`;
      ok(lr[0].status === "generated", "lesson published as generated");
      ok(lr[0].n === 15, "published 15 blocks");
      ok(lr[0].title === "导数入门", "lesson title from plan");
      const jr = await sql`select status, stage, progress_completed pc, progress_total pt from lesson_generation_jobs where id=${firstJobId}`;
      ok(jr[0].status === "completed" && jr[0].stage === "completed", "job completed");
      ok(jr[0].pc === jr[0].pt && jr[0].pt === TOTAL_BATCHES + 2, "progress completed = total = batches + 2");
      const cps = await sql`select count(*)::int n from lesson_generation_checkpoints where job_id=${firstJobId}`;
      ok(cps[0].n === TOTAL_BATCHES + 1, "plan + every batch checkpointed");
    }

    // ── Resume reuses compatible checkpoints (only missing batches regenerate) ─
    {
      const { ownerId, courseId, lessonId } = await freshLesson();
      await store.enqueueLessonGenerationJob({ ownerId, courseId, lessonId });
      const claim = await store.claimNextLessonGenerationJob({ workerId: "worker-b" });
      const fence = { jobId: claim!.job.id, workerId: claim!.workerId, leaseToken: claim!.leaseToken };

      // Seed a compatible plan + 3 batch checkpoints copied from the first job.
      const compiled = compileLessonPlanIr(fixedIr, kg);
      await store.upsertLessonGenerationCheckpoint(fence, { checkpointKey: `plan:v1`, kind: "plan", payload: { rawIr: fixedIr, compiledPlan: compiled }, versions: CURRENT_CHECKPOINT_VERSIONS });
      const priorBatches = (await store.loadLessonGenerationCheckpoints(firstJobId)).filter((c) => c.kind === "batch").slice(0, 3);
      for (const cp of priorBatches) {
        await store.upsertLessonGenerationCheckpoint(fence, { checkpointKey: cp.checkpointKey, kind: "batch", payload: cp.payload, versions: CURRENT_CHECKPOINT_VERSIONS });
      }

      let writerCalls = 0;
      await processLessonGenerationJob(claim!, makeOptions(lessonId, () => (writerCalls += 1)));
      ok(writerCalls === TOTAL_BATCHES - 3, "resume regenerates only the missing batches");
      const lr = await sql`select status, jsonb_array_length(blocks) n from lessons where id=${lessonId}`;
      ok(lr[0].status === "generated" && lr[0].n === 15, "resumed job still publishes a complete lesson");
    }

    // ── Stale worker cannot publish after its lease is reclaimed ───────────────
    {
      const { ownerId, courseId, lessonId } = await freshLesson();
      await store.enqueueLessonGenerationJob({ ownerId, courseId, lessonId });
      const stale = await store.claimNextLessonGenerationJob({ workerId: "worker-c1" });
      // Expire + reclaim with a second worker → stale worker's token is now invalid.
      await sql`update lesson_generation_jobs set lease_expires_at = now() - interval '1 second' where id=${stale!.job.id}`;
      const fresh = await store.claimNextLessonGenerationJob({ workerId: "worker-c2" });
      ok(fresh?.job.id === stale!.job.id, "second worker reclaimed the expired job");

      let threw: unknown;
      try {
        await processLessonGenerationJob(stale!, makeOptions(lessonId));
      } catch (error) {
        threw = error;
      }
      ok(threw instanceof LeaseLostError, "stale worker aborts with LeaseLostError");
      const lr = await sql`select status from lessons where id=${lessonId}`;
      ok(lr[0].status !== "generated", "stale worker did not publish the lesson");
    }

    await resetTestDb(sql);
  } finally {
    await teardownTestDb(sql);
  }

  finish(NAME);
}

main().catch((error) => {
  process.stderr.write(`${error}\n`);
  process.exit(1);
});
