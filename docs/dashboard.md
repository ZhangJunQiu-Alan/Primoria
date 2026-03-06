# Dashboard Architecture

Last updated: 2026-03-06

## Scope

Builder dashboard (`/dashboard`) is the creator workspace shell with sidebar navigation and tabbed content.

Tabs:
1. Home (redesigned)
2. Course Manage (existing production behavior, intentionally preserved)
3. Data Center (redesigned)
4. Fans Management (redesigned)

## File Map

- `Builder/lib/features/dashboard/dashboard_screen.dart`
  - shell, sidebar, topbar, tab switching
  - keeps existing Course Manage logic and actions
- `Builder/lib/features/dashboard/dashboard_localizations.dart`
  - dashboard-only localization extension
- `Builder/lib/features/dashboard/tabs/home_tab.dart`
- `Builder/lib/features/dashboard/tabs/data_center_tab.dart`
- `Builder/lib/features/dashboard/tabs/fans_manage_tab.dart`
- `Builder/lib/features/dashboard/providers/dashboard_provider.dart`
- `Builder/lib/features/dashboard/providers/analytics_provider.dart`
- `Builder/lib/features/dashboard/widgets/`
  - `kpi_card.dart`
  - `trend_chart.dart`
  - `activity_timeline.dart`
  - `learner_table.dart`

## Tab Details

### 1) Home

- Greeting by local time (morning/afternoon/evening)
- Quick actions:
  - Create New Course
  - Continue Editing
  - View Analytics
- Learning Overview:
  - weekly learners
  - total study hours
  - completion trend line + delta badge
- Top 3 courses with:
  - title
  - views
  - completion progress
  - open-course action
- Recent activity timeline (max 5)
- Reserved income card (fallback-derived until billing tables are added)

### 2) Course Manage (unchanged behavior)

- Course list from `SupabaseService.getMyCourses()`
- Sort dropdown
- Create/Edit/Delete course
- Lesson cards + add lesson
- Existing dialogs/snackbars/guards remain intact

### 3) Data Center

- Top KPI row:
  - Total Learners
  - Total Views
  - Average Completion Rate
  - Average Rating
- Learning trend chart with range selector: 7D / 30D / 90D / All
- Course performance bar chart with sort selector
- Geographic distribution pie chart
- Learning time heatmap
- Course detail table
- Export action (CSV copied to clipboard)

### 4) Fans Management

- Fan overview KPIs + weekly growth trend
- Search/filter + paginated fan table
- Engagement timeline
- Learner tags panel (create/delete and batch-tag entry)
- Reserved messaging center
- Bulk actions entry (send notice / export data)

## Data Strategy

Because not all analytics tables exist yet, providers use a mixed strategy:
- Prefer real Supabase data where available (`courses`, `follows`, `course_feedback`, `profiles`)
- Derive fallback/mock metrics for unavailable domains (revenue/event-level analytics)
- Explicit TODO markers are kept in provider files for backend hookup

## Responsive Behavior

- Desktop: multi-column dashboard composition
- Tablet: card wrapping and reduced chart/table density
- Mobile: single-column stack with compact cards/table cards

## Known Gaps

1. Revenue and advanced analytics are still fallback-derived.
2. Fans reply/notification/export are UI-level placeholders pending backend endpoints.
3. Course Manage sort by student/comments remains placeholder logic.
