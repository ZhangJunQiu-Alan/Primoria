# Dashboard Architecture

Last updated: 2026-04-04

## Scope

The Builder dashboard now lives inside the unified Viewer React app at `/builder/dashboard`.
It is the creator workspace shell with sidebar navigation, top actions, and four primary tabs.

Tabs:
1. Home
2. Course Management
3. Data Center
4. Fan Management

## File Map

- `packages/viewer-react/src/pages/dashboard/DashboardPage.tsx`
  - dashboard shell, tab switching, notices, dialogs, course cards, lesson actions
- `packages/viewer-react/src/pages/dashboard/DashboardSettingsDialog.tsx`
  - shared dashboard profile/settings helper plus retained workspace settings dialog implementation
- `packages/viewer-react/src/pages/dashboard/dashboard.css`
  - botanical visual system, layout, cards, dialog styling, responsive behavior
- `packages/viewer-react/src/queries/courses.ts`
  - course list fetch plus create/update/delete/duplicate course and add/delete lesson mutations
- `packages/viewer-react/src/queries/dashboardAnalytics.ts`
  - author dashboard analytics RPC query, payload normalization, and empty-state defaults
- `packages/viewer-react/src/components/account/AccountMenu.tsx`
  - avatar menu entry point for unified settings, support, and session actions
- `packages/viewer-react/src/shared/api/viewer/analyticsEvents.ts`
  - fire-and-forget analytics event helper for course views and lesson starts
- `packages/viewer-react/src/services/StorageService.ts`
  - local persistence for builder/dashboard preferences

## Tab Details

### 1) Home

- greeting by local time period
- quick actions for create / continue editing / open analytics
- overview KPIs for weekly learners and total study hours
- real completion trend for the last 7 days
- top courses ranked by views, students, and completion quality
- recent activity feed tied to latest course updates and learner activity
- compact system notices and status feedback

### 2) Course Management

- creator workspace for course operations:
  - create course
  - edit metadata
  - delete course
  - duplicate course
  - add lesson
  - delete lesson
- open builder workspace on a specific course/lesson
- control bar with search, status filter, and sort mode
- sort modes include real learner-backed `student` / `comments` metrics
- summary strip for courses / lessons / published / drafts / need-content
- state coverage:
  - signed-out prompt
  - loading
  - empty
  - no-results
  - recoverable error

### 3) Data Center

- KPI row for course volume, published viewers, average completion, and estimated revenue
- course volume trend using `created_at` and `published_at`
- course type distribution donut
- revenue trend card kept as estimated placeholder
- learning progress tracking based on monthly active learners + completion rate
- published course viewers ranking list
- export affordance placeholder

### 4) Fan Management

- fan KPIs and growth trend
- search/filter/pagination
- engagement timeline
- tag management
- reserved bulk actions and messaging entry points

### 5) Dashboard Settings Helper

- sections:
  - Account
  - Workflow
  - Notifications
  - Data
- real actions:
  - load profile summary from Supabase `profiles`
  - persist local workflow/data preferences via `StorageService`
  - support the unified Viewer settings / account menu integration

## Data Strategy

The dashboard uses a mixed strategy:
- real course/profile/settings data from Supabase where available
- first-party author analytics facts from Supabase RPCs backed by `viewer_analytics_events` and seeded course baselines
- revenue remains estimated until settlement data exists
- local storage for workflow-only preferences

## Responsive Behavior

- desktop: sidebar shell with multi-column dashboard sections
- tablet: card wrapping with reduced chart/table density
- mobile: single-column stack with compact action rows and modal-first interactions

Course Management specifics:
- content area stays centered with a max-width layout
- course cards and lesson rows wrap naturally on smaller widths
- action clusters collapse without hiding primary operations

## Known Gaps

1. Revenue cards and trends are still estimated until settlement data is connected.
2. Fan reply/notification/export flows remain UI-ready placeholders pending backend APIs.
3. Advanced cohort/segmentation views are not yet implemented beyond the current author dashboard analytics surface.
