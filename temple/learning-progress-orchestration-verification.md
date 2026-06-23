# Learning-Progress Orchestration — verification runbook

Build a recoverable post-lesson orchestration subsystem: finishing a lesson updates
concept mastery, then recommends the next step (advance / same-graph remediation /
goal reached); the user confirms before any lesson is generated. All lesson content
still flows through the unified Lesson Job system.

## What changed (files)
- DB: `src/lib/db/schema.ts` (+ `learning_progress_jobs`, `user_concept_mastery`),
  migration `drizzle/0026_normal_ultimo.sql` (legacy UUID mastery table is replaced
  only when empty; migration refuses to discard a non-empty legacy table).
- Store: `src/lib/courses/learning-progress-jobs.ts` (lease/fencing/enqueue/claim/decision).
- Pure logic: `src/lib/mastery/rules.ts`, `src/lib/courses/learning-progress-decider.ts`.
- Mastery owner store: `src/lib/mastery/owner-store.ts` (+ `weak` status).
- Worker: `src/workers/learning-progress-worker.ts` + processor `src/lib/courses/learning-progress-processor.ts`.
- Trigger: `src/app/api/courses/[id]/quiz/route.ts` (records `lesson.completed`, enqueues job, propagates `quiz.submit.conceptId`).
- Routes: `…/learning-progress/recommendation` (GET), `…/learning-progress/[jobId]` (POST accept/dismiss).
- UI: `use-learning-progress-recommendation.ts` hook, popup in `course-detail-client.tsx`, labels module.
- Concept-tag pipe: quiz question `conceptId` in `types.ts` + block-writer/compiler;
  the prompt lists the exact allowed IDs, every generated question must carry one,
  and the compiler rejects unknown IDs or incomplete concept coverage. `PROMPT_VERSION` bumped.
- Scripts: `worker:learning-progress`, root `dev:progress` (joins `pnpm dev`); `test:progress`, `test:progress:db`.

## 1. Static checks (already green here)
```bash
pnpm --filter @primoria/web typecheck
pnpm --filter @primoria/web lint
```

## 2. Pure unit tests (no DB — already green here)
```bash
pnpm --filter @primoria/web test:progress
```
Covers mastery transitions (incl. downgrade, no-evidence), the decision engine
(next / goal_reached / remediation incl. prereq root-cause + sortKey midpoint), and labels.

## 3. DB test (you run — local isolated Postgres only)
Standing rule: never point this at Supabase. Use a local DB whose name contains "test".
```bash
# start a throwaway local Postgres (example)
docker run --rm -d --name primoria-test-pg -p 5433:5432 \
  -e POSTGRES_PASSWORD=test -e POSTGRES_DB=primoria_test postgres:16-alpine

export TEST_DATABASE_URL="postgresql://postgres:test@localhost:5433/primoria_test"
pnpm --filter @primoria/web test:progress:db
# expect: [learning-progress-jobs.db] ALL CHECKS PASSED

docker rm -f primoria-test-pg   # cleanup
```
The test runner applies migrations to the test DB itself (incl. 0026). It covers:
enqueue idempotency on lessonId; concurrent claim → one winner; lease expiry/reclaim;
fencing (stale token can't update/complete); complete-with-decision → pending;
owner-scoped pending list + accept/dismiss; accept-materialization (one remediation
lesson on a deterministic id + a lesson generation job); fail/retry.

## 4. Apply the migration
- Local/test: handled by the test runner, or `pnpm --filter @primoria/web db:migrate`.
- Prod (Supabase): `pnpm --filter @primoria/web db:migrate` — `learning_progress_jobs`
  is new. The legacy UUID-keyed `user_concept_mastery` table is replaced only if
  empty; a non-empty legacy table stops the migration for explicit reconciliation.

## 5. Manual end-to-end (`pnpm dev` runs web + agent + lesson worker + progress worker)
1. Open a generated course, answer every end-of-lesson quiz block.
2. The quiz route records `lesson.completed` and enqueues a progress job; the progress
   worker updates mastery and records a recommendation.
3. A popup appears with the reason + Accept/Dismiss.
4. Accept → a lesson job is enqueued (next outline lesson, or a new remediation lesson
   inserted between current and next); the outline shows it generating and renders when done.
5. Dismiss → no lesson is generated.

Newly generated quiz questions are required to carry a planner-approved `conceptId`,
so their `quiz.submit` events provide concept-level evidence to the mastery stage.
