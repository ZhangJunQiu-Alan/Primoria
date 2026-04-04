# Dashboard Architecture

Last updated: 2026-03-20

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
- `packages/viewer-react/src/components/account/AccountMenu.tsx`
  - avatar menu entry point for unified settings, support, and session actions
- `packages/viewer-react/src/services/StorageService.ts`
  - local persistence for builder/dashboard preferences

## Tab Details

### 1) Home

- greeting by local time period
- quick actions for create / continue editing / open analytics
- overview KPIs and trend cards
- featured courses list with direct open actions
- recent activity feed
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
- summary strip for courses / lessons / published / drafts / need-content
- state coverage:
  - signed-out prompt
  - loading
  - empty
  - no-results
  - recoverable error

### 3) Data Center

- KPI row
- learning trend chart with range switching
- course performance chart
- geography breakdown
- learning-time heatmap
- detail table
- export affordance

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
- derived placeholder values for analytics/revenue domains that do not yet have backend support
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

1. Revenue and advanced analytics still rely on fallback-derived values.
2. Fan reply/notification/export flows remain UI-ready placeholders pending backend APIs.
3. Some sort modes still map to lightweight placeholder metrics rather than event-level facts.
