# Regression Checklist (Builder + Viewer)

Last updated: 2026-03-06

## A. Build & Static Checks

- [ ] `cd Builder && flutter pub get`
- [ ] `cd Builder && flutter analyze lib/features/dashboard`
- [ ] `cd Builder && flutter test`
- [ ] `cd Viewer && flutter pub get`
- [ ] `cd Viewer && flutter analyze`
- [ ] `cd Viewer && flutter test`

## B. Builder Routing & Access

- [ ] logged-out user opening `/dashboard` is redirected to `/`
- [ ] logged-out user opening `/builder` is redirected to `/`
- [ ] logged-in author/admin landing on `/` redirects to `/dashboard`
- [ ] non-author role cannot enter protected builder routes

## C. Builder Editor Core

- [ ] create blank lesson in `/builder`
- [ ] import JSON using canonical `lessons` key
- [ ] import legacy JSON using `pages` key and verify migration success
- [ ] save and publish complete without schema-blocking errors
- [ ] text block markdown/plain mode renders correctly in preview
- [ ] `text`, `code-block`, `code-playground` support inline editing on canvas
- [ ] visibility defaults:
  - first block = `always`
  - non-first block = `afterPreviousCorrect`

## D. Dashboard Tabs

### D1. Home (redesigned)
- [ ] greeting changes by time period
- [ ] quick action buttons work (create/continue/data center)
- [ ] overview KPIs and completion trend render
- [ ] top 3 courses list renders with open action
- [ ] recent activity timeline renders
- [ ] empty state shows when there are no courses

### D2. Course Manage (unchanged behavior)
- [ ] loading / empty / list states work
- [ ] create/edit/delete course still work
- [ ] add lesson entry still works
- [ ] lesson delete flow still works with confirmation and guard

### D3. Data Center (redesigned)
- [ ] KPI row renders
- [ ] trend chart renders and range selector works (7/30/90/all)
- [ ] performance bar chart and sorting selector render
- [ ] geographic pie chart renders
- [ ] heatmap renders
- [ ] detail table renders
- [ ] export action copies CSV text to clipboard

### D4. Fans Management (redesigned)
- [ ] fan KPI and trend render
- [ ] search/filter/pagination work
- [ ] engagement timeline renders
- [ ] learner tag create/remove works in UI
- [ ] batch actions are reachable and show reserved-action feedback

## E. Viewer Core

- [ ] login/register flow works
- [ ] course enrollment works
- [ ] lesson screen displays current lesson title (not course title)
- [ ] lesson body supports markdown rendering for text content
- [ ] profile screen loads XP/streak and achievement-related data
- [ ] logo/entry navigation paths return users to expected dashboard/home targets

## F. Data Consistency

- [ ] rename lesson in Builder, save, return to dashboard, confirm new lesson title is visible
- [ ] publish course after lesson rename, then open Viewer and verify lesson title consistency
- [ ] course with sparse snapshot rows still loads in Viewer fallback path

## G. Known Non-Blocking Gaps

1. Revenue metrics are fallback-derived in dashboard.
2. Some analytics/fans actions are UI-ready but backend endpoints are not yet implemented.
3. Course Manage sorting by student/comments is still placeholder logic.
