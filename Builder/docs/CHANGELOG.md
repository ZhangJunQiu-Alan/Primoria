# Changelog

## [Unreleased] - 2026-02-10

### Summary
Dashboard Course Manage implementation, auth-protected routing, shared UserAvatar component, and Builder courseId loading support.

### Added

#### Dashboard — Course Manage (`features/dashboard/dashboard_screen.dart`)
- **Real Supabase data**: Course Manage tab now fetches user's courses via `getMyCourses()` with loading spinner, sign-in prompt (if not logged in), and empty state
- **Sort dropdown**: `PopupMenuButton` with 3 options — Sort By time, Sort By student, Sort By comments
- **Course cards**: Title, relative time ("Updated 2 days ago"), "Learned X times", status badge (Draft/Published)
- **Edit button**: Navigates to `/builder?courseId=<id>` to load course in editor
- **Delete button**: Confirmation dialog → Supabase `deleteCourse()` → refresh list
- **Lesson boxes**: Async-loaded from course content (pages), displayed as "Lesson 1", "Lesson 2"… with gradient backgrounds
- **Add lesson box**: Dashed border box → navigates to Builder with courseId
- **Create Course button**: Top-right, navigates to `/builder`

#### User Avatar (`widgets/user_avatar.dart`) — NEW FILE
- Reusable circular avatar component used in both Dashboard and Builder
- Listens to `authStateChanges` stream for real-time auth state updates
- Logged in: Shows profile photo from OAuth `user_metadata` (`avatar_url` / `picture`) or initials fallback (white on blue circle)
- Not logged in: Shows person icon on light blue circle; tap opens auth dialog
- Popup menu: email display, Profile (edit dialog), Dashboard (go_router navigate), Sign out
- Blue accent color scheme (#4D7CFF) for visibility on white backgrounds

#### Auth-Protected Routing (`app/router.dart`)
- `refreshListenable` tied to Supabase auth state stream
- Redirect guard: `/dashboard` and `/builder` require login → redirect to `/`
- Auto-redirect: logged-in users on `/` → `/dashboard`
- `_GoRouterRefreshStream` helper class for GoRouter + Stream integration

#### Builder Course Loading (`features/builder/builder_screen.dart`)
- Changed from `ConsumerWidget` to `ConsumerStatefulWidget`
- Accepts optional `courseId` query parameter
- Auto-loads course content from Supabase when navigated with courseId (from Course Manage → Edit)
- Route: `/builder?courseId=xxx`

### Changed

#### Dashboard Home Page — Layout Fix
- Replaced `IntrinsicHeight` + `GridView.count` with `Row` + `Wrap` — fixes blank content area caused by GridView not reporting intrinsic height
- `_MetricTile` (110×90) and `_CommentBlock` (160×100) now have explicit dimensions for Wrap layout

#### Builder Screen
- Removed 150+ lines of old `_buildUserAvatar`, `_showAuthDialog`, `_showProfileDialog`, `_logout`, `_showMyCourses` methods
- Replaced with shared `UserAvatar` widget (36px)

#### Dashboard Screen
- Profile text button replaced with `UserAvatar` circle in both Home Page and Course Manage topbars

### Technical Notes
- `flutter analyze`: 8 issues (all pre-existing — deprecated `withOpacity`, unused fields)
- No new warnings or errors introduced

---

## [Unreleased] - 2026-02-09

### Summary
Major UI redesign of Builder, new Landing page and Dashboard, sign-in modal with Supabase auth integration, and project-level CLAUDE.md setup.

### Added

#### Landing Page (`features/landing/landing_screen.dart`)
- New app entry point at `/` route — header with logo, hero section, feature cards, CTA band, animated blur blobs
- "Apply Now" button (no navigation) and "Already Qualified" button (opens sign-in modal)
- Sign-in modal (`_SignInModal`) matching `Design/signin_design.png`:
  - Google / Apple / email+password sign-in options
  - Expandable email+password form with validation
  - Supabase backend integration — checks credentials, friendly error on unknown account ("We couldn't find an account with that email…")
  - Navigates to `/dashboard` on successful login

#### Dashboard (`features/dashboard/dashboard_screen.dart`)
- New `/dashboard` route with sidebar navigation
- Home Page tab: Course Data (blue gradient), Income overview (yellow gradient), Comments (green gradient)
- Course Manage tab: course cards with lesson boxes, Edit/Delete actions, Profile/Sort/Create buttons
- Responsive layout: sidebar collapses to drawer overlay on screens < 1024px
- Based on `Builder_temple/dashboard.html` and `Builder_temple/course-manage.html` templates

#### Project Configuration
- Created `CLAUDE.md` at project root with build commands, architecture overview, and key patterns

### Changed

#### Builder UI Redesign
- **`builder_layout.dart`** — Panels now render as rounded cards with `borderRadius`, `boxShadow`, margin, and `Clip.antiAlias`; background uses `AppColors.background`
- **`builder_screen.dart`** — AppBar buttons restyled as pill-shaped `OutlinedButton`s; AI button with `Icons.auto_awesome` and accent orange; Publish as green filled pill; Profile as pill-outlined `PopupMenuButton`; replaced placeholder logo with `Image.asset('assets/images/logo.png')`
- **`module_panel.dart`** — Converted to `StatefulWidget` with search `TextField` and 3 expandable category sections (General, Physical, Chemical) with colored backgrounds
- **`builder_canvas.dart`** — Simplified empty state to centered "Drag Blocks Here" text
- **`property_panel.dart`** — Empty state now shows metadata rows (Block, Type, Status, Last update) instead of icon+text
- **`app/router.dart`** — Added `/dashboard` route; `initialLocation` set to `/`

#### Auth Backend Integration
- **`supabase_service.dart`** — Added `isEmailRegistered()` method; `signIn()` now flags `isUserNotFound` on invalid credentials; `AuthResult` gained `isUserNotFound` field

### Removed
- Removed `bottomNavigationBar` (pages bar) from Builder screen
- Removed dead code: `_buildPageBar`, `_editPageTitle`, `_showPageMenu`, `_confirmDeletePage`

### Assets
- Copied `img/logo32.png` → `Builder/assets/images/logo.png`
- Updated `pubspec.yaml` with `assets/images/` entry

### Technical Notes
- `flutter analyze`: 8 issues (all pre-existing — deprecated `withOpacity`, unused fields in storage_service/ai_generate_dialog)
- `flutter build web`: passes successfully
- UI localization switched from Chinese to English across all new screens

---

## [Unreleased] - 2026-01-31

### Summary
Major update including UI localization to Chinese, theme system refactoring, AI course generation integration, Supabase backend setup, and platform compatibility fixes.

### Added

#### New Services
- **AI Course Generator** (`ai_course_generator.dart`)
  - Integration with Gemini API for PDF-to-course generation
  - Automatic JSON parsing and course structure validation
  - Custom prompt support for course generation

- **Course Import** (`course_import.dart`)
  - JSON file import functionality
  - Course validation and error handling

- **File Picker** (`file_picker.dart`, `file_picker_stub.dart`, `file_picker_web.dart`)
  - Cross-platform file selection using conditional imports
  - Fixes `dart:html` unavailability in VM test environment
  - Stub implementation for non-web platforms

- **Supabase Service** (`supabase_service.dart`)
  - Backend integration for user authentication
  - Cloud storage preparation

#### New UI Components
- **AI Generate Dialog** (`ai_generate_dialog.dart`)
  - PDF upload interface for AI course generation
  - Progress indication and error handling

- **Auth Dialog** (`auth_dialog.dart`)
  - User authentication UI

- **Profile Dialog** (`profile_dialog.dart`)
  - User profile management

#### Testing
- **Model Tests** (`test/models_test.dart`)
  - 26 unit tests covering Block, CoursePage, Course models
  - Content type serialization tests
  - ID generator tests

#### Documentation
- Added `docs/` directory with:
  - `MVP_TEST_CHECKLIST.md` - Testing checklist
  - `course-json-guide.md` - Course JSON format guide
- Added `Builder/examples/` for sample courses
- Added `Builder/tools/` for development utilities

#### Backend
- Added `supabase/` directory with database configuration

### Changed

#### UI Localization (Chinese)
- Translated all user-facing strings to Chinese across:
  - `builder_screen.dart` - Main builder interface
  - `viewer_screen.dart` - Course preview
  - `property_panel.dart` - Block property editor
  - `module_panel.dart` - Module selection panel
  - `block_wrapper.dart` - Block controls
  - `code_playground_widget.dart` - Code editor

#### Theme System Refactoring
- **Design Tokens** (`design_tokens.dart`)
  - Reorganized spacing, typography, and color tokens
  - Added semantic color definitions

- **Theme** (`theme.dart`)
  - Extended theme with comprehensive component styling
  - Added dark mode support preparation

#### Builder Enhancements
- **Builder Screen** (`builder_screen.dart`)
  - Added toolbar with file operations (New, Import, Export)
  - Added AI generation button
  - Added user authentication UI
  - Improved block management controls

#### Models
- Updated `block.dart`, `block_type.dart`, `course.dart`, `page.dart`
  - Minor improvements to serialization
  - Added helper methods

### Fixed
- **Platform Compatibility**
  - Fixed `dart:html` not available in VM test environment
  - Implemented conditional imports for web-only code
  - Tests now compile and run on all platforms

### Removed
- Removed root-level documentation files (moved to `docs/`):
  - `README.md`
  - `STEM-Course-Builder-PRD.md`
  - `todolist.md`

### Technical Notes
- `flutter analyze`: 10 issues (down from 13)
  - 6 info: dangling library doc comments (pre-existing)
  - 2 info: dart:html deprecation in web files (expected)
  - 2 warning: unused fields (pre-existing)
- `flutter test`: 26/27 tests pass
  - `models_test.dart`: All 26 tests pass
  - `widget_test.dart`: Fails due to Supabase configuration (pre-existing issue)
