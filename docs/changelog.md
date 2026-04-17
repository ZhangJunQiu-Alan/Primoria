# Changelog

## [Unreleased] - 2026-04-16 (Engineering Hardening — Lint, Env Guard, Edge Function Tests)

### Summary
Three technical debt items resolved: ESLint gate added to CI, Supabase env strict guard enforced at build time, and Edge Function pure-function test suite bootstrapped.

### Changed

- **ESLint v10 flat config** (`eslint.config.mjs` at repo root)
  - Stack: `@eslint/js` + `typescript-eslint` v8 + `eslint-plugin-react-hooks` v7 + `eslint-plugin-react-refresh`
  - `packages/viewer-react`, `packages/schema`, `packages/db` all have `lint` scripts; root `pnpm lint` runs all
  - CI (`viewer-react-ci.yml`) gains a `Lint` step before `Typecheck`
  - Fixed 3 real code bugs found during audit:
    - `achievementPresentation.ts`: removed useless initial assignments overridden by `switch` default
    - `DashboardPage.tsx`: replaced render-time mutable offset accumulation with immutable `reduce`
    - `Live2DHeroModel.tsx`: restructured `let observer` → `const observer` after early-return guard
  - 9 existing `eslint-disable` comments annotated with reasons; 44 warnings retained as future-work signals

- **Supabase env strict guard** (`packages/viewer-react/vite.config.ts`)
  - Added `require-supabase-env` Vite plugin: `buildStart` throws if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is absent outside fixture mode
  - Removed hardcoded production Supabase URL/key fallback from `supabase.ts`; placeholder values used in fixture/test path instead
  - CI `Verify strict env guard` step now correctly passes; production/preview workflows unaffected (secrets injected via GitHub)

- **Edge Function pure-function test suite** (`supabase/functions/`)
  - Extracted pure functions from both AI Edge Functions into separate helper files:
    - `viewer-ai-quiz-from-docs/quizHelpers.ts`: `buildCourseSlug`, `buildQuizPrompt`
    - `viewer-ai-mindmap-from-docs/mindmapHelpers.ts`: `normalizeLabel`, `normalizeTitle`, `sanitizeMindMapTree`, `toPersistedDocument`, `buildMindMapPrompt` + types + constants
  - Added 3 Deno test files (35 test cases total):
    - `quizHelpers.test.ts`, `mindmapHelpers.test.ts`, `_shared/geminiResponse.test.ts`
  - Key coverage: node count cap, depth truncation, width truncation, empty-label throw, `toPersistedDocument` structural correctness, Gemini markdown fence unwrapping, empty/missing candidate handling
  - CI gains `Setup Deno` + `Edge Function unit tests` (`deno test --allow-env supabase/functions/`) steps
  - Root `package.json` gains `test:functions` script

### Documentation

- `docs/technical-debt-register-zh.md`: items 1.2, 1.3, 1.4 marked resolved
- Deleted stale docs: `viewer-react-migration-checklist.md` (migration complete), `agent-service-v1.md` (superseded), `prompt.txt` (scratch)

### Validation

- `pnpm --filter @primoria/viewer-react typecheck` — pass
- `pnpm --filter @primoria/viewer-react test` — 110/110 pass
- `pnpm --filter @primoria/viewer-react lint` — 0 errors, 44 warnings
- `pnpm --filter @primoria/viewer-react build` — pass (reads from `.env`)

---

## [Unreleased] - 2026-04-04 (Unified Viewer + Builder Workspace)

### Summary
Primoria now runs as a single React frontend package. The standalone Builder app, cross-app
handoff flow, and legacy Flutter viewer tree were removed, while Builder dashboard/editor
capabilities now live inside `packages/viewer-react` behind shared auth and routing.

### Changed

- **Single frontend app**
  - moved Builder dashboard, editor, store slices, queries, and services into `packages/viewer-react`
  - added unified routes: `/builder/dashboard`, `/builder/editor`, and `/builder/editor/:courseId`
  - preserved compatibility redirects from `/dashboard` and `/editor*`
- **Auth and navigation**
  - Builder access now requires only an authenticated session, not author/admin role checks
  - Viewer login, register, and auth callback flows now preserve `returnTo` for Builder routes
  - Viewer bottom nav now includes a first-class `Builder` tab inside the same SPA
- **Workspace UX**
  - Builder dashboard keeps the learner shell; Builder editor uses a dedicated workspace shell
  - editor now restores local drafts, warns on unsaved exits, and offers direct return paths to Builder dashboard and Viewer home
  - account/settings/logout flows are unified under Viewer settings and support pages
- **Repository cleanup**
  - removed the standalone `packages/builder` app
  - removed Builder handoff functions and migration
  - removed the Flutter `Viewer/` tree and old Flutter deployment workflow
  - run scripts now point to the unified Viewer package only
- **Documentation**
  - updated `docs/README*`, `docs/dashboard*`, `docs/test-checklist*`, and operations docs to reflect the single-app architecture

### Validation

- `pnpm install` — pass
- `pnpm --filter @primoria/viewer-react typecheck` — pass
- `pnpm --filter @primoria/viewer-react test` — pass (`20/20`)
- `pnpm --filter @primoria/viewer-react build` — pass

---

## [Unreleased] - 2026-03-20 (Builder Hardening)

### Summary
This pass tightened the active React Builder implementation around save safety, access control,
and source-of-truth clarity. The editor now uses explicit remote saves only, publish aborts on
save failure, and Builder access is limited to author-capable profiles.

### Changed

- **Save/publish safety**
  - introduced explicit remote-save flow in `useSaveCourse`
  - publish now stops immediately if the save step fails
  - toolbar save errors are surfaced directly instead of being swallowed
- **Role-based access**
  - Builder route access now requires profile role `author` or `admin`
  - auth bootstrap reads `profiles.role` and stores it in Redux auth state
- **Draft model cleanup**
  - removed local draft persistence and stale local-draft rehydration
  - manual save is now the only Builder checkpoint
- **Progress model cleanup**
  - removed `requiredForProgress`; `visibilityRule` is now the single progression control
- **Repository cleanup**
  - run scripts now launch the React Builder from `packages/builder`
  - docs no longer reference the removed legacy Builder tree

### Validation

- `pnpm --filter @primoria/builder typecheck` — pass
- `pnpm --filter @primoria/builder test` — pass (`75/75`)
- `pnpm --filter @primoria/builder build` — pass

---

## [Unreleased] - 2026-03-20 (React Builder Parity Pass)

### Summary
The React Builder completed its parity pass as the current authoring surface. This iteration
finished the missing authoring interactions, normalized Builder UI copy, and aligned the docs
with the active codebase.

### Changed

- **Editor parity**
  - block visibility is configurable in block settings, with the first block on each page locked to `always`
  - learner gating uses `afterPreviousCorrect` end-to-end in preview mode
  - `text`, `code-block`, and `code-playground` support direct on-block editing
  - `image` blocks upload assets to Supabase from the canvas flow
- **Preview redesign**
  - preview uses a centered lesson stage with page progress and `Prev / Check / Next`
  - redundant preview chrome was removed
- **UI normalization**
  - dashboard/auth/settings copy cleaned to English-only
  - stale `zh-CN` handling and old test selectors removed
- **Documentation**
  - `docs/README*`, `docs/dashboard*`, `docs/test-checklist*`, and `docs/todo*` now describe the active React Builder architecture

### Validation

- `pnpm --filter @primoria/builder typecheck` — pass
- `pnpm --filter @primoria/builder exec vitest run test/dashboardPage.test.tsx test/editorLayout.test.tsx test/previewMode.test.tsx test/editorSlicePhase4.test.ts` — pass
- `pnpm --filter @primoria/builder exec vitest run test/editorInlineBlocks.test.tsx test/editorPage.test.tsx` — pass

---

## [Unreleased] - 2026-03-19 (React Builder Foundation)

### Summary
Established the React Builder stack under `packages/` with shared schema/types, dashboard,
editor, preview, and publish flows.

### Added

- `@primoria/schema` — canonical course schema, migration helpers, and fixtures
- `@primoria/db` — generated Supabase types for the active backend
- `@primoria/builder` — React/Vite authoring app with auth, dashboard, editor, preview, publish, and block configuration flows
- Builder test coverage across route guards, editor state, layout, dashboard, and preview behavior

### Validation

- `pnpm typecheck` (workspace-wide) — pass
- `pnpm test` (workspace-wide) — pass
