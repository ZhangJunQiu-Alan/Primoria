# Recoverable Lesson Generation Jobs — Engineering Context

Last updated: 2026-06-23

This document is an implementation handoff. It contains engineering requirements, current repository facts, target contracts, migration requirements, execution flow, failure semantics, tests, rollout, and acceptance criteria. It does not contain product discussion.

## 1. Fixed engineering decisions

The following decisions are final for this implementation:

1. Use a recoverable background Lesson Job architecture.
2. Create a dedicated `lesson_generation_jobs` table.
3. Create a dedicated `lesson_generation_checkpoints` table.
4. Both the first Lesson and all later LazyGeneration Lessons use the same background Job path.
5. The Worker uses platform/server model configuration only.
6. Do not persist browser-provided model API keys or provider settings in Job payloads.
7. Closing the page does not cancel generation.
8. Planner, Concept Batch, Transfer, Quiz, Summary, Validation, and Save are explicit execution stages.
9. Successful Planner and Block Batch results are checkpointed.
10. A restarted Worker resumes from existing compatible checkpoints.
11. A Block Batch receives one targeted repair attempt.
12. A Job receives at most two Worker attempts.
13. After two failed Worker attempts, status becomes `failed` and the user may manually retry.
14. The UI displays stage and progress, not only a generic `generating` state.
15. Partial Lesson content is never published to `lessons.blocks`.
16. The complete Lesson is published atomically only after deterministic validation succeeds.
17. The Worker uses a database lease, heartbeat, and fencing token.
18. The initial UI transport is polling every 2–3 seconds; do not add WebSocket/SSE in this iteration.
19. Cancellation is not implemented in the first iteration.
20. Existing `course_generation_jobs` remains separate during this implementation.

## 2. Current repository state

### 2.1 Current synchronous Lesson generation path

Current lazy Lesson generation runs inside a Next.js request:

```text
POST /api/courses/:courseId/lessons/:lessonId/generate
  -> materializeLesson()
  -> claimLessonForGeneration()
  -> generateLessonFromKg()
  -> saveGeneratedLesson()
  -> HTTP response
```

Relevant files:

- `apps/web/src/app/api/courses/[id]/lessons/[lessonId]/generate/route.ts`
- `apps/web/src/lib/ai/deepagent/course-generator.ts`
- `apps/web/src/lib/courses/store.ts`
- `apps/web/src/components/course/course-detail-client.tsx`

Current failure:

- `lessons.status` changes from `planned` to `generating`.
- The current request releases the claim only when its `catch` block executes.
- A process crash or hard runtime termination can leave the Lesson permanently in `generating`.
- `lessons` has no lease token or lease expiration.
- Current Save and Release operations are not fenced by a claim token.

### 2.2 Existing Course Job infrastructure

Current files:

- `apps/web/src/lib/courses/generation-jobs.ts`
- `apps/web/src/lib/db/schema.ts` — `courseGenerationJobs`
- `apps/web/src/app/api/course-generation-jobs/route.ts`
- `apps/agent/src/course-generation-jobs.mjs`
- `apps/agent/src/course-generator.mjs`

Existing `course_generation_jobs` supports:

- `queued / running / completed / failed`
- `attempts`
- `lease_owner`
- `lease_expires_at`
- expired lease reclaim
- `FOR UPDATE SKIP LOCKED`

It cannot be reused unchanged because:

- `course_id` is unique;
- one Course contains many Lesson jobs;
- it has no `lesson_id`;
- it has no execution stage or progress;
- it has no checkpoint model;
- it has no fencing token on Complete/Fail writes;
- its generator persists the legacy Course-level `blocks` model.

### 2.3 Existing Lesson IR pipeline

The new Lesson generation core already exists:

```text
apps/web/src/lib/ai/course-generation/
  lesson-plan-ir.ts
  lesson-planner.ts
  lesson-plan-compiler.ts
  block-writer.ts
  block-content-compiler.ts
  lesson-validator.ts
  lesson-assembler.ts
  generation-errors.ts
  model-json.ts
```

Current pipeline:

```text
planLesson()
  -> compileLessonPlanIr()
  -> writeLessonBlocks()
  -> compileBlockContent()
  -> assertLessonValid()
```

Current useful contracts:

- `DecodedLessonPlan`
- `CompiledLessonPlan`
- `BlockGenerationJob`
- `BlockBatch`
- `CourseBlock`
- classified generation errors

Current Block batching:

- activation batch;
- 2–3 Blocks grouped by primary Concept;
- transfer batch;
- quiz batch;
- summary batch;
- default concurrency is 3;
- each batch already supports one targeted repair.

Required refactor:

- export a function that executes exactly one `BlockBatch`;
- do not force the Worker to call `writeLessonBlocks()` for all batches at once;
- allow the Worker to load completed batch checkpoints and invoke only missing batches.

### 2.4 Existing Lesson model

`apps/web/src/lib/courses/types.ts` defines:

```text
Lesson.status = planned | generating | generated
Lesson.blocks = CourseBlock[] | null
```

The final Block model already persists:

- `conceptIds[]`
- `pedagogicalRole`

Do not introduce partially generated Blocks into `Lesson.blocks`.

## 3. Target architecture

```text
Web request
  -> initialize/reuse Course outline
  -> enqueue Lesson Job
  -> return HTTP 202

Long-running Lesson Worker
  -> claim Job with lease token
  -> start heartbeat
  -> load/create Plan checkpoint
  -> derive deterministic Block batches
  -> load completed Batch checkpoints
  -> generate only missing batches
  -> validate assembled Lesson
  -> atomically publish Lesson + complete Job
  -> stop heartbeat

UI
  -> poll Job status
  -> display queued/planning/writing/validating/saving
  -> render Lesson only after completed
```

## 4. Database schema

### 4.1 `lesson_generation_jobs`

Add a new Drizzle table and migration.

Required columns:

| Column | Type | Constraint / meaning |
|---|---|---|
| `id` | text | primary key |
| `owner_id` | text | FK `users.id`, cascade |
| `course_id` | text | FK `courses.id`, cascade |
| `lesson_id` | text | FK `lessons.id`, cascade, unique |
| `status` | text | `queued/running/completed/failed` |
| `stage` | text | `queued/planning/writing/validating/saving/completed/failed` |
| `attempts` | integer | default 0 |
| `max_attempts` | integer | default 2 |
| `progress_completed` | integer | default 0 |
| `progress_total` | integer | default 0 until plan compiled |
| `lease_owner` | text nullable | Worker instance ID |
| `lease_token` | text nullable | unique fencing token for current claim |
| `lease_expires_at` | timestamptz nullable | current lease expiration |
| `heartbeat_at` | timestamptz nullable | last successful renewal |
| `last_error` | text nullable | truncated to 1000 characters |
| `error_category` | text nullable | classified generation error category |
| `started_at` | timestamptz nullable | first running timestamp |
| `completed_at` | timestamptz nullable | final completion timestamp |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

Required indexes:

```text
UNIQUE (lesson_id)
INDEX (owner_id, status, updated_at)
INDEX (status, lease_expires_at)
INDEX (course_id, status)
```

The unique `lesson_id` row is reused for automatic and manual retry. Do not create multiple active Job rows for one Lesson.

### 4.2 `lesson_generation_checkpoints`

Required columns:

| Column | Type | Constraint / meaning |
|---|---|---|
| `id` | text | primary key |
| `job_id` | text | FK `lesson_generation_jobs.id`, cascade |
| `checkpoint_key` | text | stable deterministic key |
| `kind` | text | `plan` or `batch` |
| `payload` | jsonb | compiled plan or compiled Blocks |
| `ir_version` | integer | IR compatibility |
| `prompt_version` | text | prompt compatibility |
| `compiler_version` | text | compiler compatibility |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

Required indexes:

```text
UNIQUE (job_id, checkpoint_key)
INDEX (job_id, kind)
```

Checkpoint keys must be derived deterministically:

```text
plan:v<irVersion>
batch:activation:<orders>
batch:concept:<primaryConceptId>:<orders>
batch:transfer:<orders>
batch:quiz:<orders>
batch:summary:<orders>
```

Example:

```text
batch:concept:calc_chain_rule:7-8-9
```

### 4.3 Migration behavior

Migration requirements:

1. Create both tables additively.
2. Add all foreign keys and indexes.
3. Reset all legacy stuck Lesson claims:

```sql
UPDATE lessons
SET status = 'planned', updated_at = now()
WHERE status = 'generating';
```

4. Do not alter or drop `course_generation_jobs` in this migration.
5. Do not delete Course, Lesson, or checkpoint data during normal deployment.

## 5. TypeScript domain contracts

Add a module such as:

```text
apps/web/src/lib/courses/lesson-generation-jobs.ts
```

Required status types:

```ts
type LessonGenerationJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

type LessonGenerationStage =
  | "queued"
  | "planning"
  | "writing"
  | "validating"
  | "saving"
  | "completed"
  | "failed";
```

Claim contract:

```ts
type LessonGenerationClaim = {
  job: LessonGenerationJob;
  workerId: string;
  leaseToken: string;
  leaseExpiresAt: number;
};
```

Public summary must not expose:

- `ownerId`
- `leaseOwner`
- `leaseToken`
- internal checkpoint payloads
- model credentials

## 6. Enqueue semantics

Implement:

```ts
enqueueLessonGenerationJob({ ownerId, courseId, lessonId })
```

It must run in a transaction and lock/validate the Lesson.

Behavior:

### Lesson already `generated`

- Do not enqueue.
- Return an idempotent completed result.

### Existing Job is `queued` or `running`

- Return the existing Job.
- Do not create another Job.

### Existing Job is `failed` and request is a manual retry

- Reset status to `queued`.
- Reset stage to `queued`.
- Reset `attempts` to 0 for a new manual retry cycle.
- Clear lease fields and visible error.
- Preserve compatible successful checkpoints.
- Set Lesson status to `generating`.

### No existing Job

- Insert Job with `queued/queued`.
- Set Lesson status to `generating`.
- Return the Job.

All ownership checks must include `owner_id`, `course_id`, and `lesson_id`.

## 7. Claim and lease protocol

Constants:

```text
lease duration: 5 minutes
heartbeat interval: 60 seconds
max Worker attempts: 2
worker idle poll: 2.5 seconds
```

The heartbeat interval must remain below one third of lease duration.

### 7.1 Atomic claim

Claim one candidate using `FOR UPDATE SKIP LOCKED`.

Eligible candidate:

```text
status = queued
OR
status = running AND lease_expires_at < database now() AND attempts < max_attempts
```

Claim update:

```text
status = running
attempts = attempts + 1
lease_owner = workerId
lease_token = new cryptographically random token
lease_expires_at = database now() + 5 minutes
heartbeat_at = database now()
started_at = COALESCE(started_at, database now())
updated_at = database now()
```

Return the full claim including `leaseToken`.

Use database time, not application process time, for lease comparisons.

### 7.2 Heartbeat

Implement:

```ts
renewLessonGenerationLease(jobId, workerId, leaseToken)
```

Conditional update:

```text
id matches
status = running
lease_owner matches
lease_token matches
lease_expires_at > database now()
```

Update:

```text
lease_expires_at = database now() + 5 minutes
heartbeat_at = database now()
updated_at = database now()
```

Return `true` only when one row was updated.

Heartbeat implementation requirements:

- use a non-overlapping recursive timer, not an overlapping `setInterval`;
- renew every 60 seconds;
- stop in `finally`;
- mark the claim lost when renewal returns false;
- do not publish, checkpoint, fail, or release after claim loss;
- all subsequent writes remain fenced even if claim-loss detection is delayed.

### 7.3 Fencing rules

Every Worker mutation must include:

```text
job_id
status = running
lease_owner
lease_token
unexpired lease where appropriate
```

This includes:

- stage updates;
- progress updates;
- checkpoint inserts/upserts;
- retry/fail transition;
- final Lesson publish;
- Job completion.

A stale Worker must receive a no-op/false result and terminate without further writes.

## 8. Worker process

Create a long-running Node Worker owned by the Web package, for example:

```text
apps/web/src/workers/lesson-generation-worker.ts
```

Add package command:

```json
"worker:lesson-generation": "tsx src/workers/lesson-generation-worker.ts"
```

Do not run the Worker as a fire-and-forget loop inside a Next.js route.

Worker identity:

```text
lesson_worker_<hostname/process/random>
```

Worker loop:

```text
while running:
  claim one Job
  if none: sleep 2500ms
  if claimed:
    start heartbeat
    process Job
    stop heartbeat in finally
```

Worker shutdown:

- handle `SIGTERM` and `SIGINT`;
- stop claiming new Jobs;
- allow a short graceful shutdown window;
- stop heartbeat on termination;
- do not release on forced shutdown; expiry enables recovery.

## 9. Worker stage execution

### 9.1 Load immutable generation context

Load by `ownerId/courseId/lessonId`:

- Course;
- Lesson;
- `graphId`;
- Lesson `topicId`;
- Topic KG context from the current repository KG source.

Do not use request/session auth in the Worker. Pass explicit `ownerId` from the claimed Job.

If Course, Lesson, graph, or topic no longer exists:

- classify as non-retryable;
- mark Job failed;
- set Lesson back to `planned` when the Lesson still exists.

### 9.2 Planning stage

Set stage:

```text
planning
progress_completed = 0
progress_total = 0
```

Load compatible `plan:*` checkpoint.

If present:

- parse stored `CompiledLessonPlan` again;
- verify IR/prompt/compiler versions;
- skip Planner call.

If absent:

1. Call `planLesson()` with platform model settings.
2. Call `compileLessonPlanIr()`.
3. Persist checkpoint payload:

```json
{
  "rawIr": {},
  "compiledPlan": {}
}
```

4. Derive deterministic `BlockBatch[]`.
5. Set `progress_total` to the number of batches plus validation and saving stages.

Planner/coverage failure handling:

- the current Worker attempt fails;
- before the second automatic attempt, delete the incompatible Plan checkpoint and all dependent Batch checkpoints;
- the next attempt must call Planner again.

### 9.3 Writing stage

Set stage:

```text
writing
```

Refactor `block-writer.ts` to export one-batch execution, for example:

```ts
generateBlockBatch({ batch, plan, kg, lessonId, settings })
```

For each deterministic batch:

1. Check for a compatible completed checkpoint.
2. If present, load compiled `CourseBlock[]` and count it as complete.
3. If absent, invoke the Writer.
4. If the first invocation fails, perform one targeted repair invocation.
5. If the repair fails, fail the current Job attempt.
6. On success, checkpoint compiled Blocks.
7. Increment `progress_completed` with a fenced update.

Run missing batches with concurrency 3.

Checkpoint writes must be idempotent:

```text
INSERT ... ON CONFLICT (job_id, checkpoint_key) DO UPDATE
```

The upsert must still verify the active lease token in the same transaction before writing.

Successful Batch checkpoints survive:

- Worker crash;
- provider network failure;
- expired lease reclaim;
- automatic retry;
- manual retry when versions remain compatible.

### 9.4 Validation stage

Set stage:

```text
validating
```

Load every expected Batch checkpoint and assemble Blocks by `order`.

Run:

- Block count validation;
- Concept coverage validation;
- pedagogical role validation;
- Quiz coverage validation;
- allowed Block type validation;
- duplicate order and duplicate ID checks;
- `assertLessonValid()`.

If validation identifies specific invalid batches:

- delete only those Batch checkpoints;
- fail/requeue the Job attempt;
- regenerate only missing/invalid batches on the next attempt.

If validation cannot identify specific batches:

- preserve the Plan checkpoint;
- delete all Batch checkpoints;
- regenerate Block content on the next attempt.

### 9.5 Saving stage and atomic publish

Set stage:

```text
saving
```

In one database transaction:

1. Lock/read the Job row.
2. Verify:
   - `status = running`;
   - `leaseOwner` matches;
   - `leaseToken` matches;
   - lease has not expired.
3. Lock/read the Lesson row.
4. Update Lesson:
   - title;
   - `status = generated`;
   - complete final Blocks;
   - estimated minutes;
   - version increment;
   - updated timestamp.
5. Update Course estimated minutes and timestamp.
6. Update Job:
   - `status = completed`;
   - `stage = completed`;
   - progress completed equals total;
   - clear lease fields;
   - set completed timestamp.
7. Commit.

If the fencing check fails, roll back without changing Lesson or Course.

## 10. Failure and retry semantics

### 10.1 Error categories

Reuse/extend classified generation errors:

```text
context
planner
ir_parse
coverage
writer
block_compile
validation
provider
lease_lost
persistence
```

### 10.2 Retryable errors

Retryable:

- provider timeout/network failure;
- Worker crash/expired lease;
- Writer failure after one repair;
- transient database failure;
- planner output failure when a new plan may succeed.

Non-retryable without user/data change:

- missing Course/Lesson;
- missing graph/topic;
- illegal owner relationship;
- unsupported IR/compiler version after deployment mismatch.

### 10.3 Automatic retry

On retryable failure:

- if `attempts < max_attempts`, set Job back to `queued`;
- retain compatible checkpoints according to failure category;
- clear lease fields;
- keep Lesson `status = generating`;
- Worker may reclaim it.

### 10.4 Permanent failure

When attempts reach 2:

- `status = failed`;
- `stage = failed`;
- store category and truncated error;
- clear lease fields;
- set Lesson status back to `planned`;
- retain compatible checkpoints for manual retry;
- expose Retry in UI.

All failure transitions are fenced by the active lease token.

### 10.5 Manual retry

Manual Retry:

- uses the same Job row;
- resets attempts to 0;
- sets `queued/queued`;
- clears visible error and lease fields;
- sets Lesson to `generating`;
- preserves version-compatible checkpoints;
- returns HTTP 202.

## 11. Platform model configuration

The Worker must resolve model settings from server environment only.

Requirements:

- call the existing provider resolver without browser settings;
- do not accept `apiKey`, `baseUrl`, or `model` from Lesson enqueue APIs;
- do not store secrets in Job/checkpoint payloads;
- log provider/model identifiers but never keys;
- missing platform model configuration is a classified Job failure.

Existing `readSettings()` payload must be removed from Lesson generation requests after cutover.

## 12. API contracts

### 12.1 Initial Course creation

`POST /api/learning/course`

New behavior:

1. Authenticate.
2. Validate KG Course context.
3. Initialize or reuse Course outline without generating Lesson content.
4. Persist Course and planned Lessons.
5. Enqueue the first Lesson Job.
6. Return HTTP 202.

Response:

```json
{
  "courseId": "crs_...",
  "lessonId": "lsn_...",
  "job": {
    "id": "ljob_...",
    "status": "queued",
    "stage": "queued",
    "progressCompleted": 0,
    "progressTotal": 0
  },
  "summary": {}
}
```

The initial Lesson must not be generated synchronously before this response.

### 12.2 Lazy Lesson enqueue/retry

`POST /api/courses/:courseId/lessons/:lessonId/generate`

Behavior:

- enqueue idempotently;
- return existing queued/running Job;
- manually retry failed Job;
- return completed if Lesson is already generated;
- return HTTP 202 for queued/running;
- do not execute model calls in the route.

Request body contains no model settings.

### 12.3 Job status

Add:

```text
GET /api/lesson-generation-jobs/:jobId
GET /api/courses/:courseId/lesson-generation-jobs
```

Public response:

```json
{
  "id": "ljob_...",
  "courseId": "crs_...",
  "lessonId": "lsn_...",
  "status": "running",
  "stage": "writing",
  "attempts": 1,
  "maxAttempts": 2,
  "progressCompleted": 4,
  "progressTotal": 9,
  "lastError": null,
  "createdAt": 0,
  "updatedAt": 0
}
```

All reads are owner-scoped.

## 13. UI behavior

### 13.1 Polling

- poll every 2 seconds while any visible Job is `queued` or `running`;
- stop polling completed/failed Jobs;
- use `cache: no-store`;
- cancel obsolete polling when component unmounts;
- page close does not mutate Job state.

### 13.2 Stage labels

Required labels:

```text
queued      -> Waiting to generate
planning    -> Planning lesson
writing     -> Writing blocks X/Y
validating  -> Checking lesson quality
saving      -> Saving lesson
completed   -> Ready
failed      -> Generation failed
```

Chinese localization may be added through existing UI conventions; do not hard-code inconsistent state logic in multiple components.

### 13.3 Initial Course UI

After `/api/learning/course` returns 202:

- show Course card immediately;
- show first Lesson as queued/generating;
- continue polling after navigation to Library/Course detail;
- open generated Lesson only after Job completes.

### 13.4 Course detail outline

For each ungenerated Lesson:

- no Job: show Generate;
- queued/running Job: show stage/progress, disable duplicate enqueue;
- failed Job: show error summary and Retry;
- completed Job: refresh Course and render Lesson;
- do not depend only on `lesson.status` for visible progress.

### 13.5 Library

The existing Library already polls Course generation jobs. Extend or add a separate Lesson Job query so it can show:

- Course with first Lesson queued/running;
- current generation stage;
- completed first Lesson after refresh;
- failed first Lesson and retry path.

Do not merge Lesson Job records into the legacy Course Job schema internally.

## 14. Event semantics

Current `course.generated` event must be emitted exactly once for a new Course after the first Lesson is successfully published.

Requirements:

- do not emit on enqueue;
- do not emit for every later Lesson;
- make emission idempotent;
- event logging remains best-effort and must not roll back completed Lesson publication.

If an explicit `lesson.generated` event is added later, treat it as a separate change. It is not required here.

## 15. Refactors required in current code

### `apps/web/src/lib/ai/deepagent/course-generator.ts`

Split current responsibilities:

- Course outline initialization must not call the model;
- first Lesson materialization becomes enqueue;
- LazyGeneration route becomes enqueue;
- keep pure assembly helpers reusable by Worker;
- remove synchronous request-level claim/release after cutover.

### `apps/web/src/lib/courses/store.ts`

After full cutover:

- remove or stop exporting `claimLessonForGeneration()`;
- remove or stop exporting `releaseLessonClaim()`;
- replace unconditional `saveGeneratedLesson()` with fenced atomic Worker publication;
- keep normal Course/Lesson reads and block editing behavior.

### `apps/web/src/lib/ai/course-generation/block-writer.ts`

- export deterministic batch key creation;
- export one-batch generation;
- accept platform settings resolved by Worker;
- keep one targeted repair;
- preserve existing compiler calls and no-fallback rule.

### `apps/web/src/lib/ai/course-generation/lesson-assembler.ts`

- keep the synchronous function for unit tests if useful;
- production Worker should execute stages explicitly for checkpointing;
- do not call the all-at-once assembler from Job processing.

### `apps/agent/src/course-generation-jobs.mjs`

- do not extend this legacy Course worker with Lesson-specific behavior;
- Lesson Worker is implemented in the TypeScript Web package;
- legacy worker removal is a separate cleanup after traffic is migrated.

## 16. Observability

Structured log fields:

```text
jobId
courseId
lessonId
ownerId
workerId
leaseTokenHash or short prefix only
status
stage
attempt
checkpointKey
progressCompleted
progressTotal
durationMs
errorCategory
```

Never log:

- API keys;
- full provider settings;
- complete private Lesson content unless existing logging policy explicitly allows it.

Required metrics:

- queued Job count;
- oldest queued age;
- running Job count;
- expired lease reclaim count;
- Job completion/failure count;
- average total duration;
- Planner duration;
- Batch duration by kind;
- checkpoint hit rate;
- automatic retry count;
- manual retry count;
- token usage by stage when provider metadata is available.

## 17. Tests

### 17.1 Store/database tests

Required cases:

1. Enqueue creates one Job and sets Lesson generating.
2. Repeated enqueue returns the same active Job.
3. One Worker wins concurrent claim.
4. Active lease cannot be reclaimed.
5. Expired lease can be reclaimed.
6. Reclaim generates a new lease token.
7. Old token cannot heartbeat.
8. Old token cannot update stage/progress.
9. Old token cannot write checkpoint.
10. Old token cannot fail/complete Job.
11. Old token cannot publish Lesson.
12. Heartbeat extends lease.
13. Completed Job cannot be reclaimed.
14. Failed Job manual retry resets attempts.
15. Ownership checks reject another user.

### 17.2 Checkpoint tests

Required cases:

1. Plan checkpoint is idempotent.
2. Batch checkpoint is idempotent.
3. Stable batch keys remain identical after restart.
4. Compatible checkpoint is reused.
5. IR/prompt/compiler version mismatch invalidates checkpoint.
6. Crash after three batches resumes at the fourth batch.
7. Invalid specific batch is regenerated alone.
8. Planner failure clears dependent checkpoints before retry.

### 17.3 Worker tests

Required cases:

1. Full successful first Lesson Job.
2. Full successful LazyGeneration Job.
3. Page/request ends while Worker continues.
4. Worker crash before Plan checkpoint.
5. Worker crash after Plan checkpoint.
6. Worker crash after partial Batch checkpoints.
7. Lease expires and second Worker resumes.
8. First stale Worker later completes but cannot publish.
9. Batch first failure succeeds on repair.
10. Batch fails after repair and Job retries.
11. Second Worker attempt fails and Job becomes failed.
12. Manual retry reuses compatible checkpoints.
13. Validation failure prevents partial publication.
14. Final publish and Job completion are atomic.

### 17.4 API tests

Required cases:

- initial Course route returns 202 and queued Job;
- lazy route returns 202 without model execution;
- duplicate POST is idempotent;
- failed Job Retry works;
- status endpoint is owner-scoped;
- response never exposes lease token or model secrets;
- generated Lesson returns completed state.

### 17.5 UI tests

Required cases:

- stage labels map correctly;
- progress X/Y updates;
- polling stops on completion/failure;
- page reopen resumes polling existing active Job;
- failed Job displays Retry;
- duplicate Generate is disabled while active;
- successful completion refreshes Course;
- first Lesson uses the same flow as later Lesson.

## 18. Rollout

Use an additive, reversible rollout.

### Step 1 — migration

- deploy schema migration;
- verify tables and indexes;
- verify no unintended data deletion;
- verify legacy generating Lessons reset to planned.

### Step 2 — Worker deployment

- deploy Worker with claiming disabled by feature flag;
- verify database connectivity and platform model configuration;
- enable Worker poll loop with no producers active.

### Step 3 — Web producer deployment

Add feature flag:

```text
PRIMORIA_LESSON_GENERATION_JOBS_ENABLED=true
```

When disabled, no new Lesson Jobs are enqueued. The rollback behavior must be documented before production enablement.

Enable routes/UI to enqueue and poll Jobs.

### Step 4 — canary

- generate a Course with first Lesson;
- close the page during writing;
- verify Worker completes;
- kill Worker after partial checkpoint;
- restart Worker;
- verify resume and no duplicate Blocks;
- verify stale token cannot publish;
- verify failure and manual Retry.

### Step 5 — full enablement

- monitor queue age, lease reclaim, failure rate, and checkpoint hit rate;
- keep synchronous claim code unused but available for a short rollback window;
- remove synchronous path only after stable operation.

### Step 6 — cleanup

- remove old synchronous Lesson claim/release code;
- remove browser model settings from generation requests;
- remove dead API branches;
- evaluate separate removal of legacy Course Job generator.

## 19. Acceptance criteria

Implementation is complete only when all conditions hold:

1. Initial and LazyGeneration Lessons both return HTTP 202 and run in Worker.
2. No LLM generation runs inside Lesson POST routes.
3. Page closure does not stop generation.
4. Worker crash cannot permanently lock a Lesson.
5. Expired Job lease is reclaimable.
6. Stale Worker cannot heartbeat, checkpoint, release, fail, save, or publish.
7. Successful Plan and Batch checkpoints survive restart.
8. Worker resumes only missing/incompatible batches.
9. Each batch gets at most one targeted repair.
10. Job gets at most two automatic Worker attempts.
11. Failed Job supports manual Retry.
12. Partial Blocks never appear in `lessons.blocks`.
13. Final Lesson publish and Job completion are atomic.
14. UI shows queued/planning/writing X/Y/validating/saving/completed/failed.
15. UI polling resumes after page reload.
16. Worker uses platform model configuration only.
17. No API key is stored in Job/checkpoint data.
18. `course.generated` remains exactly-once for a new Course after first Lesson success.
19. All ownership boundaries are enforced.
20. Full unit, database, Worker, API, and UI test suites pass or have documented unrelated baseline failures.

## 20. Out of scope

- WebSocket or SSE progress transport;
- user cancellation;
- user BYOK for background generation;
- generalized multi-purpose Job framework;
- merging Lesson Jobs into legacy Course Jobs;
- Extractor Agent jobs;
- mastery update jobs;
- exposing partial Lesson content;
- changing Lesson pedagogical composition;
- changing IR version or allowed Block types unless required for checkpoint serialization.
