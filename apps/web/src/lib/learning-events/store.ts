import { getDb, hasDatabaseUrl } from "@/lib/db/client";
import { learningEvents } from "@/lib/db/schema";

// Append-only raw evidence stream. Each row is one user action; heavy payloads
// (chat content, full quiz answers) stay in their own tables and are referenced
// by pointer here. Recording is best-effort and must never break the primary
// action — failures are logged and swallowed. `id` may be supplied by the caller
// (frontend-generated) so a retried action only counts once.

export type QuizSelected = string | string[] | boolean;

export type LearningEvent =
  | { type: "chat.question"; ownerId: string; id?: string; threadId: string; messageId: string }
  | {
      type: "quiz.submit";
      ownerId: string;
      id?: string;
      courseId: string;
      lessonId?: string | null;
      blockId: string;
      conceptId?: string | null;
      questionId: string;
      selected: QuizSelected | null;
      isCorrect: boolean;
      distractorTag?: string | null;
    }
  | {
      type: "lesson.completed";
      ownerId: string;
      id?: string;
      courseId: string;
      lessonId: string;
      graphId?: string | null;
    }
  | {
      type: "course.generated";
      ownerId: string;
      id?: string;
      courseId: string;
      graphId?: string | null;
      conceptId?: string | null;
      topic: string;
      source: "cold_start" | "profile";
    }
  | {
      type: "position.computed";
      ownerId: string;
      id?: string;
      graphId: string;
      conceptId?: string | null;
      rawQuery: string;
      branch: string;
      mode?: string | null;
      topTopicId?: string | null;
      maxSimilarity: number;
    }
  | {
      // Subject-level clarification: the learner picked one subject chip when the
      // goal was ambiguous across knowledge graphs. (Replaces the old broad topic
      // menu select — `selected` is now a graphId, not a topicId.)
      type: "position.menu_select";
      ownerId: string;
      id?: string;
      graphId: string;
      sourceQuery: string;
    };

type LearningEventRow = {
  id: string;
  ownerId: string;
  type: string;
  courseId: string | null;
  lessonId: string | null;
  blockId: string | null;
  graphId: string | null;
  conceptId: string | null;
  payload: Record<string, unknown>;
};

function randomId() {
  return `evt_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function toRow(event: LearningEvent): LearningEventRow {
  const base: LearningEventRow = {
    id: event.id ?? randomId(),
    ownerId: event.ownerId,
    type: event.type,
    courseId: null,
    lessonId: null,
    blockId: null,
    graphId: null,
    conceptId: null,
    payload: {},
  };

  switch (event.type) {
    case "chat.question":
      return { ...base, payload: { thread_id: event.threadId, message_id: event.messageId } };
    case "quiz.submit":
      return {
        ...base,
        courseId: event.courseId,
        lessonId: event.lessonId ?? null,
        blockId: event.blockId,
        conceptId: event.conceptId ?? null,
        payload: {
          question_id: event.questionId,
          selected: event.selected,
          is_correct: event.isCorrect,
          ...(event.distractorTag ? { distractor_tag: event.distractorTag } : {}),
        },
      };
    case "lesson.completed":
      return {
        ...base,
        courseId: event.courseId,
        lessonId: event.lessonId,
        graphId: event.graphId ?? null,
        payload: {},
      };
    case "course.generated":
      return {
        ...base,
        courseId: event.courseId,
        graphId: event.graphId ?? null,
        conceptId: event.conceptId ?? null,
        payload: { topic: event.topic, source: event.source },
      };
    case "position.computed":
      return {
        ...base,
        graphId: event.graphId,
        conceptId: event.conceptId ?? null,
        payload: {
          raw_query: event.rawQuery,
          branch: event.branch,
          ...(event.mode ? { mode: event.mode } : {}),
          ...(event.topTopicId ? { top_topic_id: event.topTopicId } : {}),
          max_similarity: event.maxSimilarity,
        },
      };
    case "position.menu_select":
      return {
        ...base,
        graphId: event.graphId,
        payload: { selected: event.graphId, source_query: event.sourceQuery },
      };
  }
}

export async function recordLearningEvent(event: LearningEvent): Promise<void> {
  if (!hasDatabaseUrl()) return;
  try {
    const row = toRow(event);
    await getDb().insert(learningEvents).values(row).onConflictDoNothing({ target: learningEvents.id });
  } catch (error) {
    console.error("[learning-events] failed to record", event.type, error);
  }
}
