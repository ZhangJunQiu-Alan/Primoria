# Changelog

## [Unreleased] - 2026-02-23 (Viewer Profile Settings + Avatar Upload + Menu Cleanup)

### Summary
Completed Viewer Profile menu and settings flow. The top-right menu now provides Settings/About/Help/Log out. Added a dedicated Personal Info settings page connected to Supabase (`profiles`) for editing username/bio/avatar, displaying role, and showing joined date as month+year. Added avatar storage bucket/policies migration and fixed date-format locale crash in web settings. Removed the redundant settings panel at the bottom of the Profile page.

### Added
- **Viewer Settings screen** (`Viewer/lib/screens/profile_settings_screen.dart`): Personal Info section with editable `username`, editable `bio`, avatar upload, read-only `role`, read-only joined date (`Month yyyy` / `yyyy年M月`)
- **Cross-platform image picker adapter** (`Viewer/lib/services/image_picker_service.dart` + `image_picker_service_stub.dart` + `image_picker_service_web.dart`): web-native file input path and non-web `image_picker` path
- **Migration: `20260223000004_profile_avatar_storage.sql`**: Creates/updates public `avatars` storage bucket and adds `storage.objects` policies (public select, authenticated insert, owner update/delete)
- **Viewer profile i18n copy** (`Viewer/lib/l10n/app_localizations.dart`): strings for Settings/About/Help/Personal Info/Role/Joined at/upload/save feedback

### Changed
- **Profile top-right action** (`Viewer/lib/screens/profile_screen.dart`): replaced direct settings icon action with popup menu (`Settings`, `About`, `Help`, `Log out`)
- **Profile data sync model** (`Viewer/lib/providers/user_provider.dart`): `UserData` extended with `role`; profile refresh now reads `username`, `bio`, `avatar_url`, `role`, `created_at` from Supabase `profiles`
- **Profile update API** (`Viewer/lib/services/supabase_service.dart`): `updateProfile` now updates `profiles.username`, `profiles.bio`, `profiles.avatar_url`; added `uploadAvatar(Uint8List)` helper
- **Avatar upload behavior** (`Viewer/lib/screens/profile_settings_screen.dart`): upload success now persists avatar to DB immediately and refreshes profile cache

### Fixed
- **LocaleDataException on Settings page**: removed `DateFormat(locale)` dependency from profile month-year formatting to avoid missing locale init in Flutter web
- **Avatar upload “no response” behavior in Settings**: improved picker/upload failure paths with explicit error handling and snackbars
- **Profile UI redundancy**: removed bottom settings section from Profile tab; settings entry now only through top-right menu

---

## [Unreleased] - 2026-02-24 (Rich Create/Edit Course Form + Image Upload)

### Summary
Expanded Create Course and Edit Course dialogs in the Builder Dashboard with full metadata fields (description, difficulty, estimated hours, price tier, conditional price input). Added support for uploading a local image or entering a URL as course cover; images are stored in Supabase Storage (`course-thumbnails` bucket). Fixed a critical web file-reading bug where `readAsArrayBuffer` produced an unusable `ByteBuffer` (not `Uint8List`) in Dart/Web, causing silent hangs.

### Added
- **Migration: `20260224000001_add_price_to_courses.sql`**: Adds `price NUMERIC(10,2) NOT NULL DEFAULT 0` with a non-negative CHECK constraint to the `courses` table
- **Migration: `20260224000002_course_thumbnails_storage.sql`**: Creates `course-thumbnails` Supabase Storage bucket (public, 5 MB limit, JPEG/PNG/WebP/GIF); RLS policies: public read, authenticated insert, owner update+delete
- **`SupabaseService.updateCourseInfo()`**: New method updating all editable course fields (title, description, thumbnailUrl, difficultyLevel, estimatedMinutes, priceTier, price) with ownership check
- **`SupabaseService.uploadCourseThumbnail()`**: New method uploading image bytes to `course-thumbnails` bucket, returning `(String? url, String? error)` tuple; uses per-user subfolder + generated UUID filename
- **`pickImageFileBytes()` in `file_picker_web.dart`**: New file-picker variant using `readAsDataUrl` + `base64.decode()` to reliably read image bytes in Dart Web (avoids `ByteBuffer` cast issue)
- **21 new i18n strings** in `BuilderLocalizations`: form labels (description, thumbnail, difficulty, estimated hours, price tier, price), upload states (uploading, change, failed), and difficulty/price options (beginner/intermediate/advanced, free/premium)
- **`_ThumbnailModeChip`**: New animated toggle chip widget for "Upload Image" / "Enter URL" tab switching (150 ms transition)
- **`_UploadPreviewBox`**: New widget showing upload placeholder / spinner / image preview with "Change" overlay

### Changed
- **`_showCreateCourseDialog`** (`dashboard_screen.dart`): Expanded from single-field (title only) to full 480 px scrollable form — name (required), description, thumbnail (upload ↔ URL toggle), difficulty dropdown, estimated hours, price tier dropdown, and `AnimatedSize`-gated price input shown only when "Premium" is selected
- **`_showEditCourseDialog`** (replaces `_showRenameCourseDialog`): Same full form pre-populated from the existing course map; calls `updateCourseInfo()` on save
- **`_buildCourseCard` Edit button**: Now passes the full course map to `_showEditCourseDialog` instead of just the title
- **`SupabaseService.createCourseRow()`**: Extended to accept and write `description`, `thumbnailUrl`, `difficultyLevel`, `estimatedMinutes`, `priceTier`, `price`

### Fixed
- **`pickImageFileBytes` silent hang**: `readAsArrayBuffer` returns a JS `ArrayBuffer` / Dart `ByteBuffer`, not a `Uint8List`. The cast threw `TypeError` inside a stream listener, so the `Completer` never resolved and `await` hung indefinitely with no UI feedback. Fixed by switching to `readAsDataUrl` + `base64.decode()`
- **Silent upload failure**: `uploadCourseThumbnail` previously used `catch (_) { return null; }`, swallowing the actual Supabase error string. Now returns `(null, error.toString())` so the dialog can display an actionable message

---

## [Unreleased] - 2026-02-23 (Lesson Locks + Chapter Removal + Viewer Tab Stability)

### Summary
Refactored course structure to remove the `chapters` table and make `lessons` direct children of `courses` with lightweight group metadata. Added lesson-level lock fields and lock-aware Viewer flows, then fixed Library tab first-frame flicker by keeping tab pages alive instead of recreating them on each switch.

### Added
- **Migration: `20260223000002_lesson_unlock_fields.sql`**: Adds lesson-level lock model (`is_locked`, `unlock_type`, `prerequisite_lesson_id`, `paywall_product_id`) with consistency constraints and backfill from legacy chapter lock semantics
- **Migration: `20260223000003_remove_chapters_table.sql`**: Adds `lessons.course_id`, `group_title`, `group_sort_key`; backfills from `chapters`; rebuilds lesson/content_blocks RLS policies; updates `publish_course` to use `lessons.course_id`; drops `lessons.chapter_id` and `chapters` table
- **Viewer lock copy** (`Viewer/lib/l10n/app_localizations.dart`): Added localized lock labels/hints for prerequisite / paid unlock states

### Changed
- **Builder data access** (`Builder/lib/services/supabase_service.dart`):
  - `getCourseLessonTitles()` now queries `lessons` directly by `course_id`
  - Snapshot save/load/write now locate first lesson via `course_id + group_sort_key + sort_key` (no chapter lookup)
  - Initial lesson insert sets lock defaults (`is_locked=false`, `unlock_type='none'`)
- **Viewer course detail data source** (`Viewer/lib/services/supabase_service.dart`):
  - `getCourseDetail()` now fetches from `lessons` directly and derives UI grouping from `group_title/group_sort_key`
  - Returned shape remains chapter-like (`chapters: [...]`) for UI compatibility, but grouping is now virtual
- **Viewer lesson lock behavior**:
  - Home and Course screens now use lesson-level lock fields to decide available lessons and lock hints (`home_screen.dart`, `course_screen.dart`)
  - "Continue Learning" chooses the first incomplete and unlocked lesson

### Fixed
- **Viewer tab flicker on Library/Community/Profile navigation**:
  - `HomeScreen` switched from `switch`-based page recreation to `IndexedStack` to preserve tab states
  - `SearchScreen` now uses `AutomaticKeepAliveClientMixin` to avoid one-frame loading flash and state reset on tab switch

## [Unreleased] - 2026-02-23 (Multilingual Support: EN / ZH)

### Summary
Full English / Chinese language switching for both Builder and Viewer apps. Language defaults to the browser locale and is persisted in SharedPreferences. Viewer uses a custom `LanguageProvider` (Provider pattern); Builder uses a Riverpod `StateNotifierProvider`. The switch is accessible from the Profile section in both apps.

### Added
- **`Viewer/lib/l10n/app_localizations.dart`**: `AppLocalizations` class — complete EN/ZH string table for all Viewer screens (Home, Library, Community, Course, Lesson, Profile, bottom nav)
- **`Viewer/lib/providers/language_provider.dart`**: `LanguageProvider` (`ChangeNotifier`) — auto-detects browser locale (`platformDispatcher.locale`), falls back to English; persisted via `StorageService`
- **`Builder/lib/l10n/app_localizations.dart`**: `BuilderLocalizations` class — complete EN/ZH string table for Landing, Dashboard, Builder editor, and Profile Dialog
- **`Builder/lib/providers/language_provider.dart`**: Riverpod `StateNotifierProvider<LanguageNotifier, String>` + convenience `tProvider`; same browser-locale auto-detection logic

### Changed
- **`Viewer/lib/services/storage_service.dart`**: Added `saveLanguage(String)` / `getLanguage()` instance methods (key: `'language'`)
- **`Builder/lib/services/storage_service.dart`**: Added `saveLanguage(String)` / `getLanguage()` static methods (key: `'language'`)
- **`Viewer/lib/main.dart`**: Injected `LanguageProvider` into `MultiProvider`; `initialize()` called eagerly so browser locale is read before first frame
- **`Viewer/lib/screens/profile_screen.dart`**: Language tile in settings list → bottom-sheet picker with 🇺🇸 English / 🇨🇳 中文 options; all screen strings replaced with `t.xxx`
- **`Viewer/lib/components/common/bottom_nav_bar.dart`**: Nav labels (Home / Library / Community / Profile) now sourced from `AppLocalizations`
- **`Viewer/lib/screens/home_screen.dart`**, **`search_screen.dart`**, **`course_screen.dart`**, **`lesson_screen.dart`**, **`courses_screen.dart`**: All hardcoded UI strings replaced with `AppLocalizations` — uses pattern `final t = context.watch<LanguageProvider>().t;` in `build()`, threaded as parameter to sub-methods
- **`Builder/lib/widgets/profile_dialog.dart`**: Converted `StatefulWidget` → `ConsumerStatefulWidget`; Language row added (icon + current language label + chevron); picker bottom sheet with 🇺🇸/🇨🇳 options; all dialog strings translated
- **`Builder/lib/features/dashboard/dashboard_screen.dart`**: Converted to `ConsumerStatefulWidget`; sidebar nav labels, Course Data / Income / Comments card titles, sort dropdown items, Course Manage dialogs (Create, Edit, Delete), snackbar messages, and time-ago formatting all translated
- **`Builder/lib/features/landing/landing_screen.dart`**: Converted to `ConsumerStatefulWidget`; hero headline/subtitle/quote, feature cards, CTA band, sign-in modal (title, buttons, error messages) all translated; `_HeroCard` and `_SignInModal` parameterised with `BuilderLocalizations`
- **`Builder/lib/features/builder/builder_screen.dart`**: `t` passed through `_buildAppBar`; AppBar button labels (Preview / Import / Export / Save / Publish) translated; all action dialogs and snackbar messages (Export, Import, AI Generate, Save to Cloud, Publish, Draft Restored) translated

---

## [Unreleased] - 2026-02-18 (Viewer DB Integration)

### Summary
Full Viewer ↔ Supabase database integration: all four main screens (Home, Search, Course, Lesson) now load and write live data. Added auth guard for protected routes, Remember Me on login, logout confirmation dialog, Profile stat sync, two new migrations (lesson completion RPC + seed data), and eight new `SupabaseService` course/gamification methods.

### Added
- **`complete_lesson_and_award_xp` RPC** (`supabase/migrations/20260218000001_complete_lesson_rpc.sql`): Atomic PostgreSQL function — upserts `lesson_completions`, awards XP only on first completion via `xp_transactions` idempotency check, increments `user_stats`, updates daily activity log and streak. `SECURITY DEFINER`, uses `auth.uid()`
- **Seed data migration** (`supabase/migrations/20260218000002_seed_data.sql`): Idempotent (`ON CONFLICT DO NOTHING`) seed for local dev — 5 subjects (CS/Math/Science/Business/Social), 8 published courses with fixed UUIDs, 10 chapters, 19 lessons with full `content_json` arrays (info_card, multiple_choice, slider blocks), and 9 achievement definitions
- **`SupabaseService` course methods**: `getSubjects()`, `getCourses({subjectId, searchQuery})` (with `search_courses` RPC fallback), `getEnrollments()`, `getCourseDetail(courseId)` (course + sorted chapters + lessons + completions + enrollment row), `getLessonContent(lessonId)`, `enrollInCourse(courseId)`, `updateEnrollmentProgress({courseId, progressBp})`, `completeLessonAndAwardXp({lessonId, score, timeSpentSeconds})`
- **Auth guard** (`Viewer/lib/main.dart`): `_AuthGuard` widget wraps `/home`, `/course`, `/lesson` routes — shows spinner while `UserProvider` initialises, redirects to `/login` via `addPostFrameCallback` when unauthenticated
- **Remember Me** (`Viewer/lib/screens/login_screen.dart`, `storage_service.dart`): `StorageService.saveRememberMe()` / `getRememberMe()` / `getRememberedEmail()` persist the checkbox state and email to SharedPreferences; `initState` pre-fills the email field and checkbox on next launch
- **Logout confirmation dialog** (`Viewer/lib/screens/profile_screen.dart`): `_showLogoutDialog()` shows a custom `Dialog` with `StatefulBuilder` loading state, warning icon, cancel + red "Log Out" buttons; on confirm calls `userProvider.logout()` then `pushReplacementNamed('/login')`
- **`UserProvider.refreshStats()`**: Public wrapper for `_loadStatsFromBackend()` so screens can trigger an XP/stats refresh after lesson completion without accessing the private method

### Changed
- **HomeScreen** (`home_screen.dart`): Full rewrite as `StatefulWidget` — `_loadHomeData()` fetches active enrollment + `getCourseDetail()`, renders real course title, LESSON X/N counter, chapter completion dots, "Continue Learning" → first incomplete lesson, "Browse Courses" when no enrollment; XP counter reads `userProvider.totalXp`
- **SearchScreen** (`search_screen.dart`): Full rewrite — subjects loaded from DB for animated tab bar, courses loaded per subject or via search query, course cards tap to `CourseScreen` with real `courseId`
- **CourseScreen** (`course_screen.dart`): Converted from `StatelessWidget` to `StatefulWidget`; `_loadCourseData()` fetches chapters/lessons/completions from `getCourseDetail()`; chapter nodes show live completed/inProgress/available status; chapter bottom sheet lists real lessons with play/check icon, tapping any lesson navigates to `LessonScreen`; "Enroll in Course" button appears when user is not yet enrolled
- **LessonScreen** (`lesson_screen.dart`): `_initLesson()` fetches `content_json` from `getLessonContent()` and parses blocks (`info_card` → `QuestionType.info`, `multiple_choice` → `QuestionType.choice`, `slider` → `QuestionType.slider`); falls back to demo questions when `lessonId` is null/`'daily'` or fetch fails; on final slide: calls `completeLessonAndAwardXp` RPC, then `userProvider.refreshStats()` to sync XP counter; slider `defaultValue` is initialised per question on navigation
- **ProfileScreen** (`profile_screen.dart`): Stats row now reads `userProvider.totalXp` / `followingCount` / `followersCount` from backend-synced values; `bio` displayed when non-empty; logout button replaced with `_showLogoutDialog` call; `_formatStat()` helper formats numbers as 1,234 / 12K / 1.5M
- **UserProvider** (`user_provider.dart`): Added `_isInitialized` flag (set after full `initialize()` completes) and `isInitialized` getter for the auth guard; added `bio` field to `UserData`; `initialize()` triggers non-blocking `_loadStatsFromBackend()` + `_loadProfileFromBackend()` after local session restore; `login()` triggers the same background syncs; added `_followingCount` / `_followersCount` state and getters

---

## [Unreleased] - 2026-02-18

### Summary
Viewer post-login home page redesign — ported 5 Figma screens (Home, Library, Community, Profile, LevelMap) from React/TSX templates (`temple/`) to Flutter, with 4-tab bottom navigation and web-responsive layout.

### Added
- **LevelMapScreen** (`Viewer/lib/screens/level_map_screen.dart`): New vertical level progression screen with completed nodes (green checkmark), current active node (glowing card with "Start Coding" button and tooltip), locked nodes (gray lock), and left-right staggered offset layout; push-navigated from Home
- **Indigo color palette** (`Viewer/lib/theme/colors.dart`): `indigo` / `indigo50`–`indigo700`, `indigoGradient`, `profileBannerGradient` (indigo→purple→pink), `galaxyGradient` (dark slate→indigo space theme)
- **React/TSX design templates** (`temple/`): Figma-exported prototype with 6 screen components (HomeScreen, LibraryScreen, FriendsScreen, ProfileScreen, LevelMapScreen, ContentScreen), BottomNav, and Shadcn UI library — serves as the single source of truth for Viewer visual design

### Changed
- **BottomNavBar** (`bottom_nav_bar.dart`): Tabs renamed from Home/Search/Courses/Profile → **Home/Library/Community/Profile** with updated icons (`local_library`, `people`) and indigo highlight color replacing green
- **HomeScreen** (`home_screen.dart`): Complete rewrite — star counter header, centered "Data Structures" + "LEVEL 4" title, blue→indigo gradient logo block with Python-style geometric shapes, white bottom drawer panel with course list (completed/locked status dots) and indigo "Learning" button; tapping course area pushes to LevelMapScreen
- **SearchScreen → Library** (`search_screen.dart`): Complete rewrite — search bar + 5 horizontal category tabs (CS/Math/Science/Business/Social) with icon+label, animated indigo selection, horizontal recommended course carousel (book-cover cards with star badge + lesson count), "Popular Now" list items with icon + progress bar; data switches per category
- **CoursesScreen → Community** (`courses_screen.dart`): Complete rewrite — find/message dual-tab header with add-friend button, "find" view shows dark galaxy background with 27 floating animated planet nodes (color-coded by size, `AnimationController`-driven), "message" view shows search box + conversation list with avatar, name, last message, time, and unread red badge
- **ProfileScreen** (`profile_screen.dart`): Complete rewrite — indigo→purple→pink gradient banner with settings button, rotated square avatar (3° `Transform.rotate`) with green online indicator, username + @handle + joined year, 2×2 stats card (Courses/Total Stars/Following/Fans with colored icon backgrounds), Daily Exclusive Badge (purple→pink gradient card with streak count from `UserProvider`), 4-column achievements grid (bolt/shield/star/trending icons), settings list with theme picker and logout; retains existing `UserProvider` and `ThemeProvider` data bindings
- **Web responsive layout**: All 4 tab screens and LevelMapScreen wrapped in `Center > ConstrainedBox(maxWidth: 600)` for centered mobile-like presentation on wide browser windows
- **Code formatting**: `dart format` applied across all Viewer lib files

### Removed
- **`viewer_temple/`**: Deleted legacy HTML/CSS/JS login/register templates and associated image assets (replaced by Flutter screens in previous release and React templates in `temple/`)

---

## [Unreleased] - 2026-02-17

### Summary
Viewer Supabase auth integration, landing/login/register screen redesign, and social login support.

### Added
- **Viewer Supabase auth**: New `supabase_flutter` dependency and `SupabaseService` (auth-only, ported from Builder) with `signIn`, `signUp`, `signOut`, `resetPassword`, `signInWithGoogle`, `getProfile`, `updateProfile`, and `_translateAuthError`
- **Viewer `main.dart` Supabase init**: `Supabase.initialize()` with `String.fromEnvironment` for URL/anonKey (same pattern as Builder)
- **Viewer landing screen**: New `LandingScreen` as initial route with "Get Start" entry point
- **Viewer register screen**: New `RegisterScreen` with email/password registration, confirm password, terms checkbox, social login grid, and Supabase backend wiring
- **Viewer login screen redesign**: Full visual overhaul with split-panel layout (image + form), CSS-matched color constants, Google OAuth button, "Forgot password?" dialog that sends reset email via Supabase
- **Viewer visual assets**: `login.jpg`, `register.jpg`, `logo_with_bg.png`, `google.png`, `wechat.png`, `ins.png`, `whatsapp.png`

### Changed
- **`UserProvider.login()`**: Replaced `Future.delayed` mock with `SupabaseService.signIn()`, constructs `UserData` from Supabase user metadata
- **`UserProvider.register()`**: Replaced mock with `SupabaseService.signUp()`, handles email confirmation required case
- **`UserProvider.logout()`**: Now calls `SupabaseService.signOut()` before clearing local storage
- **`UserProvider.initialize()`**: Restores session from `SupabaseService.currentUser` instead of only reading local cache; clears stale local data when no Supabase session exists
- **`UserProvider` new APIs**: Added `errorMessage` getter and `resetPassword()` method
- **Login/Register error display**: Error messages now come from Supabase `AuthResult.message` (translated) instead of generic "Unable to login"
- **Viewer routing**: Initial route changed from `AppEntryPoint` (auto-HomeScreen) to `LandingScreen`; added `/register` route

---

## [Unreleased] - 2026-02-14

### Summary
Phone-mockup Viewer/interactive blocks, schema migration + validation hardening, AI one-page generation diagnostics, Animation block MVP, and Code Playground runtime fixes.

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
- **AI prompt versioning + diagnostics**: Added `promptVersion` metadata and per-request diagnostics (prompt fingerprint/source, model, stage, latencies, parse result, validation pass/fail) in generation results and developer logs
- **Code playground regression tests**: Added `test/code_runner_test.dart` to cover expression output, assignment/arithmetic behavior, no-output behavior, and explicit runtime errors for unsupported functions
- **AI diagnostics regression tests**: Added `test/ai_generation_diagnostics_test.dart` for prompt-version attribution and custom/default prompt source tracking
- **Animation block MVP**: Added new `animation` block type with presets (`bouncing-dot`, `pulse-bars`) and basic parameters (`durationMs`, `loop`, `speed`) including Builder property editing + lightweight Builder/Viewer preview rendering

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
- **AI generation quality gate**: Generated courses now run through centralized schema validation after parsing/normalization; blocking errors fail at the validation stage with explicit diagnostics
- **Schema + migration compatibility for animation**: Validator and legacy migrator now recognize/normalize `animation` content so import/export validation and compatibility flow remain consistent

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
