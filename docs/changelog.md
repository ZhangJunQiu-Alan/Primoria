# Changelog

## [Unreleased] - 2026-02-12

### Summary
Phone-mockup Viewer with interactive question blocks, schema migration compatibility, AI one-page generation improvements, and Code Playground runtime fixes.

### Added
- **Matching block UX improvements (Viewer)**: Color-coded pair chips with 8-accent palette, numbered circle badges on paired items, shuffled right column on init to prevent trivial positional matching, tap-to-unpair (tap an already-paired left or right item to clear the pair before submission), enhanced green/red feedback on both columns after submit
- **Matching block pair numbers (Builder canvas)**: `_MatchingBlockContent` now shows circled pair numbers on left and right items so the author can see the correct mapping at a glance
- **Matching export validation**: `_validateMatching()` in `CourseExport` checks ≥2 left items, ≥2 right items, non-empty question, no duplicate item IDs, valid pair references
- 10 new unit tests: 6 for `MatchingContent` model (default values, fromJson, toJson roundtrip, copyWith, empty lists fallback, null explanation) + 4 for matching export validation (valid pass, empty question, <2 left items, invalid pair reference)
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
- **Multi-select quiz authoring and validation**: MultipleChoice now supports `correctAnswers` list with single/multi authoring mode toggle and persisted multi-answer configuration
- **Multi-select viewer tests**: Added `test/viewer_multi_select_test.dart` for unordered multi-answer validation in Preview
- **Builder image local import**: Image block property panel now supports importing local image files (PNG/JPEG/GIF/WEBP) and storing as data URL for preview/edit persistence
- **Builder block reorder affordances**: Added drag insertion indicator (`Drop here`) and larger dedicated drag handle hitbox in canvas list
- **Centralized course schema validator**: Added `course_schema_validator.dart` with reusable import/save/publish/export validation, warning vs blocking error severity, and JSON field-path findings
- **Schema validation tests**: Added `test/course_schema_validator_test.dart` covering blocking errors, warning/error mode differences, import gate behavior, and export reuse
- **Schema migration pipeline for legacy JSON**: Added `course_schema_migrator.dart` and integrated it into `CourseImport` so unversioned / `0.8.x` / `0.9.x` legacy files are migrated to schema `1.0.0` before validation and parsing
- **Migration diagnostics**: `ImportResult` now carries migration details and import logs include per-step migration output for debugging failed/partial compatibility cases
- **Migration fixtures + tests**: Added `test/fixtures/legacy_unversioned_camelcase.json`, `test/fixtures/legacy_v0_9_modules_alias.json`, and `test/course_schema_migration_test.dart` for compatibility coverage and explicit unsupported-version failure behavior
- **AI generation model fallback strategy**: `AICourseGenerator` now prefers higher-tier Gemini models first (Gemini 3 Pro candidates), then falls back through compatible models when a candidate is unavailable for the provided API key
- **AI one-page generation contract**: Updated AI prompt + post-processing to keep output in exactly one page with up to 20 blocks and course-adaptive block type selection
- **AI JSON repair + normalization**: Added parse-repair flow and structural normalization to improve resilience when the model returns malformed or legacy-shaped JSON
- **Code playground regression tests**: Added `test/code_runner_test.dart` to cover expression output, assignment/arithmetic behavior, no-output behavior, and explicit runtime errors for unsupported functions

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
- **MultipleChoice answer checking**: Preview now validates multi-select answers as unordered sets (exact-match without order sensitivity)
- **Course export validation**: Export now validates MultipleChoice configuration (non-empty question/options, unique option ids, valid answer ids, single-select exactly one answer)
- **Image rendering compatibility**: Builder canvas and Viewer preview now render both network URLs and local data URLs for image blocks
- **Builder long-list drag UX**: Added edge auto-scroll during reorder drag and precision insertion index tracking for dense/long block lists
- **Validation gates enforced at lifecycle points**: Import, cloud save, and publish now use the same schema validator; blocking errors prevent operation and show actionable path-based details in Builder dialogs
- **Export validation reuse**: `CourseExport.validateForExport()` now delegates to the centralized schema validator instead of maintaining duplicated rule logic
- **AI generate dialog copy/status**: Dialog now communicates one-page/max-20 strategy and reports the chosen Gemini model in generation success status
- **Schema constants source of truth**: `CourseSchemaValidator` now reads schema URL/version from `Course` model constants instead of duplicate literals

### Fixed
- **Code Playground `(no output)` false negatives**: Python-like runner now evaluates common expressions (`type`, `int`, `float`, `round`, assignments, arithmetic) instead of only matching `print("literal")`
- **Expected output matching robustness**: Output comparison now ignores whitespace/newline formatting differences to reduce false "Try again" states
- **Property panel block ID display crash**: Prevented substring range errors when block IDs are shorter than 20 characters

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
