# Changelog

## [Unreleased] - 2026-03-06 (Builder Settings Center Redesign)

### Summary
- Added a dedicated Builder Settings Center with category-based panel switching (single-section rendering).
- Replaced legacy profile dialog entry with the new settings center entry from dashboard/avatar flows.
- Wired real persistence for creator preferences (workflow, AI, notifications, publishing, privacy) via local storage.

### Added
- `Builder/lib/widgets/builder_settings_dialog.dart`
  - 9 settings categories:
    - Account & Brand
    - Creator Workflow
    - AI Studio
    - Notifications
    - Publishing & SEO
    - Integrations & API
    - Security & Access
    - Billing & Plans
    - Data Controls
  - Section switch navigation (left vertical on desktop / top horizontal on compact widths)
  - Account profile save, language switch, preference save, draft cleanup, sign-out entry
- Expanded Builder `StorageService` settings APIs:
  - default difficulty / price tier
  - publish checklist / confirm gate
  - AI quality/quiz/schema toggles
  - email/comment/fan/weekly digest toggles
  - webhook/custom domain
  - public profile / usage telemetry
  - clear all local course drafts

### Changed
- `Builder/lib/features/dashboard/dashboard_screen.dart`
  - `showProfile` now opens `BuilderSettingsDialog` for authenticated users.
- `Builder/lib/widgets/user_avatar.dart`
  - profile action now opens `BuilderSettingsDialog`
  - fixed popup action `switch` branch fallthrough with explicit `break`
- `Builder/lib/widgets/builder_settings_dialog.dart`
  - fixed wide-layout vertical alignment (`Row` start alignment) to avoid apparent top blank area
  - section content scroll view keyed per active section for stable panel switching

### Validation
- `cd Builder && flutter analyze lib/widgets/builder_settings_dialog.dart`
- `cd Builder && flutter analyze`

---

## [Unreleased] - 2026-03-06 (Viewer Settings Center Redesign)

### Summary
- Rebuilt Viewer settings into a multi-category settings center with section-switch navigation.
- Added local-persisted controls for appearance, learning preferences, notifications, and privacy.
- Preserved and integrated existing profile edit + parent mode flows into the new IA.

### Added
- Settings categories:
  - Account & Profile
  - Appearance & Language
  - Learning Preferences
  - Notifications & Reminders
  - Privacy & Data
  - Parent Mode
  - Support & About
- New persisted settings keys in `StorageService` for:
  - haptics, reminder schedule, streak/achievement alerts
  - autoplay/hints/daily-goal
  - privacy/network preference toggles
- New localization strings in `Viewer/lib/l10n/app_localizations.dart` for full settings-center UX.

### Changed
- `Viewer/lib/screens/profile_settings_screen.dart`
  - redesigned to a left-menu / right-panel settings center
  - menu selections now switch the active settings panel (single-section rendering)
  - retained avatar/cover upload, profile save, parent role switching and binding code flow
  - added sign-out and support/action entries (placeholder hooks for later integration)
- `Viewer/lib/services/audio_service.dart`
  - added haptics enable/disable support
- `Viewer/lib/main.dart`
  - now initializes audio sound/haptics from persisted settings

### Validation
- `cd Viewer && flutter analyze lib/screens/profile_settings_screen.dart lib/services/storage_service.dart lib/services/audio_service.dart lib/main.dart lib/l10n/app_localizations.dart`
- `cd Viewer && flutter test test/viewer_layout_metrics_test.dart test/viewer_page_shell_test.dart`

---

## [Unreleased] - 2026-03-06 (Viewer Profile & Achievement UX Refresh)

### Summary
- Refreshed Viewer profile gamification UX with progress-first achievement surfaces.
- Introduced centralized achievement display logic for badge assets and progress derivation.
- Tightened desktop content density with a 60% width strategy on key Viewer surfaces.

### Added
- `Viewer/lib/services/achievement_display_service.dart`
- `Viewer/assets/achievements/*` (badge/category artwork set)

### Changed
- `Viewer/lib/screens/profile_screen.dart`
  - replaced quick-action row with menu-first settings entry + pinned badge strip
  - upgraded "My Achievements" to pending-progress cards (top unlock candidates)
  - made XP heatmap adaptive to card width with horizontal fallback scrolling
- `Viewer/lib/screens/achievement_wall_screen.dart`
  - computes effective unlock state from user stats + follow counts
  - syncs derived unlocks back to backend status
  - adds load-error/empty handling and redesigns cards with badge/progress/chips
- `Viewer/lib/components/common/viewer_page_shell.dart`
- `Viewer/lib/screens/courses_screen.dart`
  - migrated to shared `ViewerPageShell` and aligned desktop width behavior
- `Viewer/pubspec.yaml`
  - registered `assets/achievements/`
- `Viewer/test/viewer_layout_metrics_test.dart`
- `Viewer/test/viewer_page_shell_test.dart`
  - updated expected layout widths for ratio-based desktop constraints

### Validation
- `cd Viewer && flutter analyze lib/components/common/viewer_page_shell.dart lib/services/achievement_display_service.dart lib/screens/profile_screen.dart lib/screens/achievement_wall_screen.dart lib/screens/courses_screen.dart test/viewer_layout_metrics_test.dart test/viewer_page_shell_test.dart`
- `cd Viewer && flutter test test/viewer_layout_metrics_test.dart test/viewer_page_shell_test.dart`

---

## [Unreleased] - 2026-03-06 (Viewer Layout Width Optimization)

### Summary
- Optimized Viewer content width strategy for Home, Library, Community, and Profile.
- Introduced centralized responsive layout primitives to reduce per-page width hacks.
- Improved desktop/web information density while preserving tablet/mobile readability.

### Added
- `Viewer/lib/components/common/viewer_page_shell.dart`
- `Viewer/lib/components/common/viewer_section_header.dart`
- `Viewer/lib/components/common/viewer_surface_card.dart`
- `Viewer/test/viewer_layout_metrics_test.dart`
- `Viewer/test/viewer_page_shell_test.dart`

### Changed
- `Viewer/lib/screens/home_screen.dart`
- `Viewer/lib/screens/search_screen.dart`
- `Viewer/lib/screens/courses_screen.dart`
- `Viewer/lib/screens/profile_screen.dart`
  - migrated to shared `ViewerPageShell` width presets
  - standardized section header/surface card usage in key layout blocks
  - widened central content area on desktop with adaptive constraints

### Validation
- `cd Viewer && flutter analyze lib/components/common/viewer_page_shell.dart lib/components/common/viewer_section_header.dart lib/components/common/viewer_surface_card.dart lib/screens/home_screen.dart lib/screens/search_screen.dart lib/screens/courses_screen.dart lib/screens/profile_screen.dart test/viewer_layout_metrics_test.dart test/viewer_page_shell_test.dart`
- `cd Viewer && flutter test test/viewer_layout_metrics_test.dart test/viewer_page_shell_test.dart`

---

## [Unreleased] - 2026-03-06 (Course Manage Workspace Redesign)

### Summary
- Redesigned Builder Dashboard > Course Manage into a dedicated creator workspace tab.
- Preserved all critical production flows (create/edit/delete/open course, add/delete lesson, guards/dialogs/snackbars).
- Improved state coverage and reliability for lesson lazy-loading.

### Added
- `Builder/lib/features/dashboard/tabs/course_manage_tab.dart`
- `Builder/test/dashboard_course_manage_tab_test.dart`
- Course Manage localization strings in `Builder/lib/l10n/app_localizations.dart`

### Changed
- `Builder/lib/features/dashboard/dashboard_screen.dart`
  - moved Course Manage rendering into tab module
  - added error state handling for course loading
  - added in-flight lesson-request deduping
  - centralized builder route helpers for course/lesson/add-lesson entry
- Upgraded Course Manage UX:
  - header action area
  - summary strip
  - search/filter/sort controls
  - richer course/lesson card hierarchy
  - loading/empty/no-results/error states

### Validation
- `cd Builder && flutter analyze lib/features/dashboard/dashboard_screen.dart lib/features/dashboard/tabs/course_manage_tab.dart lib/l10n/app_localizations.dart test/dashboard_course_manage_tab_test.dart`
- `cd Builder && flutter test test/dashboard_course_manage_tab_test.dart`

---

## [Unreleased] - 2026-03-06 (Docs Full Refresh)

### Summary
- Refreshed all files in `docs/` to match current implementation state.
- Removed outdated placeholders and stale schema references.
- Synchronized README/PRD/schema/guides/checklists/todo with current Builder + Viewer behavior.

---

## [Unreleased] - 2026-03-06 (Dashboard Redesign)

### Summary
- Phase 1 redesigned Dashboard Home, Data Center, and Fans Management tabs.
- Course Manage redesign was delivered in a follow-up change (see latest entry).
- Introduced modular dashboard architecture with `tabs/`, `providers/`, `widgets/`.

### Added
- `Builder/lib/features/dashboard/dashboard_localizations.dart`
- `Builder/lib/features/dashboard/tabs/*`
- `Builder/lib/features/dashboard/providers/*`
- `Builder/lib/features/dashboard/widgets/*`
- `fl_chart` dependency in Builder

### Changed
- `dashboard_screen.dart` now routes Home/Data/Fans to redesigned tab implementations.
- Responsive layouts for desktop/tablet/mobile across redesigned tabs.

### Notes
- Some analytics/income/fans actions are still fallback/UI-reserved until backend tables/endpoints are added.

---

## [Unreleased] - 2026-03-06 (Builder + Viewer Consistency Fixes)

### Summary
- Fixed lesson-title ownership and publish consistency.
- Added inline editing for Text/Code Block/Code Playground on canvas.
- Improved Viewer lesson rendering and markdown support.

### Key Updates
- Visibility rule normalization: first block defaults `always`, others `afterPreviousCorrect`.
- Builder app-bar lesson-title editing corrected.
- Publish write-back keeps first lesson title from snapshot.
- Viewer fallback loading improved for sparse lesson snapshots.

---

## [Unreleased] - 2026-03-05 (AI & Reliability)

### Summary
- Moved agentic AI generation pipeline to local client-side orchestration.
- Added secure `get-gemini-key` edge function.
- Hardened generation retries and fallback handling.

---

## [Unreleased] - 2026-03-04 (New Block Types + Schema Evolution)

### Summary
- Added `function-flow` and `code-execution` block support end-to-end.
- Added schema migrator/validator support and tests.
- Added add-lesson workflow and dashboard lesson delete capability.

---

## [Archive Notice]

Detailed historical change narratives before 2026-03-04 should be read from git history and commit messages.
