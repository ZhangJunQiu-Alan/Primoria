# Changelog

## [Unreleased] - 2026-02-12

### Summary
Phone-mockup Viewer with interactive question blocks, visibilityRule gating, course rename API, CLAUDE.md enhancements.

### Added
- **Phone-mockup Viewer**: ViewerScreen now renders course pages inside a 375×812 phone frame with status bar, home indicator, rounded corners, and shadow — replaces the flat TabBarView layout
- **Interactive question blocks in Viewer**: MultipleChoice, FillBlank, TrueFalse, and Matching blocks are now fully interactive with answer selection, Check button, correct/incorrect feedback styling, and explanation reveal
- **visibilityRule on Block model**: New `visibilityRule` field (`'always'` | `'afterPreviousCorrect'`) controls block visibility — gated blocks are hidden until the preceding question is answered correctly
- **Gated badge in Builder**: Blocks with `visibilityRule: 'afterPreviousCorrect'` show an orange "Gated" lock badge in the block header
- **Visibility property in PropertyPanel**: New dropdown in block properties to set visibilityRule (`Always visible` / `After previous correct`)
- **`renameCourse()` API**: New `SupabaseService.renameCourse()` method for Dashboard Edit action — updates `courses.title` directly with ownership check
- 6 new unit tests for visibilityRule (default, serialization, deserialization, missing-from-JSON fallback, copyWith, roundtrip)
- **Builder browser draft storage for unsaved edits**: Added per-course draft APIs in `StorageService` (`saveCourseDraft`, `loadCourseDraft`, `hasCourseDraft`, `clearCourseDraft`) to persist unsaved Builder content in browser storage
- **Draft storage tests**: Added `test/storage_service_test.dart` for per-course draft save/load/isolation/clear behavior
- **Viewer visibility tests**: Added `test/viewer_visibility_test.dart` for hidden-gated rendering and chained unlock behavior

### Changed
- **Viewer routing**: `/viewer` route now accepts `?courseId=<id>` query param; back button returns to `/builder?courseId=<id>` preserving context
- **Builder Preview button**: Navigates to `/viewer?courseId=<id>` when courseId is available
- **Dashboard lesson labels**: Show actual lesson title from DB instead of generic "Lesson N" when available
- **`saveCourse` fix**: Removed duplicate `title` update from course metadata save (title is managed separately via `renameCourse`)
- **Code formatting**: Applied `dart format` across all changed files (block.dart, builder_screen, viewer_screen, block_wrapper, property_panel, etc.)
- **CLAUDE.md**: Added quality gates, task input template, key doc references
- **Viewer `afterPreviousCorrect` rendering**: Hidden gated blocks now render as true blank (no lock placeholder), and visibility is evaluated sequentially so a hidden gated block also keeps all following blocks hidden until unlocked
- **Builder course load flow**: Builder now restores local draft first (if present) before fetching cloud snapshot, and syncs title/unsaved status with restored content
- **Preview navigation safety**: Clicking Preview now writes a local draft first; successful cloud Save clears the corresponding local draft

---

## [Unreleased] - 2026-02-11

### Summary
True/False block type, Markdown rendering, Dashboard backend wiring, Create Course flow rework, and SupabaseService refactor.

### Added
- **True/False block type**: New `trueFalse` block across the full Builder stack — enum, model (`TrueFalseContent`), registry, property editor (SegmentedButton picker), preview widget (styled answer chips), module panel (Chemical category), and viewer screen support. JSON type value: `true-false`, content fields: `question`, `correctAnswer` (bool), `explanation` (optional)
- **Markdown rendering in Builder canvas**: Text blocks with `format: 'markdown'` now render via `MarkdownBody` with styled headings, bold/italic, lists, inline code, fenced code blocks, and links — matching Viewer output
- **Format toggle in property panel**: Markdown/Plain segmented button lets authors switch text format; monospace font and markdown-hint placeholder in editor when markdown is selected
- 6 new unit tests for TextContent format handling (defaults, copyWith, roundtrip, malformed markdown)
- **Dashboard HomePage wired to backend**: Course Data metrics (fans, likes, shares) read from `follows` and `course_feedback` tables; Income Overview reads from DB with $0 fallback; duplicate fans tile removed
- **Comments section**: Loads from `course_feedback` with profile enrichment; 0 comments → dashed placeholder, 1-4 → matching blocks, 5+ → capped at 4; "more" link navigates to Data Center
- **New service methods**: `getDashboardMetrics()`, `getRecentComments()`, `_getMyCourseIds()`, `createCourseRow()`, `getCourseLessonTitles()` in SupabaseService

### Changed
- **Create Course flow**: Creating a course from Dashboard no longer navigates to Builder; stays on Course Manage with refreshed list. Uses `createCourseRow()` (lightweight — only inserts course row, no chapters/lessons/snapshot). New courses show only "Add lesson" box; clicking it opens Builder
- **Dashboard lesson loading**: `_loadCourseLessons()` now queries DB `chapters` → `lessons` tables directly via `getCourseLessonTitles()` instead of loading full course JSON through `getCourseContent()`. Courses with no saved content correctly show 0 lessons
- **SupabaseService refactor**: Replaced `course_versions`-based storage with snapshot-based flow (`_saveCourseSnapshot` / `_loadCourseSnapshot` via `chapters` + `lessons.content_json`); `owner_id` → `author_id`; added `slug` generation; `difficulty` → `difficulty_level` with normalization; `courseId()` now generates pure UUID (removed `course-` prefix)
- **Builder title sync**: Editing course title in Builder and saving updates `courses.title` in DB; returning to Dashboard reloads fresh data, keeping titles in sync

---

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
