# Local Browser QA - 2026-07-09

> Follow-up 2026-07-10: the raw `relation "public.kg_node_embeddings" does not
> exist` leak below is fixed on `main` (`04856352` — safe KG error mapping +
> `/api/health`), and the public landing / heavy first-load issues are addressed
> by `a6618e1f` (landing moved to `/welcome`, tutor surfaces lazy-loaded) and
> `b264c517` (bundle analyzer). Everything below is the original observation
> record; current issue status lives in
> `temple/browser-qa-issue-list-2026-07-09.md`.
>
> Follow-up 2026-07-10 (Issue 2): the dev-server/course-route long tail is now
> fixed and was removed from the unresolved issue list. Web dev now uses
> Turbopack; large optional visualization libraries load only when their block
> is rendered; Streamdown uses Shiki's web bundle; and the course route has a
> loading skeleton. On a clean `.next`, authenticated outline load completed in
> 15.49s and the subsequent course reader opened in 3.07s. During the cold route
> compile, 80 concurrent `/api/health` probes all returned 200; the slowest was
> 0.845s. Warm course navigation was about 3.5s in the browser and 0.24-0.33s at
> the server after compilation. Course Tutor restored its session and exposed
> the input in about 2s; 70 health probes during that check all returned 200
> (slowest 0.375s). Typecheck, targeted ESLint, 136 tests, and the production
> build passed.
> The same regression uncovered an invalid persisted Mermaid definition in
> lesson `lsn_7qnta9g4mrdiuk4l`. The local test row was corrected so the visual
> flow could be completed; missing pre-persistence Mermaid validation remains
> tracked as N-7 in the unresolved issue list.
>
> Follow-up 2026-07-10 (N-1): onboarding course preparation now persists an
> independent `pending/building/ready/failed` state and a safe failure message.
> Failed or in-progress preparation keeps onboarding on the final screen after
> refresh, and `/api/onboarding/course` provides an idempotent retry. Browser QA
> forced the existing After-KG account to `failed`, verified the failure copy
> and Retry control, then retried the real course path: the profile returned to
> `ready`, the safe error was cleared, and the existing course outline opened.
> Migration `0037_blue_sauron.sql`, typecheck, targeted ESLint, 140 tests, and
> the production build passed.
>
> Follow-up 2026-07-10 (Issue 7): successful email auth no longer resets the
> form pending state before navigation commits. The form announces that the
> account/sign-in succeeded, keeps controls disabled, calls `router.replace`,
> and refreshes RSC state after the session cookie is written. Browser QA
> created a fresh account from `/auth/sign-up?next=/`; the user, identity, and
> session rows were present and the browser reached `/` onboarding step 1.
> After sign-out, submitting the same email stayed on sign-up, restored the
> editable form, and showed `An account with this email already exists.`
> Typecheck, targeted ESLint, 140 tests, and the production build passed.
>
> Follow-up 2026-07-10 (Issue 3): the mislabeled `Python` curriculum was split
> into `sicp_cs61a` and a new book-sourced `python_fundamentals` graph. The new
> graph has 24 topics, 65 concepts, 93 prerequisite edges, one root concept,
> and a one-to-one 65-entry source map. All 21 curated graphs passed both KG
> validators with no cross-graph ID conflicts. Existing local courses,
> learner profiles, and events were migrated from graph ID `Python` to
> `sicp_cs61a`; the retired graph and embeddings were removed.
>
> MiniMax `embo-01` ranked an AI backtracking concept first for the English
> query `Teach me Python from the beginning`. An A/B run through the existing
> OpenRouter account showed `openai/text-embedding-3-small` ranking
> `python_fundamentals` first (0.59082), ahead of Introduction to Computer
> Science (0.57274) and SICP/CS61A (0.45069). Local KG search now uses the
> OpenRouter model version, concept embedding text includes its subject, and
> explicit subject words are merged with vector recall as a deterministic
> routing guardrail.
>
> The real onboarding API positioned the golden query at graph
> `python_fundamentals`, root topic `pyf_topic_running_python_programs`, then
> created course `crs_kt7kqt9pmreiy2tx` with 24 lessons. After reloading the
> long-running workers, the first lesson retried one coverage-invalid model
> response and completed on attempt 2; the outline reported 1/24 ready and the
> browser opened `Running Python Programs` successfully. Golden DB routing,
> KG integrity tests, the KG test suite, and typecheck passed. Screenshot:
> `/tmp/primoria-python-fundamentals-first-lesson.png`. Issue 3 was removed
> from the unresolved issue list. The successful retry also exposed stale
> `last_error/error_category` fields on completed lesson jobs; completion now
> clears both fields and has a regression test.
>
> Follow-up 2026-07-10 (N-7): Mermaid course blocks are now parsed with the
> same `mermaid@11.15.0` version used by the browser before they can be
> checkpointed, edited, inserted, transformed, or finally published. Invalid
> writer output enters the existing targeted-repair loop; invalid editor output
> returns the safe `422 invalid_mermaid` response; the final lesson transaction
> is a second persistence guard. The Node parser initializes Mermaid with a
> temporary isolated DOM and restores server globals immediately afterward.
>
> Unit coverage accepts flowchart, sequence, state, and class diagrams; rejects
> malformed, empty, oversized, and concurrent invalid input; and verifies the
> writer's targeted repair and the editor API response. Isolated PostgreSQL
> integration tests confirmed malformed Mermaid leaves lesson status at
> `generating` with `blocks = null`, while valid Mermaid completes normal worker
> publication and checkpoint resume. Typecheck, lint, the DB-backed generation
> suites, and the production build passed. The repository-wide Vitest command
> reached 152 passed / 1 skipped but remains non-green because the existing
> `course-generation-ui-static.unit.ts` expects committed `next-env.d.ts` not to
> contain Next 16's generated route import; this is unrelated to N-7.
>
> Browser QA signed in as `Codex QA After KG`, opened course
> `crs_b11mpv2tmrdiuk4l`, lesson `lsn_7qnta9g4mrdiuk4l`, step 11/14, and
> confirmed the environment diagram rendered as an accessible document with no
> Mermaid console warnings/errors. The loaded CDN URL was
> `mermaid@11.15.0`. N-7 was removed from the unresolved issue list.
>
> Follow-up 2026-07-10 (N-2): background goal positioning now commits
> `positioned`, `clarify`, and `failed` results through one atomic PostgreSQL
> write fence: `owner_id`, the original `learning_goal`, and
> `goal_positioning_status = 'pending'` must still match. A stale callback gets
> no returned row and stops before course creation, so it cannot overwrite a
> newer goal. Explicit subject-chip selection remains an authoritative path and
> still commits after clarification.
>
> An isolated PostgreSQL regression saved an old goal, replaced it with a new
> goal, then applied all three stale terminal outcomes; each affected zero rows,
> while the new goal stayed pending and later positioned normally. The route
> regression also verifies that a zero-row commit does not start course
> creation. Onboarding static checks, 12 related Vitest cases, the 11-assertion
> DB race suite, typecheck, lint, and the production build passed. The full
> Vitest run reached 156 passed / 1 skipped and remains non-green only because
> of the previously recorded Next 16 `next-env.d.ts` static assertion. Web was
> restarted and `/api/health` returned `200 ok`. N-2 was removed from the
> unresolved issue list.

> Follow-up 2026-07-10 (N-6): a database outage no longer masquerades as
> "signed out". Session lookup now throws a typed `auth_unavailable` error on
> connectivity failures (all environments; the dev-only treat-as-signed-out
> path was removed), `requireAuthUser` maps it to `503
> {"error":"Authentication is temporarily unavailable.","code":"auth_unavailable"}`
> for every guarded API route, `/api/auth/me` returns the same safe body, and a
> new root `error.tsx` shows a "Service temporarily unavailable / Try again"
> page instead of a login redirect. Sign-out clears the cookie even when the
> database is down. Live QA with account `claude.qa.n6.20260710@primoria.local`:
> with Postgres stopped, `/api/auth/me` and `/api/knowledge-graph/position`
> (valid cookie) returned `503 auth_unavailable` instead of the previous `401`,
> `GET /` returned 500 into the error boundary with no login redirect, and
> `/api/health` returned `503 unhealthy`. After `docker compose start
> postgres`, the same cookie was recognized again (`/api/auth/me` 200 with the
> user; health `ok`) — the user was never logged out. Typecheck, targeted
> ESLint, and 165 vitest tests passed (the only failure remains the previously
> recorded, unrelated `next-env.d.ts` static assertion). N-6 was removed from
> the unresolved issue list.

> Follow-up 2026-07-10 (N-3): `after()` background work now has a stale-pending
> timeout fallback. `getLearnerOnboardingState` (used by the `GET
> /api/onboarding` poll and page loads) repairs any in-flight state older than
> 5 minutes — `goalPositioningStatus = 'pending'` via
> `goal_positioning_updated_at`, and `onboardingCourseStatus` in
> `pending`/`building` via `onboarding_course_updated_at` — to `failed` with a
> curated interruption message, so the done page stops polling and shows the
> existing retry UI instead of spinning forever. The repair UPDATE re-checks
> status and staleness in its WHERE clause, so a goal submitted after the read
> is never clobbered, a zombie callback finishing after the repair affects zero
> rows, and a build that genuinely completes late can still flip `failed` →
> `ready`. Live QA with account `claude.qa.n3.20260710@primoria.local`: a
> backdated pending goal came back from `GET /api/onboarding` as `failed` with
> "Positioning was interrupted before it finished. Please submit your goal
> again."; a backdated `building` course came back `failed` with "Course
> preparation was interrupted before it finished. Please retry." while the
> positioned goal stayed intact; `POST /api/onboarding/course` from that state
> built `crs_twajjyxmmrenmbqu` and returned `ready`. New CI coverage:
> `tests/onboarding-stale-recovery.spec.ts` (7 cases); new DB suite
> `tests/learner-profile-stale-recovery.db.ts` (12 checks, wired into
> `test:onboarding-goal:db`, run against `primoria_test`). Typecheck, targeted
> ESLint, and the full Vitest run (172 passed / 1 skipped) passed; the only
> non-green item is a pre-existing `legacy-units` source-map "Test Run Error"
> that reproduces on a clean HEAD worktree. N-3 was removed from the
> unresolved issue list.

> Follow-up 2026-07-10 (Issue 4): both onboarding routes are now instrumented
> — `POST /api/onboarding/goal` and `POST /api/onboarding/background` return a
> `Server-Timing` header (phases: `auth`, `save_*`, `resolve_anchor`,
> `build_course`, `state`, `total`) and log one `[timing] onboarding/…` line
> per request; the `after()` positioning callback logs its own
> `[timing] onboarding/goal:background` line (helper:
> `src/lib/observability/server-timing.ts`). Re-measured with 1 warmup + 3
> fresh-account runs against the local dev server ("Teach me Python from the
> beginning", library path): goal POST handler 14.9–19.6ms (wall 21–27ms
> warm), background positioning wait via the poll loop 3.96–9.68s (dominated
> by the external embedding/LLM call in `resolve_anchor`; already async with
> polling and now covered by the N-3 stale fallback), background POST handler
> 137–174ms of which `build_course` was 117–159ms, all runs ending
> `courseStatus: ready`. Conclusion: the recorded 45s "Locating" / 90s
> background waits do not reproduce and were dev first-compile artifacts (the
> compile monopoly is already recorded above); the synchronous in-request
> course build costs ~150ms on the library path, so converting the background
> step to `after()` + polling is not justified. Instrumentation stays in
> place. Measurement accounts follow the throwaway pattern
> `claude.qa.i4.run<N>.<nanos>@primoria.local` (password
> `Primoria-QA-I4-20260710-7rT!`). Typecheck, targeted ESLint, and the full
> Vitest run passed with the same single pre-existing non-green legacy item.
> Issue 4 was removed from the unresolved issue list.

> Follow-up 2026-07-10 (N-5): the outline auto-refresh in
> `course-outline-view.tsx` now marks a completed lesson job in `refreshedRef`
> only after `GET /api/courses/:id` succeeds and the course state is applied.
> Previously the lessonId was marked before the fetch, so one failed refresh
> pinned stale outline data for that lesson forever; now a failed or non-OK
> fetch leaves the job unmarked and the next jobs poll retries it (an
> occasional duplicate read-only fetch replaces the permanent stall).
> Typecheck and ESLint passed. N-5 was removed from the unresolved issue
> list.

> Follow-up 2026-07-10 (Issue 8): the Library empty state is now
> onboarding-aware. `LibraryPage` fetches `getLearnerOnboardingState` for the
> signed-in user (in the same `Promise.all` as courses/jobs, so no extra
> latency) and passes `onboardingIncomplete` to `CourseLibraryGrid`; when the
> library is empty and onboarding is unfinished, the empty state shows
> "先完成入门设置，Primoria 会围绕你的学习目标生成第一门课程。" with a
> "继续入门设置" CTA (en: "Finish onboarding and Primoria will build your
> first course around your learning goal." / "Continue onboarding") linking to
> `/`, where the onboarding flow lives. The `checkingBuilds` branch keeps
> priority, and completed-onboarding users still see the original
> create-first-course copy. New dictionary keys `library.finishOnboardingCopy`
> / `library.finishOnboardingCta` in both locales. Live QA with fresh account
> `claude.qa.i8.20260710@primoria.local` (password
> `Primoria-QA-I8-20260710-7rT!`): `GET /library` rendered the new copy and
> CTA. Typecheck, targeted ESLint, and the full Vitest run passed with the
> same single pre-existing non-green legacy item. Issue 8 was removed from the
> unresolved issue list.

> Follow-up 2026-07-10 (Issue 9): planned-lesson outline descriptions are now
> enriched by one best-effort background LLM call. `initializeCourseOutline`
> schedules `enrichCourseOutlineDescriptions`
> (`src/lib/ai/course-generation/outline-enrichment.ts`) via `after()` for NEW
> courses only; it re-reads the course from the database, sends up to 40
> lessons (title + current template) in a single `invokeJson` structured call
> (30s timeout), normalizes each returned description (whitespace collapse,
> 160-char cap, same language as titles), and persists per lesson through
> `updateLessonDescriptionIfUnchanged` — an UPDATE fenced on the description
> value read at enrich time, so learner or concurrent edits are never
> clobbered. All failures (model, parse, DB) log
> `[course] outline enrichment failed` and keep the templates; the kill switch
> is `PRIMORIA_DISABLE_OUTLINE_ENRICHMENT=1` (documented in `.env.example`).
> The lesson-generation publish path writes title/blocks/estimatedMinutes but
> not description, so enrichment cannot be overwritten by the first lesson
> build. Live QA: onboarding account `claude.qa.i4.runi9…@primoria.local`
> built `crs_zhieif4vmreoylfc` and all lesson rows were rewritten from the
> template to specific one-liners (e.g. "Run Python code interactively and
> from script files using the interpreter."). New CI suite
> `tests/outline-enrichment.spec.ts` (9 cases, including new-vs-reused course
> scheduling). Typecheck, ESLint, and the full Vitest run passed with the same
> single pre-existing non-green legacy item. Issue 9 was removed from the
> unresolved issue list — the 2026-07-09 QA list is now empty.

## Test account

- Environment: local development at `http://localhost:3000`
- Created at: 2026-07-09 20:45 CST
- Display name: Codex QA 2026-07-09
- Email: codex.qa.20260709.1783601085409@primoria.local
- Password: Primoria-QA-20260709-9xK!

## Second test account after KG seed

- Created at: 2026-07-09 21:05 CST
- Display name: Codex QA After KG
- Email: codex.qa.afterkg.20260709.1783602325492@primoria.local
- Password: Primoria-QA-AfterKG-20260709-7rT!

## Targeted retest account

- Created at: 2026-07-10 02:26 CST
- Display name: Codex QA Retest 1783621595237
- Email: codex.qa.retest.1783621595237@primoria.local
- Password: Primoria-QA-Retest-1783621595237-7rT!
- Purpose: 2026-07-10 targeted retest of `temple/browser-qa-issue-list-2026-07-09.md`.

## Sign-up navigation regression account

- Created at: 2026-07-10 12:38 CST
- Display name: Codex QA Signup 1783658297848
- Email: codex.qa.signupfix.1783658297848@primoria.local
- Password: Primoria-QA-Signup-1783658297848-7rT!
- Purpose: Issue 7 registration navigation and duplicate-email regression.

## N-3 stale-pending recovery account

- Created at: 2026-07-10 16:08 CST
- Display name: Claude QA N3
- Email: claude.qa.n3.20260710@primoria.local
- Password: Primoria-QA-N3-20260710-7rT!
- Purpose: N-3 stale goal-positioning / course-build timeout repair and retry loop.

## Notes

- Browser sign-up created the account, session row, and cookie successfully.
- After successful sign-up, the page stayed on `/auth/sign-up` with no success or error feedback instead of moving to `/library`.
- Direct navigation to `/library` in the same browser showed the account as signed in.
- Local DB initially had no KG tables. Applied:
  - `pnpm --filter @primoria/web db:migrate:kg`
  - `pnpm --filter @primoria/web db:seed:kg-all`
  - `pnpm --filter @primoria/web exec node scripts/seed-kg-embeddings.mjs all`
- Before KG seed, onboarding surfaced raw database text to the learner: `relation "public.kg_node_embeddings" does not exist`.
- After KG seed, onboarding generated a course and first lesson for the second account.
- The prompt `Teach me Python from the beginning` produced a course titled `Structure and Interpretation of Computer Programs`; outline topics include Scheme, SQL, and advanced functional programming, so goal-to-course alignment is poor for a Python beginner request.
- First Tutor page compile and course reader compile can monopolize the Next dev server for minutes. After the course-reader attempt, web became unresponsive until `apps/web/.next` was cleared and web dev was restarted.
- 2026-07-10 retest:
  - Missing KG table simulation no longer leaks raw SQL. `/api/health` returned degraded; positioning returned safe `knowledge_graph_unavailable`; onboarding background stored the same safe message.
  - With `PRIMORIA_ALLOW_KG_INFRA_FALLBACK=1`, missing KG table routed `MCP server development for beginners` through freeform generation and created `gen_mcp_server_development_087068ac` / `crs_pcquzhlumrduq1c5`.
  - Stopping Postgres made `/api/health` return 503 unhealthy; positioning returned 401 because auth/session lookup failed first.
  - Dev route long-tail still reproduced: one `/api/health` call took 64.87s; authenticated course outline/detail requests exceeded 60s.
  - Bundle analyzer rerun succeeded and generated `apps/web/.next/analyze/{client,nodejs,edge}.html`.

## Screenshot evidence

- `/tmp/primoria-qa-login-20260709.png`
- `/tmp/primoria-qa-library-after-signup-20260709.png`
- `/tmp/primoria-qa-root-after-compile-20260709.png`
- `/tmp/primoria-qa-onboarding-goal-after-wait-20260709.png`
- `/tmp/primoria-qa-onboarding-background-after-wait-20260709.png`
- `/tmp/primoria-qa-onboarding-finish-afterkg-20260709.png`
- `/tmp/primoria-qa-course-outline-afterkg-20260709.png`
- `/tmp/primoria-qa-course-outline-after-build-wait-20260709.png`
- `/tmp/primoria-retest-welcome-1783621595237.png`
- `/tmp/primoria-retest-root-redirect-1783621595237.png`
- `/tmp/primoria-retest-after-signup-1783621595237.png`
- `/tmp/primoria-retest-course-outline-1783621898618.png`
- `/tmp/primoria-issue2-outline-fixed.png`
- `/tmp/primoria-issue2-mermaid-fixed.png`
- `/tmp/primoria-n1-course-build-failed.png`
- `/tmp/primoria-n1-course-build-recovered.png`
- `/tmp/primoria-issue7-duplicate-email.png`
