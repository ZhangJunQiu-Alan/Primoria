# TODO

Last updated: 2026-03-08

## 1. High Priority

1. [ ] Replace dashboard fallback analytics with real event-level facts (views, learner growth, completion timeline).
2. [ ] Add backend APIs for Fans actions: reply, mark important, bulk notification, export.
3. [ ] Implement real revenue/settlement data source for dashboard income cards.
4. [ ] Add integration tests for publish -> viewer consistency path.

## 2. Medium Priority

1. [ ] Improve Course Manage sort modes (`student` / `comments`) with real metrics.
2. [ ] Add block-level autosave conflict strategy for future multi-user collaboration.
3. [ ] Expand Viewer offline/cache support for lesson playback.
4. [ ] Add observability dashboard for AI generation success/failure metrics.
5. [ ] Expose backend counters for challenge achievements (`perfect_*`, `speed_lesson`, `daily_tasks_30`) to replace temporary progress fallbacks.
6. [ ] Connect Settings Center support entries/privacy toggles to real backend policies and live URLs.

## 3. Low Priority

1. [ ] Introduce creator notification center in dashboard shell.
2. [ ] Add advanced learner segmentation and cohort analysis.
3. [ ] Add private messaging system between creators and learners.

## 4. Recently Completed

1. [x] Dashboard redesign completed for Home/Course Manage/Data Center/Fans Management (responsive + modular tabs/widgets/providers).
2. [x] Builder inline editing on canvas for Text/Code Block/Code Playground.
3. [x] Visibility default normalization (`always` for first block, `afterPreviousCorrect` for others).
4. [x] Viewer lesson-title and markdown rendering fixes.
5. [x] Logo navigation consistency to dashboard entry points.
6. [x] Added widget tests for redesigned Course Manage states and core callbacks.
7. [x] Centralized Viewer page width strategy with shared layout primitives and responsive tests.
8. [x] Refreshed Viewer profile gamification UX (menu-first settings entry, pinned badge strip, pending-achievement progress cards).
9. [x] Redesigned Achievement Wall with badge images, progress display, derived unlock sync, and load/empty state handling.
10. [x] Added centralized `AchievementDisplayService` and achievement badge asset bundle for consistent profile/wall rendering.
11. [x] Rebuilt Viewer Settings into a multi-category settings center with section-switch panel navigation, persisted preferences, and integrated parent mode/support sections.
12. [x] Added Builder Settings Center with category-based active-panel UX, integrated dashboard/avatar entry, and local persistence for workflow/AI/notifications/publishing/privacy preferences.
13. [x] Fixed Viewer auth/community/home regressions: login overflow, social icon correctness/contrast, right-edge scrollbar alignment, homepage daily-task removal, and library duplicate selected subject chip cleanup.
14. [x] Completed core Viewer bilingual adaptation (ZH/EN) across authenticated user flows (login/register/home/library/community/lesson/result/AI tutor/profile settings) with settings-driven language switching.
15. [x] Completed full Builder bilingual adaptation (ZH/EN) across auth, dashboard, builder canvas, viewer preview, and interactive block widgets with settings-driven language switching.
16. [x] Added Viewer landing-page bilingual adaptation to keep public-entry copy fully language-consistent.
