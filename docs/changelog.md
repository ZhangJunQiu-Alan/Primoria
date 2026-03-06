# Changelog

## [Unreleased] - 2026-03-06 (Docs Full Refresh)

### Summary
- Refreshed all files in `docs/` to match current implementation state.
- Removed outdated placeholders and stale schema references.
- Synchronized README/PRD/schema/guides/checklists/todo with current Builder + Viewer behavior.

---

## [Unreleased] - 2026-03-06 (Dashboard Redesign)

### Summary
- Redesigned Dashboard Home, Data Center, and Fans Management tabs.
- Kept Course Manage behavior unchanged.
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
