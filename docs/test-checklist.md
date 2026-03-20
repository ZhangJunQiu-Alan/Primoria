# Regression Checklist (Builder + Viewer)

Last updated: 2026-03-20

## A. Build & Static Checks

- [ ] `pnpm install`
- [ ] `pnpm --filter @primoria/schema exec vitest run test/blocks.test.ts test/migrations.test.ts`
- [ ] `pnpm --filter @primoria/builder typecheck`
- [ ] `pnpm --filter @primoria/builder test`
- [ ] `cd Viewer && flutter pub get`
- [ ] `cd Viewer && flutter analyze`
- [ ] `cd Viewer && flutter test`

## B. Builder Routing & Access

- [ ] logged-out user opening `/dashboard` is redirected to `/`
- [ ] logged-out user opening `/editor` is redirected to `/login`
- [ ] logged-in author/admin landing on `/` redirects to `/dashboard`
- [ ] non-author role cannot enter protected builder routes

## C. Builder Editor Core

- [ ] create a blank lesson in `/editor`
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
- [ ] overview KPIs and completion trend render
- [ ] featured courses list renders with open action
- [ ] recent activity feed renders
- [ ] empty state shows when there are no courses

### D2. Course Management
- [ ] loading / empty / list states work
- [ ] summary strip renders (courses/lessons/published/drafts/need-content)
- [ ] search and status filters work together (`all` / `draft` / `published`)
- [ ] no-results state appears and clear-filters action resets view
- [ ] create/edit/delete course still work
- [ ] duplicate course creates a new draft row
- [ ] open-course action routes to builder with the selected course context
- [ ] add lesson and delete lesson flows still work

### D3. Data Center
- [ ] KPI row renders
- [ ] trend chart renders and range selector works
- [ ] performance chart renders
- [ ] geographic breakdown renders
- [ ] heatmap renders
- [ ] detail table renders
- [ ] export action is reachable

### D4. Fan Management
- [ ] fan KPI and trend render
- [ ] search/filter/pagination work
- [ ] engagement timeline renders
- [ ] learner tag actions are reachable
- [ ] reserved bulk actions show placeholder feedback

### D5. Dashboard Settings
- [ ] account settings load from Supabase
- [ ] workflow settings save locally
- [ ] notification settings save successfully
- [ ] language remains normalized to English in the React Builder

## E. Viewer Core

- [ ] login/register flow works
- [ ] course enrollment works
- [ ] Home / Library / Community / Profile use shared page shell widths
- [ ] desktop layout in Viewer is wider than mobile/tablet and remains centered/readable
- [ ] lesson screen displays current lesson title (not course title)
- [ ] text content still renders correctly in lesson playback
- [ ] profile screen loads XP/streak and achievement-related data
- [ ] logo/entry navigation paths return users to expected dashboard/home targets
- [ ] `Viewer/test/viewer_layout_metrics_test.dart` passes
- [ ] `Viewer/test/viewer_page_shell_test.dart` passes

## F. Data Consistency

- [ ] rename lesson in Builder, save, return to dashboard, confirm new lesson title is visible
- [ ] publish course after lesson rename, then open Viewer and verify lesson title consistency
- [ ] course with sparse snapshot rows still loads in Viewer fallback path

## G. Known Non-Blocking Gaps

1. Revenue metrics are still fallback-derived in dashboard.
2. Some analytics/fans actions are UI-ready but backend endpoints are not yet implemented.
3. A few sort modes still use placeholder ranking logic.
