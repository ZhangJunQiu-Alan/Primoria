# Dashboard Architecture

> How the Dashboard screen works, its data flow, and interaction patterns.

---

## Overview

The Dashboard (`/dashboard`) is the logged-in user's home. It has a **sidebar** with navigation and a **content area** that switches between tabs.

```
┌─────────────┬──────────────────────────────────┐
│  Sidebar    │  Content Area                    │
│             │  ┌──────────────────────────────┐ │
│  [Logo]     │  │  Topbar (avatar / sort)     │ │
│  [Build     │  ├──────────────────────────────┤ │
│   Course]   │  │                              │ │
│             │  │  Tab Content (scrollable)    │ │
│  Home Page  │  │                              │ │
│  Course Mgr │  │                              │ │
│  Data Ctr   │  │                              │ │
│  Fans Mgr   │  │                              │ │
│             │  └──────────────────────────────┘ │
└─────────────┴──────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `features/dashboard/dashboard_screen.dart` | Main screen — sidebar, tabs, all tab content |
| `widgets/user_avatar.dart` | Shared circular avatar (Dashboard + Builder) |
| `app/router.dart` | Auth guard — redirects to `/` if not logged in |

## Tabs

### Home Page (default)
- **Course Data card** — 4 metric tiles (fans, likes, share) in a `Wrap`
- **Income Overview card** — "Hold The money: number"
- **Comments card** — 4 comment block placeholders in a `Wrap`

Layout: `LayoutBuilder` decides row vs column at 700px breakpoint.

### Course Manage
- Fetches courses from Supabase via `SupabaseService.getMyCourses()`
- Topbar: sort dropdown (`PopupMenuButton`) + "Create Course" button
- Each course rendered as a card with:
  - Title, "Updated X ago", "Learned X times"
  - Edit / Delete buttons
  - Lesson boxes (loaded async from course content via `getCourseContent()`)
  - "Add lesson" dashed box
- States: loading spinner, sign-in prompt, empty state, course list

### Data Center / Fans Manage
- Currently render the same Home Page content (placeholder)

## Data Flow

```
Dashboard initState()
  └─> _loadCourses()
        └─> SupabaseService.getMyCourses()  →  _courses list
              └─> setState() triggers rebuild

Course Card renders
  └─> _loadCourseLessons(courseId)  (async, cached in _courseLessons map)
        └─> SupabaseService.getCourseContent(courseId)
              └─> extracts page titles → setState()
```

## Navigation

| Action | Destination |
|--------|-------------|
| "Build Course" sidebar button | `/builder` (new course) |
| "Create Course" top button | `/builder` (new course) |
| "Edit" on course card | `/builder?courseId=<id>` (load existing) |
| "Add lesson" box | `/builder?courseId=<id>` (load existing) |
| Lesson box click | `/builder?courseId=<id>` (load existing) |
| "Delete" on course card | Confirmation dialog → `deleteCourse()` → refresh |

## Sort Dropdown

Three options via `PopupMenuButton`:
- **Sort By time** — `updated_at` descending (default)
- **Sort By student** — placeholder (no real data yet)
- **Sort By comments** — placeholder (no real data yet)

## Auth Guard (router.dart)

```dart
redirect: (context, state) {
  if (!loggedIn && isProtected) return '/';   // kick to landing
  if (loggedIn && location == '/') return '/dashboard';  // auto-enter
  return null;
}
```

Protected routes: `/dashboard`, `/builder`

`_GoRouterRefreshStream` converts `SupabaseService.authStateChanges` stream into a `ChangeNotifier` for GoRouter's `refreshListenable`.

## UserAvatar Widget

Shared between Dashboard and Builder.

| State | Display | Tap action |
|-------|---------|------------|
| Not logged in | Blue-bordered circle with person icon | Opens `AuthDialog` |
| Logged in (has photo) | Circular profile image | `PopupMenuButton` → Profile / Dashboard / Sign out |
| Logged in (no photo) | White initials on blue circle (#4D7CFF) | Same popup menu |

Avatar URL priority: `user_metadata['avatar_url']` → `user_metadata['picture']` → initials fallback.

## Color Tokens (private `_C` class)

| Token | Hex | Usage |
|-------|-----|-------|
| `bg` | #F6FBFF | Page background |
| `surface` | #FFFFFF | Sidebar, cards |
| `text` | #1C2B33 | Primary text |
| `muted` | #607086 | Secondary text |
| `primary` | #58CC02 | Green accents |
| `accent` | #4D7CFF | Blue accents, active nav |
| `danger` | #E53E3E | Delete actions |

## Known Limitations

1. **Lesson display** depends on async `getCourseContent()` per card — can be slow with many courses
2. **Sort by student / comments** are placeholders — no backend data source yet
3. **Data Center / Fans Manage** tabs are placeholders showing Home Page content
4. **Course card** "Learned X times" currently shows lesson count, not actual learner count
