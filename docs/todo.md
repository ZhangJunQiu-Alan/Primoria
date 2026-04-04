# TODO

Last updated: 2026-04-04 (rev 10)

## 1. High Priority

1. [x] ~~Fix legacy course publish blocked by schema validator~~ — resolved: migrator now handles all legacy field names (dual-key fromJson, snake_case rename steps); `publish_course` RPC v2 no longer depends on deleted `chapters` table.
2. [ ] Add backend APIs for Fans actions: reply, mark important, bulk notification, export.
3. [ ] Implement real revenue/settlement data source for dashboard income cards.

## 2. Medium Priority

1. [ ] If multi-user collaboration is introduced later, design explicit draft-conflict handling.
2. [ ] Expand Viewer offline/cache support for lesson playback.
3. [ ] Add observability dashboard for AI generation success/failure metrics.
4. [ ] Expose backend counters for challenge achievements (`perfect_*`, `speed_lesson`, `daily_tasks_30`) to replace temporary progress fallbacks.
5. [ ] Connect Settings Center support entries/privacy toggles to real backend policies and live URLs.

## 3. Low Priority

1. [ ] Introduce creator notification center in dashboard shell.
2. [ ] Add advanced learner segmentation and cohort analysis.
3. [ ] Add private messaging system between creators and learners.

## 4. Recently Completed

1. [x] Replaced dashboard fallback analytics with real Supabase event-level facts for views, learner growth, completion timelines, and published-course rankings.
2. [x] Added real `student` / `comments` sort modes in Course Management, including visible metric chips on course cards.
3. [x] Fixed `gemini-generate` Edge Function so fenced HTML/code-wrapper responses are normalized before returning animation HTML.
4. [x] Added real Supabase cloud smoke coverage for Builder publish -> Viewer lesson-title consistency, using a dedicated smoke author account and reusable smoke course.
5. [x] Dashboard redesign completed for Home/Course Manage/Data Center/Fans Management (responsive + modular tabs/widgets/providers).
6. [x] Builder inline editing on canvas for Text/Code Block/Code Playground.
7. [x] Visibility default normalization (`always` for first block, `afterPreviousCorrect` for others).
8. [x] Viewer lesson-title and markdown rendering fixes.
9. [x] Logo navigation consistency to dashboard entry points.
10. [x] Added widget tests for redesigned Course Manage states and core callbacks.
11. [x] Centralized Viewer page width strategy with shared layout primitives and responsive tests.
12. [x] Refreshed Viewer profile gamification UX (menu-first settings entry, pinned badge strip, pending-achievement progress cards).
13. [x] Redesigned Achievement Wall with badge images, progress display, derived unlock sync, and load/empty state handling.
14. [x] Added centralized `AchievementDisplayService` and achievement badge asset bundle for consistent profile/wall rendering.
15. [x] Rebuilt Viewer Settings into a multi-category settings center with section-switch panel navigation, persisted preferences, and integrated parent mode/support sections.
16. [x] Added Builder Settings Center with category-based active-panel UX, integrated dashboard/avatar entry, and local persistence for workflow/AI/notifications/publishing/privacy preferences.
17. [x] Fixed Viewer auth/community/home regressions: login overflow, social icon correctness/contrast, right-edge scrollbar alignment, homepage daily-task removal, and library duplicate selected subject chip cleanup.
18. [x] Completed core Viewer bilingual adaptation (ZH/EN) across authenticated user flows (login/register/home/library/community/lesson/result/AI tutor/profile settings) with settings-driven language switching.
19. [x] Completed full Builder bilingual adaptation (ZH/EN) across auth, dashboard, builder canvas, viewer preview, and interactive block widgets with settings-driven language switching.
20. [x] Added Viewer landing-page bilingual adaptation to keep public-entry copy fully language-consistent.
21. [x] Redesigned Viewer landing page (learner-focused, 11 sections, floating hero mockup, responsive 980px breakpoint, removed all Builder references).
22. [x] Redesigned Viewer login screen (two-panel desktop layout, social OAuth: Google/Apple/WeChat, animated inputs, dark-mode fix, brand-asset logos).
23. [x] Redesigned Viewer register screen (mirrored layout, username field, password strength bar, animated terms checkbox, stats row in brand panel).
24. [x] Migrated GitHub Pages from hackathon/ to Viewer app; removed hackathon/ project from repo; preserved primoria.dpdns.org via CNAME.
25. [x] Replaced Markdown editor with WYSIWYG rich-text toolbar (flutter_quill): Bold, Italic, Underline, Strikethrough, Text Color, Highlight, Alignment (L/C/R), Heading dropdown (H1/H2/H3/Normal), Bullet list, Ordered list. Removed Markdown support entirely.
26. [x] Fixed focus-loss-after-2-chars bug in text editor (persistent FocusNode + ScrollController).
27. [x] Builder UI polish: removed "Rich text / Markdown" subtitle, replaced "Large" font-size dropdown with alignment buttons, removed drag handles from block library items, differentiated category header cards from individual block rows.
28. [x] Introduced Page concept in Builder: lessons now hold ≥1 pages; each page holds blocks. Added page navigation strip (pill tabs, + New Page button, × delete) to canvas. Removed legacy "课时画布" header.
29. [x] Added per-page navigation in Viewer preview: animated progress dots, Prev/Check/Next buttons, "已完成" state on last page. Per-page answer state reset on page change.
30. [x] Updated AI generation system to be page-aware: prompts output pages[], normalization distributes blocks intelligently. Added function-flow support. Changed text format to richtext. Bumped prompt to v2.
31. [x] Fixed AI generation empty canvas bug: normalized JSON now carries `schemaVersion` so the schema migrator skips legacy migration and preserves inner `pages` structure.
32. [x] AI prompt v3/v4: visual-first strategy (animation opener mandatory), 1-sentence text limit, markdown banned, image blocks replaced by animation+aiPrompt, `aiPrompt` preserved in normalizer, markdown-to-Quill-Delta conversion (`_ensureQuillDelta`).
33. [x] Rebuilt Builder page navigation strip: compact numbered chips with scroll arrows, active chip auto-scroll, "+ 新建页" always visible.
34. [x] Fixed property inspector blank on pages 2+: block search now covers all pages; `updateBlock` passes correct `pageIndex`.
35. [x] Builder block library UI: removed category description subtitles and "N 个模块" count labels.
36. [x] Updated Gemini model to `gemini-3.1-pro-preview`; AI text blocks now convert Markdown → Quill Delta at generation time.
37. [x] Code Execution block UI: removed timeline/scrubbar and step-duration slider; variables + stdout now side-by-side; 4 control buttons span full row width.
38. [x] Architecture alignment (Builder + Viewer + Supabase): per-lesson `content_json` storage in Builder; Viewer reads `pages[]` format; removed `lesson.blocks` legacy getter; schema validator hardens `blocks[]` to import-only warning.
39. [x] Unified interactive-visual block: new `BlockType.interactiveVisual` + `InteractiveVisualContent` (VisualSimSpec), 4 templates (ideal-gas-piston, sorting-bars, variable-binding-memory, function-plot), shared Flutter runtime widget, spec-driven AI generator, staged Builder UX, Viewer real rendering, legacy animation migration.
40. [x] Interactive Visual platform AI key: removed user API key input; added Supabase Edge Function `gemini-generate` as server-side Gemini proxy; platform `GEMINI_API_KEY` stored as Deno env secret.
41. [x] Interactive Visual style picker: 6 mandatory styles (Watercolor/Papercraft/Anime/Whiteboard/Retro Print/Heritage) injected into Gemini prompt; Generate button gated on style selection; removed all built-in Flutter scene templates.
42. [x] Builder↔Viewer JSON snake_case alignment: `schema_version`, `course_id`, `lesson_id`, `page_id`, `difficulty_level`, `estimated_minutes` unified across `toJson()`/`fromJson()`/migrator/validator; dual-key backward compat for all reads.
43. [x] Viewer auth resilience: `_withAuthTimeout<T>()` (30 s) + 3-attempt exponential backoff (900 ms/1 800 ms/2 500 ms) on all auth methods in Viewer `SupabaseService`.
44. [x] Viewer graph-mode matching: `matching` blocks with `nodes`+`edges` converted to label pairs, rendered via existing list-matching UI.
45. [x] Viewer `visibility_rule: 'afterPreviousCorrect'` gating: skips blocks in `_nextQuestion()` when last answer was wrong; `_lastAnsweredCorrectly` state tracked.
46. [x] Viewer multi-select questions: `QuestionType.multiChoice` with checkbox UI, `correctIndices: Set<int>`, exact full-set validation for `multi_select: true` blocks.
47. [x] Viewer video block: `VideoEmbedWidget` (HtmlElementView web / placeholder non-web); `_toEmbedUrl()` handles YouTube, Vimeo, and direct URLs; `QuestionType.video` in lesson flow.
48. [x] Fixed `Block.toJson()` double snake_case conversion for `InteractiveVisualContent`; `_parseCodeExecution` dual-key reads `source_code`/`sourceCode`/`code`.
49. [x] Supabase `publish_course` RPC v2: removed `chapters` table join and content overwrite; RPC now only flips course status.
50. [x] Builder `updateProfile` call sites: `displayName:` → `username:` in `builder_settings_dialog.dart` and `profile_dialog.dart`.
51. [x] Viewer `course_screen` and `user_provider`: removed dead `chapters`/accordion and dead stat fields (`_completedQuestions`, `_unlockedAchievements`, `_checkAndUpdateStreak`).
52. [x] React Builder foundation completed: `@primoria/schema` (Zod schemas, migration, fixtures, 20 tests), `@primoria/db` (Supabase generated types), `@primoria/builder` (Vite 6 + React 19 + RTK; auth, dashboard, full editor with 13 block panels, dnd-kit canvas, manual save, undo/redo, publish, preview mode, course duplication, JSON import, AI generation for Interactive Visual; 38 tests; 0 TS errors).
53. [x] `@primoria/db` `database.generated.ts` populated from real Supabase project (`rygafvlzzkvqhhenajzi`); `pnpm db:types` script wired in both package and root workspace.
54. [x] React Builder visual parity pass: botanical dashboard/auth/editor shell, landing-style surfaces, and production-grade page layout now replace the earlier plain Tailwind look.
55. [x] Block visibility flow completed in React Builder: first block locked to `always`, later blocks default to `afterPreviousCorrect`, and learner preview reveals gated content only after a correct answer plus `Check`.
56. [x] Builder canvas editing upgraded: `text`, `code-block`, and `code-playground` edit directly on-block; `image` uploads to Supabase; redundant property-panel editors removed.
57. [x] React learner preview rebuilt to mirror the Flutter viewer structure more closely: centered lesson stage, page progress, `Prev / Check / Next` navigation, and landing-style presentation.
58. [x] React Builder UI copy normalized to English-only; old Chinese dashboard/auth test selectors and stale language values were removed.
59. [x] React `packages/builder` is the sole authoring implementation and current docs reflect that architecture.
60. [x] Builder hardening completed: explicit remote save flow, publish aborts on save failure, role-gated author/admin access, local draft/autosave removed, and `requiredForProgress` removed in favor of `visibilityRule`.
