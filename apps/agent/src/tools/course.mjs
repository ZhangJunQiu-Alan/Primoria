import { tool } from "@langchain/core/tools";
import { getConfig } from "@langchain/langgraph";
import {
  GetCourseCardArgsSchema,
  PositionLearningGoalArgsSchema,
} from "@primoria/contracts/artifacts/schemas";
import { getCourse } from "../course-store.mjs";
import { summarizeCourse } from "../course-types.mjs";

const COURSE_CARD_PREFIX = "PRIMORIA_COURSE_CARD:";

/**
 * @param {any} summary
 */
function serializeCourseCard(summary, status = "ready") {
  return `${COURSE_CARD_PREFIX}${JSON.stringify({
    type: "course_card",
    courseId: summary.id,
    title: summary.title,
    topic: summary.topic,
    summary: summary.summary,
    estimatedMinutes: summary.estimatedMinutes ?? 0,
    outline: summary.outline ?? [],
    status,
  })}`;
}

/**
 * @param {unknown} runtime
 */
function getRuntimeOwnerId(runtime) {
  const runtimeAny = /** @type {any} */ (runtime);
  let config = null;
  try {
    config = /** @type {any} */ (getConfig());
  } catch {
    config = null;
  }
  return runtimeAny?.context?.primoria_owner_id
    ?? runtimeAny?.context?.user_id
    ?? runtimeAny?.state?.primoria_owner_id
    ?? runtimeAny?.state?.user_id
    ?? runtimeAny?.configurable?.primoria_owner_id
    ?? runtimeAny?.configurable?.user_id
    ?? runtimeAny?.metadata?.primoria_owner_id
    ?? runtimeAny?.metadata?.user_id
    ?? runtimeAny?.config?.configurable?.primoria_owner_id
    ?? runtimeAny?.config?.configurable?.user_id
    ?? runtimeAny?.config?.metadata?.primoria_owner_id
    ?? runtimeAny?.config?.metadata?.user_id
    ?? config?.context?.primoria_owner_id
    ?? config?.context?.user_id
    ?? config?.configurable?.primoria_owner_id
    ?? config?.configurable?.user_id
    ?? config?.metadata?.primoria_owner_id
    ?? config?.metadata?.user_id
    ?? null;
}

/**
 * The single course-path entry. This is a STATELESS signal: it just surfaces the
 * learner's goal as a tool result so the browser-rendered card can take over.
 * KG positioning + course generation + persistence all happen web-side, driven
 * by the browser (which carries the user's session natively) — see the
 * "Web-as-brain" architecture. The model cannot generate a course any other way.
 */
export const positionLearningGoalTool = tool(
  async ({ query, graph_id }) => {
    return JSON.stringify({ type: "learning_goal_position", query, graphId: graph_id });
  },
  {
    name: "position_learning_goal",
    description:
      "Legacy course preparation entry. Web checks background readiness before any positioning/build. Prefer request_course_intake for new learning goals. Pass the learner's complete stated goal verbatim as query; never assume background or mastery.",
    schema: PositionLearningGoalArgsSchema,
    returnDirect: true,
  },
);

export const requestCourseIntakeTool = tool(
  async ({ query, graph_id }) => JSON.stringify({ type: "course_intake", query, graphId: graph_id }),
  {
    name: "request_course_intake",
    description: "Start course preparation for a new learning goal. Pass the learner's full stated goal, including explicit experience/purpose/constraints, as query. Web checks saved relevant background and presents exactly three tailored option questions when it is insufficient, then waits for the learner to submit before building. Never claim the course is already being generated. Never fabricate answers or infer mastery. Use this entry for both broad and detailed course requests; Web decides readiness.",
    schema: PositionLearningGoalArgsSchema,
    returnDirect: true,
  },
);

export const getCourseCardTool = tool(
  async ({ course_id }, runtime) => {
    const ownerId = getRuntimeOwnerId(runtime);
    const course = await getCourse(course_id, ownerId);
    if (!course) {
      return JSON.stringify({ type: "course_card_error", courseId: course_id, status: "not_found" });
    }
    return serializeCourseCard(summarizeCourse(course));
  },
  {
    name: "get_course_card",
    description: "Return a compact renderable course card for an already-generated course id. Use only if a visible card needs to be restored.",
    schema: GetCourseCardArgsSchema,
  },
);
