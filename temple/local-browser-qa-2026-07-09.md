# Local Browser QA - 2026-07-09

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

## Screenshot evidence

- `/tmp/primoria-qa-login-20260709.png`
- `/tmp/primoria-qa-library-after-signup-20260709.png`
- `/tmp/primoria-qa-root-after-compile-20260709.png`
- `/tmp/primoria-qa-onboarding-goal-after-wait-20260709.png`
- `/tmp/primoria-qa-onboarding-background-after-wait-20260709.png`
- `/tmp/primoria-qa-onboarding-finish-afterkg-20260709.png`
- `/tmp/primoria-qa-course-outline-afterkg-20260709.png`
- `/tmp/primoria-qa-course-outline-after-build-wait-20260709.png`
