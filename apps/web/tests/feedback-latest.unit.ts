#!/usr/bin/env tsx

import { pickLatestFeedbackEventIds } from "../src/lib/courses/extractor-processor.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function main() {
  // 👍 then 👎 on the same message → only the latest event survives.
  const ids = pickLatestFeedbackEventIds([
    { id: "cf_m1_positive", targetMessageId: "m1", createdAt: 1000 },
    { id: "cf_m1_negative", targetMessageId: "m1", createdAt: 2000 },
  ]);
  assert(ids.size === 1 && ids.has("cf_m1_negative"), "latest thumb on a message wins");
  assert(!ids.has("cf_m1_positive"), "superseded thumb is dropped");

  // Distinct messages each keep their own latest.
  const multi = pickLatestFeedbackEventIds([
    { id: "cf_m1_positive", targetMessageId: "m1", createdAt: 1000 },
    { id: "cf_m2_negative", targetMessageId: "m2", createdAt: 1500 },
  ]);
  assert(multi.size === 2, "different messages keep independent feedback");

  // Null target (defensive): keyed by event id, never collapses unrelated rows.
  const nulls = pickLatestFeedbackEventIds([
    { id: "a", targetMessageId: null, createdAt: 1 },
    { id: "b", targetMessageId: null, createdAt: 2 },
  ]);
  assert(nulls.size === 2, "null-target events are not merged together");

  assert(pickLatestFeedbackEventIds([]).size === 0, "empty input → empty set");

  process.stdout.write("[feedback-latest.unit] ALL CHECKS PASSED\n");
}

main();
