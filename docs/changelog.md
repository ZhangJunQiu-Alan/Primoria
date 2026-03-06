# Changelog

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
