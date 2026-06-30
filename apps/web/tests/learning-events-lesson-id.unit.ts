#!/usr/bin/env tsx

import { toRow, type LearningEvent } from "../src/lib/learning-events/store.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function main() {
  // chat.question carries lesson/course scope onto the dedicated columns so the
  // Extractor can window events by lessonId (not payload).
  const withScope = toRow({
    type: "chat.question",
    ownerId: "u1",
    id: "cq_1",
    threadId: "t1",
    messageId: "m1",
    courseId: "course_1",
    lessonId: "lesson_1",
  });
  assert(withScope.lessonId === "lesson_1", "chat.question lessonId lands on the column");
  assert(withScope.courseId === "course_1", "chat.question courseId lands on the column");
  assert((withScope.payload as { message_id?: string }).message_id === "m1", "payload still carries the message pointer");

  // Omitted scope degrades to null (e.g. chatting outside a lesson) without error.
  const noScope = toRow({
    type: "chat.question",
    ownerId: "u1",
    id: "cq_2",
    threadId: "t1",
    messageId: "m2",
  } as LearningEvent);
  assert(noScope.lessonId === null, "missing lessonId → null");
  assert(noScope.courseId === null, "missing courseId → null");

  // chat.feedback is lesson-scoped too, and normalizes the signal into payload.
  const fb = toRow({
    type: "chat.feedback",
    ownerId: "u1",
    id: "cf_m1_negative",
    targetMessageId: "m1",
    via: "thumb",
    signal: "negative",
    courseId: "course_1",
    lessonId: "lesson_1",
  });
  assert(fb.lessonId === "lesson_1", "chat.feedback lessonId lands on the column");
  const fbPayload = fb.payload as { target_message_id?: string; via?: string; signal?: string };
  assert(fbPayload.target_message_id === "m1", "feedback targets the assistant message");
  assert(fbPayload.via === "thumb" && fbPayload.signal === "negative", "feedback payload carries via + signal");

  process.stdout.write("[learning-events-lesson-id.unit] ALL CHECKS PASSED\n");
}

main();
