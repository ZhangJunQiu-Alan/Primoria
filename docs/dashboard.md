# Dashboard Architecture

## Overview

The Dashboard (`/dashboard`) is the logged-in user's home — sidebar + tab-switched content area.

```
┌────────────┬─────────────────────────────┐
│  Sidebar   │  Topbar (avatar / sort)     │
│            ├─────────────────────────────┤
│  [Logo]    │                             │
│  [Build]   │  Tab Content (scrollable)   │
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
| `features/dashboard/dashboard_screen.dart` | Main screen — sidebar, tabs, all content |
| `widgets/user_avatar.dart` | Shared circular avatar (Dashboard + Builder) |
| `app/router.dart` | Auth guard, auto-redirect |

## Tabs

**Home Page** — Course Data card, Income Overview card, Comments card. Layout switches row/column at 700px.

**Course Manage** — Fetches courses via `getMyCourses()`. Sort dropdown + Create Course button. Each course card: title, time ago, Edit/Delete, lesson boxes (async loaded), Add lesson box. States: loading, sign-in prompt, empty, course list.

**Data Center / Fans Manage** — Placeholder (renders Home Page content).

## Data Flow

```
initState → _loadCourses() → getMyCourses() → _courses → rebuild
Card render → _loadCourseLessons(id) → getCourseContent(id) → _courseLessons cache → rebuild
```

## Navigation

| Action | Destination |
|--------|-------------|
| Build Course / Create Course | `/builder` |
| Edit / Lesson box / Add lesson | `/builder?courseId=<id>` |
| Delete | Confirmation → `deleteCourse()` → refresh |

## Auth Guard

Protected routes: `/dashboard`, `/builder` — redirect to `/` if not logged in. Logged-in users on `/` auto-redirect to `/dashboard`. Uses `_GoRouterRefreshStream` to bridge Supabase auth stream → GoRouter `refreshListenable`.

## Known Limitations

1. Lesson display depends on async `getCourseContent()` per card — can be slow with many courses
2. Sort by student/comments are placeholders
3. Data Center / Fans Manage tabs are placeholders
4. "Learned X times" shows lesson count, not actual learner count
