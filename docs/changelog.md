# Changelog

## [Unreleased] - 2026-02-10

### Summary
Dashboard Course Manage, auth-protected routing, UserAvatar component, Builder courseId loading.

### Added
- **Course Manage tab**: Fetches courses from Supabase, sort dropdown (time/student/comments), course cards with Edit/Delete, async lesson boxes, Add lesson / Create Course
- **UserAvatar widget** (`widgets/user_avatar.dart`): Shared avatar circle for Dashboard + Builder, OAuth photo or initials fallback, popup menu (Profile/Dashboard/Sign out)
- **Auth routing** (`router.dart`): `/dashboard` and `/builder` require login, logged-in users auto-redirect from `/` to `/dashboard`
- **Builder courseId loading**: Accepts `?courseId=<id>` to load existing course from Supabase

### Changed
- Dashboard Home Page: replaced `IntrinsicHeight` + `GridView` with `Row` + `Wrap` (fixes blank content)
- Dashboard + Builder: "Profile" text button → `UserAvatar` circle

---

## [Unreleased] - 2026-02-09

### Summary
Landing page, Dashboard shell, Builder UI redesign, Supabase auth integration.

### Added
- **Landing Page** (`/`): Header, hero section, feature cards, animated blur blobs, sign-in modal (Google/Apple/email+password)
- **Dashboard** (`/dashboard`): Sidebar navigation, Home Page tab (Course Data/Income/Comments cards), responsive layout (<1024px collapses to drawer)
- **CLAUDE.md**: Project-level instructions for Claude Code

### Changed
- **Builder UI**: Pill-shaped buttons, AI button (orange accent), Publish (green), logo image, expandable module panel with search
- **`supabase_service.dart`**: Added `isEmailRegistered()`, `signIn()` flags `isUserNotFound`

### Removed
- `bottomNavigationBar` and related page management methods from Builder

---

## [Unreleased] - 2026-01-31

### Summary
AI course generation, Supabase backend, course import, theme refactoring, cross-platform file picker, model tests.

### Added
- **AI Course Generator**: Gemini API integration for PDF-to-course generation
- **Course Import**: JSON file import with validation
- **File Picker**: Cross-platform conditional imports (web/stub)
- **Supabase Service**: Auth + cloud storage
- **UI Dialogs**: AI Generate, Auth, Profile
- **Model Tests**: 26 unit tests (Block, CoursePage, Course)
- **Docs**: `MVP_TEST_CHECKLIST.md`, `course-json-guide.md`
- **Backend**: `supabase/` directory with migrations

### Changed
- Theme system refactored (`design_tokens.dart`, `theme.dart`)
- Builder: toolbar with New/Import/Export, AI button, auth UI

### Fixed
- `dart:html` unavailable in VM test environment → conditional imports
