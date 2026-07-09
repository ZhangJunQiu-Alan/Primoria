# Course Generator BUG

## Bug 1: malformed lesson plan IR

### Status

Fixed in the course-generation hardening pass for follow-up action 4. Final confidence depends on the regression tests for planner structured output and one-shot repair.

### Symptom

Lesson generation can fail during the planning stage when the Lesson Planner returns malformed LessonPlan IR. The observed bad shape had an invalid `v` value and was missing required `lesson` and `blocks` fields.

### Observed Error

```txt
malformed lesson plan IR:
- path ["v"]: Expected number, received nan
- path ["lesson"]: Required
- path ["blocks"]: Required
```

The exact user prompt, job id, provider response id, and model trace are unknown.

### Likely Code Path

`lesson_generation_jobs` worker -> `loadLessonGenerationContext()` -> `planLesson()` -> `compileLessonPlanIr()` -> `decodeLessonPlanIr()`.

This is a Lesson Planner IR issue, not a Block Writer issue. The Block Writer runs only after the planner IR compiles into deterministic block jobs.

### Current Mitigation

`decodeLessonPlanIr()` correctly rejects malformed IR. Before this hardening pass, `loadOrCreatePlan()` cleared plan/batch checkpoints and relied on the job retry budget to attempt a fresh plan. That was safe because it avoided publishing a default or partial lesson, but inefficient because the same planner prompt could produce the same malformed shape again.

### Fix

`planLesson()` now requests native structured output with `LessonPlanIrSchema` and `schemaName: "lesson_plan_ir"`. If the first fresh plan fails deterministic IR parse or coverage compilation, the processor performs one targeted repair attempt with the raw IR and error summary, then compiles the repaired IR through the same compiler. If repair still fails, the job keeps the existing cleanup and retry behavior.

### Remaining Unknowns

- Original learner prompt: unknown.
- Original lesson generation job id: unknown.
- Original provider raw response metadata: unknown.
- Whether the malformed output came from provider JSON mode fallback or plain prompt-following behavior: unknown.
