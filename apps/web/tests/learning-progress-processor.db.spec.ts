import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/client";
import { achievementUnlocks, courses, learningEvents, lessons, users } from "@/lib/db/schema";
import { DEFAULT_TOPIC_GRAPH_ID, getTopicGraph } from "@/lib/knowledge-graph/topic-graph";
import {
  claimNextLearningProgressJob,
  enqueueLearningProgressJob,
  getLearningProgressJob,
} from "@/lib/courses/learning-progress-jobs";
import { processLearningProgressJob } from "@/lib/courses/learning-progress-processor";
import { recordLearningEvent } from "@/lib/learning-events/store";
import { resetTestDb, setupTestDb, teardownTestDb, TEST_DB_AVAILABLE } from "./helpers/test-db";

const run = process.env.RUN_PROGRESS_DB === "1" && TEST_DB_AVAILABLE;
const suite = run ? describe : describe.skip;
const graph = getTopicGraph(DEFAULT_TOPIC_GRAPH_ID);
const topic = graph.topics.find((candidate) => candidate.conceptIds.length >= 2)!;

async function seedCourse(input: { lessonCount: 1 | 2 }) {
  const suffix = randomUUID();
  const now = new Date();
  const ownerId = `progress_owner_${suffix}`;
  const courseId = `progress_course_${suffix}`;
  const lessonIds = [`progress_lesson_1_${suffix}`, `progress_lesson_2_${suffix}`];
  await getDb().insert(users).values({ id: ownerId });
  await getDb().insert(courses).values({
    id: courseId,
    ownerId,
    title: "Progress contract",
    topic: "Progress contract",
    summary: "Progress contract",
    estimatedMinutes: input.lessonCount * 20,
    graphId: DEFAULT_TOPIC_GRAPH_ID,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
  await getDb().insert(lessons).values(Array.from({ length: input.lessonCount }, (_, index) => ({
    id: lessonIds[index],
    courseId,
    ownerId,
    topicId: topic.topicId,
    conceptIds: [topic.conceptIds[index].conceptId],
    title: `Bundle ${index + 1}`,
    description: "",
    role: "new",
    progress: "completed",
    status: "generated",
    sortKey: index + 1,
    blocks: [],
    version: 1,
    createdAt: now,
    updatedAt: now,
  })));
  return { ownerId, courseId, lessonIds };
}

async function addEvidence(input: { ownerId: string; courseId: string; lessonId: string; conceptId: string; correct: number }) {
  for (let index = 0; index < 3; index += 1) {
    await recordLearningEvent({
      type: "quiz.submit",
      id: `evidence_${input.lessonId}_${index}`,
      ownerId: input.ownerId,
      courseId: input.courseId,
      lessonId: input.lessonId,
      blockId: `block_${input.lessonId}`,
      conceptId: input.conceptId,
      questionId: `q${index}`,
      selected: index < input.correct ? "right" : "wrong",
      isCorrect: index < input.correct,
    });
  }
}

async function runProgress(ownerId: string, courseId: string, lessonId: string) {
  const enqueued = await enqueueLearningProgressJob({ ownerId, courseId, lessonId, graphId: DEFAULT_TOPIC_GRAPH_ID });
  const claim = await claimNextLearningProgressJob({ workerId: `worker_${lessonId}` });
  expect(claim?.job.id).toBe(enqueued.job.id);
  await processLearningProgressJob(claim!);
  return getLearningProgressJob(enqueued.job.id, ownerId);
}

suite("learning-progress processor database contract", () => {
  let sql: Awaited<ReturnType<typeof setupTestDb>>;

  beforeAll(async () => {
    sql = await setupTestDb();
  });

  beforeEach(async () => {
    await resetTestDb(sql);
    await sql`insert into knowledge_graphs (id, subject) values (${graph.graphId}, ${graph.subject})
              on conflict (id) do nothing`;
    await sql`insert into knowledge_graph_topics (graph_id, topic_id, name, default_order)
              values (${graph.graphId}, ${topic.topicId}, ${topic.name}, 1)
              on conflict (graph_id, topic_id) do nothing`;
    for (const [index, concept] of topic.conceptIds.slice(0, 2).entries()) {
      await sql`insert into knowledge_graph_concepts (graph_id, concept_id, topic_id, name, description, default_order)
                values (${graph.graphId}, ${concept.conceptId}, ${topic.topicId}, ${concept.name}, ${concept.description ?? ""}, ${index + 1})
                on conflict (graph_id, concept_id) do nothing`;
    }
  });

  afterAll(async () => {
    await resetTestDb(sql);
    await teardownTestDb(sql);
  });

  it("targets the immediate next persisted lesson even when it shares the same topic", async () => {
    const seeded = await seedCourse({ lessonCount: 2 });
    await addEvidence({
      ...seeded,
      lessonId: seeded.lessonIds[0],
      conceptId: topic.conceptIds[0].conceptId,
      correct: 3,
    });

    const job = await runProgress(seeded.ownerId, seeded.courseId, seeded.lessonIds[0]);
    expect(job?.decision).toMatchObject({
      kind: "next",
      targetLessonId: seeded.lessonIds[1],
      targetTopicId: topic.topicId,
      nextLessonTitle: "Bundle 2",
    });
    const completions = await getDb().select().from(learningEvents);
    expect(completions.filter((event) => event.type === "course.completed")).toHaveLength(0);
  });

  it("does not complete the course when the final lesson needs remediation", async () => {
    const seeded = await seedCourse({ lessonCount: 1 });
    await addEvidence({
      ...seeded,
      lessonId: seeded.lessonIds[0],
      conceptId: topic.conceptIds[0].conceptId,
      correct: 0,
    });

    const job = await runProgress(seeded.ownerId, seeded.courseId, seeded.lessonIds[0]);
    expect(job?.decision?.kind).toBe("remediation");
    const events = await getDb().select().from(learningEvents);
    const unlocks = await getDb().select().from(achievementUnlocks);
    expect(events.filter((event) => event.type === "course.completed")).toHaveLength(0);
    expect(unlocks.filter((unlock) => unlock.code === "questline_complete")).toHaveLength(0);
  });

  it("records course completion and its achievement atomically after a clean final decision", async () => {
    const seeded = await seedCourse({ lessonCount: 1 });
    await addEvidence({
      ...seeded,
      lessonId: seeded.lessonIds[0],
      conceptId: topic.conceptIds[0].conceptId,
      correct: 3,
    });

    const job = await runProgress(seeded.ownerId, seeded.courseId, seeded.lessonIds[0]);
    expect(job?.decision?.kind).toBe("course_complete");
    const events = await getDb().select().from(learningEvents);
    const unlocks = await getDb().select().from(achievementUnlocks);
    expect(events.filter((event) => event.type === "course.completed")).toHaveLength(1);
    expect(unlocks.filter((unlock) => unlock.code === "questline_complete")).toHaveLength(1);
  });
});
