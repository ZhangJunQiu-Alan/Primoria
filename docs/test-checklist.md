# Regression Checklist (Unified Viewer + Builder Workspace)

Last updated: 2026-04-04

## A. Build & Static Checks

- [ ] `pnpm install`
- [ ] `python -m py_compile agent-service/app/routes/interactive_visuals.py agent-service/app/services/interactive_visuals.py`
- [ ] `pnpm --filter @primoria/schema exec vitest run test/blocks.test.ts test/migrations.test.ts`
- [ ] `pnpm --filter @primoria/viewer-react typecheck`
- [ ] `pnpm --filter @primoria/viewer-react test`
- [ ] `pnpm --filter @primoria/viewer-react build`
- [ ] `pnpm --filter @primoria/viewer-react e2e` covers fixture-mode browser flows only
- [ ] `pnpm --filter @primoria/viewer-react smoke:cloud` is reserved for real Supabase/browser verification with smoke accounts

## B. Builder Routing & Access

- [ ] logged-out user opening `/builder/dashboard` is redirected to `/login` with `returnTo`
- [ ] logged-out user opening `/builder/editor` is redirected to `/login` with `returnTo`
- [ ] logged-in user opening `/dashboard` is redirected to `/builder/dashboard`
- [ ] any logged-in role can enter protected builder routes

## C. Builder Editor Core

- [ ] create a blank lesson in `/builder/editor`
- [ ] import JSON using canonical `lessons` key
- [ ] import legacy JSON using `pages` key and verify migration success
- [ ] explicit save completes without remote persistence errors
- [ ] publish aborts if the save step fails
- [ ] save and publish complete without schema-blocking errors
- [ ] text block richtext content renders correctly in learner preview
- [ ] `text`, `code-block`, and `code-playground` support inline editing on canvas
- [ ] `image` block uploads to Supabase and renders back in canvas + preview
- [ ] visibility defaults:
  - first block = `always`
  - non-first block = `afterPreviousCorrect`
- [ ] gated blocks reveal only after a correct answer + `Check`
- [ ] learner preview supports page progress and `Prev / Check / Next`

## D. Dashboard Tabs

### D1. Home
- [ ] greeting changes by time period
- [ ] quick action buttons work (create/continue/data center)
- [ ] weekly learners / total study hours cards render from dashboard analytics
- [ ] completion trend renders from the 7-day analytics payload
- [ ] top courses list renders with real views + students copy and open action
- [ ] recent activity feed renders learner and latest-course signals
- [ ] empty state shows when there are no courses

### D2. Course Management
- [ ] loading / empty / list states work
- [ ] summary strip renders (courses/lessons/published/drafts/need-content)
- [ ] search and status filters work together (`all` / `draft` / `published`)
- [ ] no-results state appears and clear-filters action resets view
- [ ] `student` / `comments` sort modes rank courses by real metrics
- [ ] course cards expose visible `students` / `comments` metric chips
- [ ] create/edit/delete course still work
- [ ] duplicate course creates a new draft row
- [ ] open-course action routes to builder with the selected course context
- [ ] add lesson and delete lesson flows still work

### D3. Data Center
- [ ] KPI row renders with published viewers and average completion from analytics RPC
- [ ] course volume trend renders from `created_at` and `published_at`
- [ ] course type distribution donut renders
- [ ] revenue trend renders with estimated placeholder copy
- [ ] learning progress tracking renders monthly activity + completion data
- [ ] published course viewers ranking renders published-only course rows
- [ ] export action is reachable

### D4. Fan Management
- [ ] fan KPI and trend render
- [ ] search/filter/pagination work
- [ ] engagement timeline renders
- [ ] learner tag actions are reachable
- [ ] reserved bulk actions show placeholder feedback

### D5. Dashboard Account / Settings Integration
- [ ] account summary loads from Supabase
- [ ] workflow settings save locally
- [ ] settings entry opens unified Viewer settings
- [ ] sign-out action uses the shared Viewer auth flow

## E. Viewer React Core

- [ ] login/register flow works
- [ ] course enrollment works
- [ ] Home / Library / Community / Profile use shared page shell widths
- [ ] desktop layout in Viewer React is wider than mobile/tablet and remains centered/readable
- [ ] lesson screen displays current lesson title (not course title)
- [ ] text content still renders correctly in lesson playback
- [ ] profile screen loads XP/streak and achievement-related data
- [ ] logo/entry navigation paths return users to expected builder/home targets
- [ ] learner shell navigation tests in `packages/viewer-react/test/` pass
- [ ] settings and profile tests in `packages/viewer-react/test/` pass

## F. Data Consistency

- [ ] rename lesson in Builder, save, return to `/builder/dashboard`, confirm new lesson title is visible
- [ ] `smoke:cloud` publishes a reusable smoke course after lesson rename, opens Viewer React, and returns to author dashboard to verify `weekly learners` / `published viewers` / top-course analytics
- [ ] course with sparse snapshot rows still loads in the React viewer fallback path

## G. Known Non-Blocking Gaps

1. Revenue metrics are still fallback-derived in dashboard.
2. Some analytics/fans actions are UI-ready but backend endpoints are not yet implemented.
3. Cloud smoke analytics validation still depends on configured real Supabase smoke credentials.
