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
