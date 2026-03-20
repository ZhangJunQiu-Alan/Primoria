# Dashboard Architecture

Last updated: 2026-03-20

## Scope

The Builder dashboard (`/dashboard`) now lives in the React app under `packages/builder/`.
It is the creator workspace shell with sidebar navigation, top actions, and four primary tabs.

Tabs:
1. Home
2. Course Management
3. Data Center
4. Fan Management

## File Map

- `packages/builder/src/pages/dashboard/DashboardPage.tsx`
  - dashboard shell, tab switching, notices, dialogs, course cards, lesson actions
- `packages/builder/src/pages/dashboard/DashboardSettingsDialog.tsx`
  - global settings dialog for account, workflow, notifications, and data
- `packages/builder/src/pages/dashboard/dashboard.css`
  - botanical visual system, layout, cards, dialog styling, responsive behavior
- `packages/builder/src/queries/courses.ts`
  - course list fetch plus create/update/delete/duplicate course and add/delete lesson mutations
- `packages/builder/src/components/account/AccountMenu.tsx`
  - avatar menu entry point for settings and session actions
- `packages/builder/src/services/StorageService.ts`
  - local persistence for builder/dashboard preferences and local draft cleanup

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
  - open builder on a specific course/lesson
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

### 5) Dashboard Settings Dialog

- sections:
  - Account
  - Workflow
  - Notifications
  - Data
- real actions:
  - load/save profile summary from Supabase `profiles`
  - save notification/accessibility preferences to `user_settings`
  - keep language normalized to English in the React Builder
  - persist local workflow/data preferences via `StorageService`
  - clear local `primoria_draft_*` entries without affecting remote courses

## Data Strategy

The dashboard uses a mixed strategy:
- real course/profile/settings data from Supabase where available
- derived placeholder values for analytics/revenue domains that do not yet have backend support
- local storage for workflow-only preferences and draft cleanup utilities

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
