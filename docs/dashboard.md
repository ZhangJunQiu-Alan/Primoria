# Dashboard Architecture

Last updated: 2026-03-06

## Scope

Builder dashboard (`/dashboard`) is the creator workspace shell with sidebar navigation and tabbed content.

Tabs:
1. Home (redesigned)
2. Course Manage (redesigned workspace, core flows preserved)
3. Data Center (redesigned)
4. Fans Management (redesigned)

## File Map

- `Builder/lib/features/dashboard/dashboard_screen.dart`
  - shell, sidebar, topbar, tab switching
  - orchestrates course/lesson data actions and routes tab callbacks
- `Builder/lib/widgets/builder_settings_dialog.dart`
  - Builder settings center dialog (category nav + active panel rendering)
- `Builder/lib/widgets/user_avatar.dart`
  - account menu entry now opens Builder settings center
- `Builder/lib/services/storage_service.dart`
  - local persistence for builder settings center toggles/fields
- `Builder/lib/features/dashboard/dashboard_localizations.dart`
  - dashboard-only localization extension
- `Builder/lib/features/dashboard/tabs/home_tab.dart`
- `Builder/lib/features/dashboard/tabs/course_manage_tab.dart`
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

### 2) Course Manage

- Dedicated creator workspace tab (`DashboardCourseManageTab`) with:
  - page header + primary actions (`Create`, `AI Generate`, `Refresh`)
  - summary strip (courses/lessons/published/drafts/need-content)
  - control bar (search, status filters, sort menu)
- Course cards now include:
  - status chip + updated-at hint + metadata chips
  - clear primary/secondary actions (`Open Builder`, `Edit`, `Delete`)
- Lesson management zone is integrated inside each course card:
  - lesson tiles with quick open
  - add-lesson tile
  - delete affordance (guarded by existing confirmation/protection flow)
- States:
  - signed-out prompt
  - loading skeleton
  - empty
  - no-results
  - full-page error and inline recoverable error
- Core production behavior remains preserved:
  - create/edit/delete course
  - open course builder
  - add/delete lesson
  - existing dialogs/snackbars/guards

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

### 5) Builder Settings Center (Global Dialog)

- Entry:
  - Top-right avatar menu -> `Profile`
  - Authenticated dashboard profile flow (`_showProfile`) opens settings center
- Layout:
  - Desktop: left-side vertical category nav + right active panel
  - Compact width: top horizontal category nav + active panel
- Information architecture:
  - Account & Brand
  - Creator Workflow
  - AI Studio
  - Notifications
  - Publishing & SEO
  - Integrations & API
  - Security & Access
  - Billing & Plans
  - Data Controls
- Real/connected actions:
  - Save profile display name and avatar URL to Supabase profile
  - Switch UI language
  - Persist creator preferences to local storage
  - Clear all local course drafts
  - Sign out
- Notes:
  - Some actions remain UI placeholders until backend endpoints are added
    (for example full billing workspace, API credential issuance, sign out all devices)

## Data Strategy

Because not all analytics tables exist yet, providers use a mixed strategy:
- Prefer real Supabase data where available (`courses`, `follows`, `course_feedback`, `profiles`)
- Derive fallback/mock metrics for unavailable domains (revenue/event-level analytics)
- Explicit TODO markers are kept in provider files for backend hookup

## Responsive Behavior

- Desktop: multi-column dashboard composition
- Tablet: card wrapping and reduced chart/table density
- Mobile: single-column stack with compact cards/table cards

Course Manage specifics:
- content area centered with max-width constraint (`maxWidth: 1440`)
- cards and lesson tiles auto-wrap for tablet/mobile
- action clusters collapse to wrapped layout on narrower widths

## Known Gaps

1. Revenue and advanced analytics are still fallback-derived.
2. Fans reply/notification/export are UI-level placeholders pending backend endpoints.
3. Course Manage sort by student/comments remains placeholder logic.
4. Builder settings center contains a few placeholder actions awaiting backend API integration.
