import { describe, expect, it } from "vitest";

import { LessonPlanIrSchema } from "../src/lib/ai/course-generation/lesson-plan-ir";
import {
  LESSON_PLANNER_MAX_TOKENS,
  planLesson,
  repairLessonPlan,
  type LessonPlannerInvoke,
} from "../src/lib/ai/course-generation/lesson-planner";
import type { CourseContext } from "../src/lib/ai/deepagent/course-kg-context";
import type { InvokeJsonArgs } from "../src/lib/ai/course-generation/model-json";

const kg: CourseContext = {
  learningPathType: "linear",
  graphId: "biology",
  startTopic: {
    topicId: "t1",
    name: "Photosynthesis",
    concepts: [
      { conceptId: "c1", name: "Light Reactions", defaultOrder: 1 },
      { conceptId: "c2", name: "Calvin Cycle", defaultOrder: 2 },
    ],
  },
  targetConceptId: "c1",
  nextTopic: null,
};

describe("planLesson structured output", () => {
  it("passes the LessonPlan IR schema to the model invoker", async () => {
    let seen: InvokeJsonArgs | undefined;
    const invoke: LessonPlannerInvoke = async (args) => {
      seen = args;
      return { ok: true };
    };

    const result = await planLesson(kg, { contextHint: "teach photosynthesis", invoke });

    expect(result).toEqual({ ok: true });
    expect(seen?.schema).toBe(LessonPlanIrSchema);
    expect(seen?.schemaName).toBe("lesson_plan_ir");
    expect(seen?.maxTokens).toBe(LESSON_PLANNER_MAX_TOKENS);
    expect(seen?.system).toContain("Primoria's Lesson Planner");
    expect(seen?.user).toContain("Produce the compact LessonPlan IR now");
  });

  it("passes the same schema for one-shot repair prompts", async () => {
    let seen: InvokeJsonArgs | undefined;
    const invoke: LessonPlannerInvoke = async (args) => {
      seen = args;
      return { ok: true };
    };

    await repairLessonPlan(kg, { v: Number.NaN }, new Error("missing lesson and blocks"), { invoke });

    expect(seen?.schema).toBe(LessonPlanIrSchema);
    expect(seen?.schemaName).toBe("lesson_plan_ir");
    expect(seen?.maxTokens).toBe(LESSON_PLANNER_MAX_TOKENS);
    expect(seen?.user).toContain("failed deterministic validation");
    expect(seen?.user).toContain("missing lesson and blocks");
    expect(seen?.user).toContain('"v": "NaN"');
  });
});
