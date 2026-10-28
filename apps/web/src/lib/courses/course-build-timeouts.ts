// Positioning can make two 45-second model calls, plus retrieval and transport.
export const LEARNING_GOAL_POSITION_TIMEOUT_MS = 120_000;
// A new graph can take 90 seconds, followed by persistence, outline creation and enqueueing.
export const COURSE_BUILD_TIMEOUT_MS = 180_000;
// Freeform pending entries start before positioning and span both requests.
export const PENDING_COURSE_BUILD_TIMEOUT_MS =
  LEARNING_GOAL_POSITION_TIMEOUT_MS + COURSE_BUILD_TIMEOUT_MS + 30_000;
