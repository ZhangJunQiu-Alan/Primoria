# Dashboard Architecture

## Overview

The Dashboard (`/dashboard`) is the logged-in creator workspace — sidebar + tab-switched content area.

```
┌────────────┬─────────────────────────────┐
│  Sidebar   │  Topbar (avatar / sort)     │
│            ├─────────────────────────────┤
│  [Logo]    │                             │
│  [Brand]   │  Tab Content (scrollable)   │
│            │                             │
│  Home Page │                             │
│  Course Mg │                             │
│  Data Ctr  │                             │
│  Fans Mg   │                             │
└────────────┴─────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `features/dashboard/dashboard_screen.dart` | Main shell — sidebar, topbar, tab switching, Course Manage (kept unchanged) |
| `features/dashboard/dashboard_localizations.dart` | Dashboard-specific i18n extension over `BuilderLocalizations` |
| `features/dashboard/tabs/home_tab.dart` | Redesigned Home tab |
| `features/dashboard/tabs/data_center_tab.dart` | Redesigned Data Center tab |
| `features/dashboard/tabs/fans_manage_tab.dart` | Redesigned Fans Management tab |
| `features/dashboard/providers/dashboard_provider.dart` | Home tab aggregated data state |
| `features/dashboard/providers/analytics_provider.dart` | Data Center + Fans analytics/fan state |
| `features/dashboard/widgets/*.dart` | Reusable dashboard cards/charts/tables/timeline widgets |
| `widgets/user_avatar.dart` | Shared circular avatar (Dashboard + Builder) |
| `app/router.dart` | Auth guard, auto-redirect |

## Tabs

**Home Page (redesigned)**  
Includes personalized greeting, quick actions, learning overview KPI cards, completion trend chart, Top 3 courses, recent activity timeline, and reserved income overview card. Supports desktop/tablet/mobile responsive layout.

**Course Manage (unchanged behavior)**  
Existing flows remain as-is: fetch `getMyCourses()`, sorting, create/edit/delete course, lesson cards, add lesson, and all related dialogs/guards.

**Data Center (redesigned)**  
Includes KPI row (learners/views/completion/rating), time-range switchable trend chart, course performance bar chart, geographic distribution pie chart, learning-time heatmap, detail table, and CSV export action.

**Fans Management (redesigned)**  
Includes fan overview stats + growth trend, searchable/filterable paginated fan list, engagement timeline, learner tag management (batch-tag entry), and reserved messaging center.

## Data Flow

```
DashboardScreen init → _loadCourses() (Course Manage data)
Home tab mount → dashboardHomeProvider
  ├─ getMyCourses()
  ├─ getDashboardMetrics()
  └─ getRecentComments()

Data/Fans tab mount → analyticsDashboardProvider / fansDashboardProvider
  ├─ getMyCourses()
  ├─ getDashboardMetrics()
  ├─ follows + profiles
  └─ derived analytics (with fallback/mock where source tables are not ready)
```

## Navigation

| Action | Destination |
|--------|-------------|
| Sidebar brand click | `/dashboard` |
| Create Course | Dialog → `createCourseRow()` → stays on Course Manage (refreshes list) |
| Edit / Lesson box / Add lesson | `/builder?courseId=<id>` |
| Delete course | Confirmation → `deleteCourse()` → refresh |
| Delete lesson (✕ on hover) | Confirmation → `getCourseContent()` → `removePage()` → `saveCourse()` → refresh lesson cache |

Builder title edits + Save update `courses.title` in DB. Returning to Dashboard reloads course data, keeping titles in sync.

## Auth Guard

Protected routes: `/dashboard`, `/builder` — redirect to `/` if not logged in. Logged-in users on `/` auto-redirect to `/dashboard`. Uses `_GoRouterRefreshStream` to bridge Supabase auth stream → GoRouter `refreshListenable`.

## Known Limitations

1. Some analytics are currently derived fallback/mock values because event-level tables are not complete yet.
2. Fans reply/batch notification/export actions are UI-ready but backend handlers are pending.
3. Course Manage sorting by student/comments remains placeholder logic from existing implementation.
