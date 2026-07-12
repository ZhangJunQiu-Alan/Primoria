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
      "Surface a learning goal so the UI can locate it in the knowledge graph and build a course. MUST be the first and only tool used for any 课程 / 教程 / 微课 / 系统学习 / 教我 / 学习 / lesson / course / curriculum / teach me / learn about request. Pass the learner's goal verbatim as `query`. The UI card performs the knowledge-graph positioning and course generation; you must not attempt to build a course any other way.",
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
