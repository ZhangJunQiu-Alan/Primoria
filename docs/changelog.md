# Changelog

## [Unreleased] - 2026-03-20 (React Builder Parity Pass + Flutter Builder Retirement)

### Summary
The React Builder moved from rewrite status to the primary authoring implementation.
This pass completed the missing authoring interactions, refreshed learner preview to mirror the
Flutter viewer structure more closely, normalized the React UI to English-only, documented the
current architecture in `docs/`, and retired the legacy Flutter `Builder/` source tree from the
active repository.

### Changed

- **Editor parity in React Builder**
  - block visibility is now fully configurable in block settings, with the first block on each page locked to `always`
  - learner gating uses `afterPreviousCorrect` end-to-end in preview mode
  - `text`, `code-block`, and `code-playground` moved to direct on-block editing
  - `image` blocks now upload assets to Supabase from the canvas flow
- **Preview redesign**
  - React `PreviewMode` now uses a centered lesson stage with page progress and `Prev / Check / Next`
  - redundant top hero/summary preview chrome was removed after the parity pass
- **UI normalization**
  - React dashboard/auth/settings copy was cleaned to English-only
  - old Chinese-only test selectors and `zh-CN` language handling were removed from the React Builder
- **Documentation**
  - `docs/README*`, `docs/dashboard*`, `docs/test-checklist*`, and `docs/todo*` now describe the React Builder as the live authoring stack
- **Repository cleanup**
  - removed the legacy Flutter `Builder/` implementation from the active repo

### Validation

- `pnpm --filter @primoria/builder typecheck` — pass
- `pnpm --filter @primoria/builder exec vitest run test/dashboardPage.test.tsx test/editorLayout.test.tsx test/previewMode.test.tsx test/editorSlicePhase4.test.ts` — pass
- `pnpm --filter @primoria/builder exec vitest run test/editorInlineBlocks.test.tsx test/editorPage.test.tsx` — pass

---

## [Unreleased] - 2026-03-19 (React Builder — Full Rewrite on `builder-react-rewrite`)

### Summary
Full rewrite of the Flutter Web Builder as a React/TypeScript pnpm monorepo under `packages/`.
Introduces `@primoria/schema` (Zod-based single source of truth for course JSON), `@primoria/db`
(Supabase generated types), and `@primoria/builder` (Vite 6 + React 19 + Redux Toolkit SPA).
Feature-complete with the Flutter Builder, plus course duplication, JSON import, block-style
editing, in-editor learner preview, and AI generation for Interactive Visual blocks.

### Added

#### `packages/schema` — `@primoria/schema`
- Zod schemas for all 13 block types (`text`, `image`, `code-block`, `code-playground`, `code-execution`, `function-flow`, `multiple-choice`, `fill-blank`, `true-false`, `matching`, `animation`, `interactive-visual`, `video`) and full course hierarchy (`Block → Page → Lesson → Course`).
- `migrateCourseJson()` — normalises all legacy key aliases (camelCase → snake_case, `pages` → `lessons`, block-type aliases, visibilityRule aliases).
- `parseCourse()` — strict Zod parse with informative error messages.
- Test fixtures: `FIXTURE_MINIMAL_COURSE`, `FIXTURE_ALL_BLOCKS_COURSE`, `FIXTURE_LEGACY_COURSE_RAW`.
- 20 Vitest tests covering all migration paths and schema validation.

#### `packages/db` — `@primoria/db`
- `database.generated.ts` generated from real Supabase project `rygafvlzzkvqhhenajzi` via `supabase gen types typescript`.
- `pnpm db:types` script added to both `packages/db/package.json` and root `package.json`.

#### `packages/builder` — `@primoria/builder`
- **Stack**: Vite 6, React 19, TypeScript strict, React Router v7, Redux Toolkit, TanStack Query v5, Tailwind CSS v3, shadcn/Radix UI, React Hook Form + Zod, @dnd-kit, TipTap, CodeMirror 6.
- **Auth**: `LoginPage`, `RegisterPage`, `AuthCallbackPage`; GitHub/Google OAuth; `AuthProvider` bootstraps Supabase session → Redux on mount; `RequireAuth` / `RedirectIfAuth` route guards.
- **Dashboard**: course list, inline create, delete (confirm), duplicate (deep-copy lessons), import from JSON file (`parseCourse` + `migrateCourseJson`).
- **Editor layout**: 3-panel (224 px lesson nav | flex canvas | 288 px property panel); `EditorHeader` with undo/redo (⌘Z/⌘⇧Z), preview toggle, export JSON, Save, Publish.
- **Lesson/page management**: `LessonNav` — dnd-kit vertical sort, inline title edit, add/delete lesson & page.
- **Block canvas**: `BlockCanvas` — dnd-kit sort, per-block drag handle, duplicate, delete; `AddBlockMenu` grouped by category (Content / Interactive / Quiz).
- **Auto-save** (3-tier): 500 ms → localStorage; 4 s → Supabase upsert (courses + lessons, orphan cleanup); Save button → force flush.
- **Undo/redo**: `past[]`/`future[]` in Redux, MAX_HISTORY=50, Immer `current()` snapshot to prevent proxy aliasing.
- **Keyboard shortcuts**: ⌘Z undo, ⌘⇧Z/⌘Y redo, ⌘S save, ⌘D duplicate, Delete/Backspace remove block.
- **Publish**: full `CourseSchema.safeParse` validation before upsert; sets `status='published'`.
- **All 13 block property panels**: TextPanel (TipTap rich-text), CodeBlockPanel (CodeMirror 6, 6 languages), MultipleChoicePanel, TrueFalsePanel, FillBlankPanel, MatchingPanel, ImagePanel, VideoPanel (YouTube live preview), AnimationPanel, InteractiveVisualPanel, FunctionFlowPanel, MetadataPanel, CourseSettingsPanel.
- **Block style editor**: spacing (none/sm/md/lg), alignment (left/center/right), width/height inputs; dispatches `updateBlockStyle`.
- **Course settings panel**: theme light/dark, primaryColor (color picker + hex input), fontFamily with live preview; dispatches `updateSettings`.
- **Block settings**: visibilityRule select, requiredForProgress checkbox.
- **In-editor learner preview**: eye-icon toggle in header; `PreviewMode` renders all blocks via `BlockRenderer` (read-only renderers for all 13 types) in a centred 2xl container with amber preview banner.
- **AI generation for Interactive Visual**: "✨ Generate with AI" button in `InteractiveVisualPanel`; calls `supabase.functions.invoke('gemini-generate', { body: { prompt } })`; stores returned HTML as `generatedHtml` in block content.
- **38 Vitest tests** across editorSlice (CRUD, undo/redo, duplicate, blockSettings), route guards.

### Validation
- `pnpm typecheck` (workspace-wide) — 0 errors.
- `pnpm test` (workspace-wide) — 58 tests pass (20 schema + 38 builder).

---

## [Unreleased] - 2026-03-17 (Builder↔Viewer Schema Alignment + Viewer Feature Parity)

### Summary
Multi-session batch of Builder↔Viewer alignment fixes and new Viewer capabilities.
Covers JSON key normalization (snake_case), Viewer auth resilience, graph matching, visibility gating, multi-select questions, video block playback, and a suite of smaller bug fixes across both apps and the Supabase backend.

### Added
- **Viewer: embedded video playback** — `VideoEmbedWidget` (3 files: conditional export / web HtmlElementView / non-web placeholder) in `Viewer/lib/widgets/`. `_toEmbedUrl()` converts YouTube watch links → `/embed/ID` and Vimeo links → `player.vimeo.com/video/ID`; direct URLs passed as-is. New `QuestionType.video` renders the player inside the lesson flow.
- **Viewer: multi-select questions** — new `QuestionType.multiChoice` with checkbox UI ("Select all that apply"); `correctIndices: Set<int>` tracks correct option positions; validation requires exact full match.
- **Viewer: graph-mode matching** — `matching` blocks with `nodes` + `edges` fields now build label→label pairs and reuse the existing list-matching drag UI instead of showing an error.
- **Viewer: visibility gating** — `visibility_rule: 'afterPreviousCorrect'` fully implemented: `_lastAnsweredCorrectly` tracked per answer; `_nextQuestion()` skips gated blocks when the previous answer was wrong.
- **Supabase: `publish_course` RPC v2** (`20260317000001_fix_publish_course_v2.sql`) — rewrote to only flip course status; removed join on the deleted `chapters` table and the unconditional `lessons.content_json` overwrite that was clearing Builder snapshots.

### Changed
- **Builder JSON snake_case normalization** — `Course.toJson()` now emits `schema_version`, `course_id`; `CourseMetadata.toJson()` emits `difficulty_level`, `estimated_minutes`; `CourseLesson.toJson()` emits `lesson_id`; `LessonPage.toJson()` emits `page_id`. All `fromJson()` methods accept both old camelCase and new snake_case keys for backward compatibility.
- **Builder schema migrator** (`course_schema_migrator.dart`) — reads `schema_version`/`schemaVersion`, `course_id`/`courseId`, `lesson_id`/`lessonId`; renames `difficulty` → `difficulty_level` and `estimatedMinutes` → `estimated_minutes` during migration; finalizes output with canonical snake_case keys.
- **Builder schema validator** (`course_schema_validator.dart`) — all field reads updated to accept dual-key form; validation paths use canonical snake_case names.
- **Builder `Block.toJson()`** — skips `_normalizeToSnakeCase()` for `InteractiveVisualContent` to prevent double conversion (camelCase spec must be preserved for Viewer).
- **Viewer auth resilience** (`Viewer/lib/services/supabase_service.dart`) — all auth methods (`signUp`, `signIn`, `signOut`, `signInWithGoogle`, `signInWithApple`) wrapped with `_withAuthTimeout<T>()` (30 s hard cap) and 3-attempt exponential backoff (900 ms → 1 800 ms → 2 500 ms).
- **Viewer `_parseCodeExecution`** — reads `source_code` first, falls back to `sourceCode` then `code` for compatibility.
- **Builder `updateProfile` calls** — `displayName:` parameter renamed to `username:` in `builder_settings_dialog.dart` and `profile_dialog.dart` to match the current `SupabaseService.updateProfile` signature.
- **Viewer `course_screen.dart`** — replaced `_chapters` / `_expandedChapters` state with `_lessons` matching the current data model; removed accordion expand logic.
- **Viewer `user_provider.dart`** — removed dead fields `_completedQuestions`, `_unlockedAchievements`, and the `_checkAndUpdateStreak` call.
- **Builder `property_panel.dart`** — removed unused `StorageService` import.

### Fixed
- `Builder/test/models_test.dart` — `Course JSON schema fields` test updated to assert `schema_version` and `course_id` keys (was `schemaVersion`/`courseId`).

### Validation
- `cd Builder && flutter analyze --no-pub` — 0 errors.
- `cd Builder && flutter test` — 130 pass, 1 pre-existing failure (`widget_test.dart` / Supabase init).
- `cd Viewer && flutter analyze --no-pub` — 0 issues.
- `cd Viewer && flutter test` — 10 pass, 0 failures.

---

## [Unreleased] - 2026-03-16 (Interactive Visual: Platform AI Key + Style Picker)

### Summary
- Removed user-facing Gemini API key input from Interactive Visual property inspector; platform now provides a shared key via a Supabase Edge Function (`gemini-generate`).
- Removed all built-in Flutter scene templates (pendulum, wave, projectile, etc.); all rendering is now HTML/JS generated by Gemini.
- Added mandatory 6-style picker (Watercolor / Papercraft / Anime / Whiteboard / Retro Print / Heritage) above the prompt field; style instructions are injected into the Gemini prompt; Generate button is disabled until a style is chosen.
- Fixed "Invalid JWT" / "Unauthorized" 401 errors by deploying Edge Function with `--no-verify-jwt` and removing JWT user-check from function body.

### Added
- `supabase/functions/gemini-generate/index.ts` — new Deno Edge Function: verifies request, reads `GEMINI_API_KEY` from Deno env secret, calls `gemini-2.0-flash`, returns raw HTML.
- `Builder/lib/services/ai_visual_generator.dart` — replaced direct Gemini SDK calls with `supabase.functions.invoke('gemini-generate')`.
- `_VisualStyle` data class + `_visualStyles` list (6 entries) in `property_panel.dart`.

### Changed
- `Builder/lib/widgets/property_panel.dart` (`_InteractiveVisualEditorState`):
  - Added `_selectedStyle` state (nullable; required before generation).
  - `_generate()` prepends selected style's `promptHint` to user prompt.
  - New style-picker grid (2-column, 6 chips) rendered above prompt `TextFormField`.
  - Yellow nudge banner shown when no style is selected.
  - Generate button disabled when `_selectedStyle == null` or `_isGenerating`.
  - Removed API key field, `StorageService.saveAnimationApiKey()`, preview section, template chips, mode chips.
- `Builder/lib/widgets/block_widgets/interactive_visual_widget.dart` — simplified to thin `StatelessWidget`; all 9 Flutter scene widgets removed (~1400 lines).

### Known Issue
- Gemini occasionally returns markdown code fences (`` ```html ``...`` ``` ``) instead of raw HTML despite system prompt instruction; the fence text renders visibly in the iframe. Fix pending: strip fences in Edge Function before returning.

### Validation
- `cd Builder && flutter analyze` — 0 errors.

---

## [Unreleased] - 2026-03-16 (Architecture Alignment + Code Execution UI + AI Text Fix)

### Summary
- Full Course→Lessons→Pages→Blocks architecture alignment across Builder, Viewer, and Supabase storage.
- Code Execution block UI redesign: removed scrubbar/step-duration, variables+stdout side-by-side, 4 control buttons fill full row.
- AI text blocks now auto-convert Markdown → Quill Delta at generation time.
- Gemini model updated to `gemini-3.1-pro-preview`.

### Changed
- `Builder/lib/services/gemini_client.dart` — `defaultModels` updated to `['gemini-3.1-pro-preview']`.
- `Builder/lib/widgets/property_panel.dart` — animation editor default model and options updated to `gemini-3.1-pro-preview`.
- `Builder/lib/services/ai_course_generator.dart` — added `_markdownToRichtextDelta()` and `_appendInlineOps()` helpers; text block normalizer now converts Markdown → Quill Delta instead of storing raw markdown strings.
- `Builder/lib/widgets/block_widgets/code_execution_block_widget.dart` — removed `_buildScrubBar()` and `_jumpToStep()`; `_buildControlBar()` now uses 4 `Expanded` `OutlinedButton.icon` widgets in a `Row`; variables + stdout panels display in a horizontal `Row`.
- `Builder/lib/widgets/code_execution_content_editor.dart` — removed "Step Duration" slider and "Allow scrub" toggle.
- `Builder/lib/services/supabase_service.dart` — `_saveCourseSnapshot()` stores `lessons[i].toJson()` per row (was full-course JSON only in row 0); `saveLessonToCourse()` stores per-lesson content.
- `Builder/lib/models/lesson.dart` — removed `blocks` convenience getter (use `pages.first.blocks`).
- `Builder/lib/providers/course_provider.dart` — removed `sortedLessonBlocksProvider` (use `sortedPageBlocksProvider((lessonIndex, 0))`).
- `Builder/lib/services/course_schema_validator.dart` — lesson-level `blocks[]` now triggers `_addError` in publish/export mode and `_addWarning` in save/import mode.
- `Viewer/lib/screens/lesson_screen.dart` — `_parseBuilderLessons()` now reads `pages[]` first, falls back to `blocks[]` for legacy data.
- `Viewer/lib/services/supabase_service.dart` — `_isLessonContentEmpty()` checks `lessons` key in addition to `pages`.

### Fixed
- Test files updated: `lesson.blocks` → `lesson.pages.first.blocks` across `models_test.dart`, `course_schema_migration_test.dart`, `course_schema_validator_test.dart`.
- `module_panel.dart` — removed unused `_categoryDescription` method and unused `t` variable.

### Validation
- `cd Builder && flutter analyze` — 0 errors, 1 pre-existing warning (`_baseUrl`).
- `cd Builder && flutter test` — 118 passed.
- `cd Viewer && flutter analyze` — 0 issues.

---

## [Unreleased] - 2026-03-14 (Builder AI + Canvas UX Polish)

### Summary
- Fixed critical bug: AI generation from PDF produced an empty canvas (course title populated but no blocks visible).
- Redesigned AI prompt to v3/v4: visual-first page strategy (animation opener on every page), stricter text rules, markdown-to-Delta conversion in normalizer.
- Rebuilt page navigation strip: compact numbered chips with scroll arrows.
- Fixed property inspector blank on pages 2+ (block lookup and `updateBlock` were hardcoded to page 0).
- Block library UI: removed category description subtitles and "N 个模块" count labels.

### Fixed
- `Builder/lib/services/ai_course_generator.dart` — `_normalizeGeneratedCourseJson` now sets `$schema` and `schemaVersion` on the normalized JSON so `CourseSchemaMigrator` treats it as current schema (v1.0.0) instead of `legacy-unversioned`, preventing the migrator from stripping inner `pages` arrays and producing empty lessons.
- `Builder/lib/widgets/property_panel.dart` — block lookup in `PropertyPanel.build` now iterates `lesson.pages[*].blocks` (all pages) instead of `lesson.blocks` (page 0 only); `_BlockPropertyEditor._updateBlock` passes `pageIndex:` to `courseProvider.updateBlock`; `_BlockPropertyEditor` constructor gains `pageIndex` parameter.

### Changed
- `Builder/lib/services/ai_course_generator.dart`:
  - Prompt bumped to `v3` then `v4`: mandatory animation opener on every page; text blocks limited to 1 sentence / 20 words; all markdown syntax banned in text values; image blocks banned (use animation + aiPrompt instead).
  - `animation` normalizer now preserves `aiPrompt` field (was silently dropped).
  - Text normalizer now calls `_ensureQuillDelta` — if value is already valid Delta JSON keep it, otherwise convert markdown to Quill Delta via `_markdownToQuillDelta` / `_stripInlineMarkdown`.
  - Empty-URL image blocks are auto-converted to `animation` blocks (with alt/caption as `aiPrompt`) so the canvas always shows something meaningful.
- `Builder/lib/widgets/builder_canvas.dart` — `_PageNavigationStrip` redesigned: compact numbered chips (`_PageChip`, 28 px, rounded-rect border) replace verbose "第 N 页" pills; `_ArrowBtn` scroll arrows fade in/out on overflow; active chip auto-scrolls into view; "+ 新建页" always anchored to the right.
- `Builder/lib/widgets/module_panel.dart` — removed category description subtitles ("叙事、媒体与测验模块" etc.) and "N 个模块" count labels from category headers.
- `docs/prompt.txt` — updated to v4 rules (animation openers, 1-sentence text, no markdown).

### Validation
- `cd Builder && flutter analyze` — 0 errors.
- `cd Builder && flutter test` — 112 passed, 1 pre-existing failure (`widget_test.dart`).

---

## [Unreleased] - 2026-03-14 (Builder AI Generation — Pages + richtext + function-flow)

### Summary
- Updated AI course generation system to be page-aware: prompts now ask Gemini to output `pages[]` within lessons, and the normalization layer distributes flat blocks into pages intelligently when the AI uses the old format.
- Text blocks in AI output now use `format: "richtext"` (was `"markdown"`).
- Added `function-flow` block type support to prompts, type alias map, and normalization.
- Bumped prompt version to `2026-03-14.ai-course-v2`.

### Changed
- `Builder/lib/services/ai_course_generator.dart`:
  - `_courseGenerationPrompt` — updated schema to show `pages[]` structure per lesson, added page distribution rules (2-5 blocks/page, end page on interactive block), changed text format to `richtext`, added function-flow example.
  - `_normalizeLessons` — now handles both new `pages` key and legacy `blocks` key from AI output; distributes flat blocks into pages via `_distributeBlocksIntoPages`.
  - New `_distributeBlocksIntoPages` — splits block list into pages, closing a page when ≥ 2 blocks and current block is interactive (or max 5 reached), and re-normalizes `position.order` + `visibilityRule` per page.
  - New `_normalizeFunctionFlowContent` — normalizes nodes/edges from AI output with fallback.
  - `_normalizeBlockContent` text case — changed default format from `"markdown"` to `"richtext"`.
  - `_normalizeBlockType` — added `function-flow`, `functionflow`, `function_flow` aliases.
  - `_normalizeBlocks` fallback — changed format to `"richtext"`, updated message.
  - `_blockTypeReference` — updated all examples to `richtext`, added code-execution and function-flow entries.
  - `_buildLessonBlocksPrompt` — added hint to use code-execution/function-flow for CS lessons.
  - `_promptVersion` bumped to `'2026-03-14.ai-course-v2'`.
- `docs/prompt.txt` — updated to pages structure, richtext format, function-flow mention.

### Validation
- `cd Builder && flutter analyze` — 0 errors.
- `cd Builder && flutter test` — 112 passed, 1 pre-existing failure.

---

## [Unreleased] - 2026-03-14 (Builder Rich Text Editor + Page Concept)

### Summary
- Replaced the Markdown toggle in text blocks with a full WYSIWYG rich-text toolbar powered by `flutter_quill`.
- Fixed persistent focus-loss bug in the text editor.
- Polished Block Library UI: removed subtitle, replaced font-size dropdown with alignment buttons, removed drag handles from items, and visually differentiated category headers from block rows.
- Introduced the **Page** concept inside lessons: a lesson now contains one or more pages, each holding an ordered list of blocks. The Builder canvas gained a page navigation strip; the Viewer preview gained per-page navigation with progress dots, Prev/Next/Complete buttons, and per-page answer state.
- Removed the legacy "课时画布 / Lesson Canvas" header from the builder canvas.

### Added
- `Builder/lib/models/lesson_page.dart` — new `LessonPage { pageId, order, List<Block> blocks }` model with full `fromJson/toJson/copyWith/addBlock/removeBlock/updateBlock/reorderBlocks`.
- Page navigation strip (`_PageNavigationStrip`, `_PageTab`) embedded in `BuilderCanvas`: pill tabs, "+ 新建页 / New page" button (disabled until current page has ≥1 block), per-tab × delete button.
- `setCurrentPage(int)` on `BuilderStateNotifier`.
- `addPage(lessonIndex, currentPageIndex)` / `removePage(lessonIndex, pageIndex)` on `CourseNotifier`.
- `sortedPageBlocksProvider((lessonIndex, pageIndex))` family provider for block reads.
- Per-page viewer navigation in `_InteractiveLessonView`: animated progress dots, Prev / Check / Next / Complete bottom bar.
- `IdGenerator.pageId()`.

### Changed
- `Builder/lib/models/lesson.dart` — `CourseLesson` migrated from `List<Block> blocks` to `List<LessonPage> pages`. `fromJson` auto-wraps legacy `blocks` array into a single page (backward compatible). `toJson` emits `pages` key.
- `Builder/lib/models/models.dart` — exports `LessonPage`.
- `Builder/lib/providers/builder_state.dart` — added `currentPageIndex` field; `setCurrentLesson` resets page to 0.
- `Builder/lib/providers/course_provider.dart` — all block ops (`addBlock`, `removeBlock`, `updateBlock`, `reorderBlocks`) accept `pageIndex:` named param; `duplicateLesson` correctly clones all pages.
- `Builder/lib/widgets/builder_canvas.dart` — removed `_buildCanvasHeader()`; all block ops forward `currentPageIndex`; `DragTarget.onAcceptWithDetails` drops onto active page.
- `Builder/lib/widgets/block_widgets/block_wrapper.dart` — replaced Markdown editor with `flutter_quill` WYSIWYG editor; persistent `FocusNode` + `ScrollController` fix focus-loss bug; toolbar: Bold/Italic/Underline/Strikethrough/Color/Highlight/Alignment(L/C/R)/Heading dropdown/Bullet/OrderedList.
- `Builder/lib/widgets/module_panel.dart` — removed "Rich text / Markdown" subtitle; removed drag handle from `_ModuleItem`; reduced item height.
- `Builder/lib/services/block_registry.dart` — text block description changed from `'Rich text / Markdown'` to `'Rich text'`.
- `Builder/lib/services/course_schema_validator.dart` — `_validateLessons` updated to traverse `pages[].blocks[]` (new format) with fallback to legacy `blocks[]` at lesson level.
- `Builder/lib/models/block.dart` — `TextContent` default format changed from `'markdown'` to `'richtext'`.
- `Builder/lib/main.dart` — added `flutter_localizations` delegates (required for `flutter_quill`).
- `Builder/pubspec.yaml` — added `flutter_quill: ^11.5.0`, `flutter_localizations: sdk: flutter`.
- `docs/course-json-guide.md` — lesson shape updated to reflect new `pages` structure.

### Validation
- `cd Builder && flutter analyze` — 0 errors.
- `cd Builder && flutter test` — 112 passed, 1 pre-existing failure (`widget_test.dart` requires Supabase init).

---

## [Unreleased] - 2026-03-08 (Viewer Auth & Landing Redesign + GitHub Pages Migration)

### Summary
- Completely redesigned Viewer landing page to focus on learner benefits (removed all Builder references).
- Completely redesigned Viewer login and register screens with professional two-panel desktop layout, full social OAuth (Google, Apple, WeChat), animated input fields, and password strength indicator.
- Fixed three reported UI bugs in login/register: feature-pill spacing gap, dark-mode invisible text in form inputs, incorrect social login logos.
- Migrated GitHub Pages deployment from the deprecated `hackathon/` project to the Viewer app at primoria.dpdns.org.
- Removed the `hackathon/` Flutter project from the repository.

### Added
- `Viewer/lib/screens/landing_screen.dart` — full rewrite with 11 sections: Header, Hero (floating mockup cards), StatsBar, Features (4 cards), HowItWorks, AiTutor, Gamification, Community, Testimonials, CtaBanner, Footer. Responsive at 980px breakpoint.
- `Viewer/web/CNAME` — preserves `primoria.dpdns.org` custom domain for GitHub Pages.
- `.github/workflows/deploy-viewer.yml` — new workflow replacing `deploy-hackathon.yml`; builds and deploys Viewer to GitHub Pages on push to `Viewer/**`.

### Changed
- `Viewer/lib/screens/login_screen.dart` — complete rewrite:
  - Desktop: left dark brand panel (navy→purple gradient, dot-grid bg, feature pills, testimonial card) + right white form panel.
  - Social auth buttons: Google (Image.asset google.png), Apple (Icons.apple), WeChat (Image.asset wechat.png with white color filter).
  - `_FocusableField` stateful widget with `FocusNode`-driven `AnimatedContainer` border/shadow.
  - Form panel wrapped in `Theme(data: ThemeData.light())` to prevent system dark-mode bleed-through into input fields.
  - Feature pills column now has consistent 10px gaps (bug fix: last pill was flush against testimonial card).
- `Viewer/lib/screens/register_screen.dart` — complete rewrite mirroring login with mirrored layout (form left, brand right):
  - Additional username field with min-3-char validation.
  - 4-segment password strength bar (Too Short / Weak / Good / Strong).
  - Animated terms-of-service checkbox.
  - Stats row (10K+ learners / 200+ courses / 4.9★) in brand panel.
  - Same dark-mode and logo fixes applied.
- `Viewer/lib/services/supabase_service.dart`
  - Added `signInWithApple()` using `OAuthProvider.apple`.
  - Added `signInWithWeChat()` returning stub message (WeChat OAuth not yet supported by Supabase).

### Removed
- `hackathon/` Flutter project (entire folder deleted).
- `.github/workflows/deploy-hackathon.yml`.

### Validation
- `cd Viewer && flutter analyze`
  - No new errors; one pre-existing info: `lib/services/gemini_service.dart:3:8 depend_on_referenced_packages`.
- `cd Viewer && flutter test`
  - All 10 tests passed.

---

## [Unreleased] - 2026-03-08 (Builder Full I18N + Viewer Landing I18N)

### Summary
- Completed end-to-end Builder bilingual adaptation (Chinese/English) across auth, dashboard, builder canvas, viewer preview, and interactive block widgets.
- Ensured Builder language switching is settings-driven and consistent in both editing and preview experiences.
- Added Viewer landing-page bilingual adaptation to keep public-entry copy aligned with language preference.

### Changed
- Builder core localization wiring:
  - `Builder/lib/features/builder/builder_screen.dart`
  - `Builder/lib/widgets/module_panel.dart`
  - `Builder/lib/widgets/builder_canvas.dart`
  - `Builder/lib/widgets/property_panel.dart`
  - `Builder/lib/widgets/user_avatar.dart`
- Builder auth/dashboard localization coverage:
  - `Builder/lib/features/auth/login_screen.dart`
  - `Builder/lib/features/auth/auth_callback_screen.dart`
  - `Builder/lib/widgets/auth_dialog.dart`
  - `Builder/lib/widgets/ai_generate_dialog.dart`
  - `Builder/lib/features/dashboard/dashboard_screen.dart`
  - `Builder/lib/features/dashboard/tabs/data_center_tab.dart`
  - `Builder/lib/features/dashboard/tabs/fans_manage_tab.dart`
  - `Builder/lib/features/dashboard/widgets/learner_table.dart`
- Builder interactive preview/widget localization:
  - `Builder/lib/features/viewer/viewer_screen.dart`
  - `Builder/lib/widgets/block_widgets/block_wrapper.dart`
  - `Builder/lib/widgets/block_widgets/code_playground_widget.dart`
  - `Builder/lib/widgets/block_widgets/code_execution_block_widget.dart`
  - `Builder/lib/widgets/block_widgets/function_flow_block_widget.dart`
  - `Builder/lib/widgets/matching_content_editor.dart`
  - `Builder/lib/widgets/code_execution_content_editor.dart`
  - `Builder/lib/widgets/function_flow_content_editor.dart`
- Viewer landing localization:
  - `Viewer/lib/screens/landing_screen.dart`
- Tests:
  - `Builder/test/matching_graph_widget_test.dart`
    - Updated to pass localization dependency and accept bilingual assertions.

### Validation
- `cd Builder && flutter analyze`
  - No analyzer errors after this change set.
  - Existing non-blocking items remain (deprecated `dart:html`, one unused field, test string-escape infos).
- `cd Builder && flutter test test/matching_graph_widget_test.dart`
  - Passed.

---

## [Unreleased] - 2026-03-08 (Viewer Core I18N + UI Stability Fixes)

### Summary
- Completed core Viewer bilingual adaptation (Chinese/English) for authenticated learning flows and ensured language switch consistency with user settings.
- Fixed multiple Viewer UX regressions on Home/Library/Auth pages (blank sections, duplicate selected subject chip, login overflow, icon contrast, scrollbar alignment).
- Removed homepage daily task module and kept "continue learning" module behavior stable after layout adjustments.

### Changed
- `Viewer/lib/l10n/app_localizations.dart`
  - Added/expanded localization keys used by auth/community/settings and bilingual profile options.
- `Viewer/lib/screens/login_screen.dart`
  - Localized login content and status/error flows.
  - Fixed desktop split layout overflow.
  - Updated social logos: Apple icon corrected, WeChat icon forced white for contrast.
  - Moved scroll container structure so the right-side scrollbar aligns to the panel edge.
- `Viewer/lib/screens/register_screen.dart`
  - Localized registration labels/validation/terms/social section.
  - Synchronized social logo rendering with login page.
- `Viewer/lib/screens/profile_settings_screen.dart`
  - Wired language option labels and session-expired messaging to localization.
- `Viewer/lib/screens/home_screen.dart`
  - Removed daily task block from homepage flow.
  - Stabilized bottom "continue learning" card placement and resolved blank-content regressions from previous layout adjustments.
- `Viewer/lib/screens/search_screen.dart`
  - Removed duplicate selected category chip below subject tabs.
- `Viewer/lib/screens/courses_screen.dart`
  - Localized remaining community/find/message UI strings and dialogs.
  - Localized seed conversation text by current language preference.
- `Viewer/lib/screens/lesson_screen.dart`
  - Localized fallback/demo lesson strings (question titles, hints, completion/capability fallback text).
- `Viewer/lib/screens/lesson_result_screen.dart`
  - Localized time-unit formatting and XP label rendering.
- `Viewer/lib/screens/ai_tutor_screen.dart`
  - Localized conversation/studio/notebook/dialog/action text and generation status/error messaging.
  - Added language-aware suggested prompts.

### Validation
- `cd Viewer && flutter analyze`
  - No new errors introduced; existing info remains:
    - `lib/services/gemini_service.dart:3:8 depend_on_referenced_packages (http)`
- `cd Viewer && flutter test`
  - All tests passed.

---

## [Unreleased] - 2026-03-07 (Builder Login Provider Logo Update)

### Summary
- Updated Builder login social buttons to show an Apple logo for Apple sign-in.
- Updated WeChat sign-in button to use a white WeChat logo for proper contrast on the green button.

### Changed
- `Builder/lib/features/auth/login_screen.dart`
  - Apple sign-in button now uses `Icons.apple` instead of the previous placeholder fallback icon flow.
  - Added `logoTintColor` support to `_SocialButton` so provider assets can be tinted when needed.
  - Applied white tint to the WeChat logo on the WeChat sign-in button.

### Validation
- `cd Builder && flutter analyze lib/features/auth/login_screen.dart`

---

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
