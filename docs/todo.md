# TODO

## All
1. [ ] Unify UI style
2. [x] Multilingual support — full EN/ZH switching for Builder and Viewer, browser locale default, SharedPreferences persistence (2026-02-23)

## Builder
1. [x] Enable Markdown rendering for text blocks — MarkdownBody in canvas, format toggle in property panel (2026-02-11)
2. [x] Update course prompt to match the new flow — Gemini one-page generation (max 20 blocks), adaptive block-type strategy, JSON normalization/repair (2026-02-13)
3. [x] Build course management system with sub-courses — Dashboard with Course Manage tab (2026-02-09)
4. [x] Build home page: support common features (Profile, achievements, etc.) — Dashboard Home Page with Course Data, Income, Comments (2026-02-09)
5. [x] Add basic categories to the module panel (physics, chemistry, biology, math, programming, general) — updated taxonomy: General + Programming groups with search; General now includes Text/Image/Animation/Multiple Choice/True-False/Matching, Programming includes Code Block/Code Playground (2026-03-03)
6. [~] Add more question types — True/False done (2026-02-11), Matching UX enhanced (2026-02-12), Animation MVP done (2026-02-14); remaining: advanced matching modes, etc.
7. [ ] Add multi-user collaboration
8. [x] Landing page with sign-in modal and Supabase auth integration (2026-02-09)
9. [x] Builder UI redesign — rounded card panels, pill-shaped buttons, simplified empty states (2026-02-09)
10. [x] Create test users in Supabase for sign-in testing
11. [x] Wire up Dashboard to real Supabase course data (2026-02-10)
12. [ ] Use Google sign-in (OAuth callback handling and session recovery)
13. [~] Import workflow refinement — schema version migration path + diagnostics done (2026-02-13); remaining: broader historical format coverage
14. [ ] Block reorder/insert refinement
15. [~] More block types — True/False added (2026-02-11), Animation MVP added (2026-02-14); remaining: advanced matching modes, etc.
18. [x] Builder Preview button: phone-mockup viewer with interactive question blocks, visibilityRule gating, page navigation (2026-02-12)
19. [x] Dashboard HomePage wired to backend — fans/likes/shares from DB, comments with count rules, income with fallback (2026-02-11)
20. [x] Create Course modal with DB persistence — name input, validation, error feedback, auto-refresh list (2026-02-11)
21. [x] Create Course stays on Course Manage — lightweight `createCourseRow()`, no auto-navigate to Builder, new courses show only "Add lesson", Builder title save syncs back (2026-02-11)
22. [x] Prevent Preview round-trip data loss for unsaved Builder edits — per-course browser draft auto-save/restore on `/builder?courseId=<id>`, clear draft after cloud Save (2026-02-12)
23. [x] MultipleChoice multi-select authoring + unordered validation — add `correctAnswers`, single/multi mode toggle, and exact set matching in Preview (2026-02-12)
24. [x] Block reorder/insert refinement — insertion indicator, edge auto-scroll, and larger drag handle hitbox in Builder canvas (2026-02-12)
25. [x] Matching block UX improvements — color-coded pairs, numbered badges, shuffle, tap-to-unpair, export validation, unit tests (2026-02-12)
26. [x] Code Playground output reliability — Python-like expression evaluation + expected-output whitespace-tolerant matching (2026-02-13)
27. [x] AI generation diagnostics + validation gate — prompt versioning/fingerprint/source telemetry, parse/validation stage diagnostics, and blocking schema validation on AI output (2026-02-14)
16. [x] Robust schema validation — centralized validator + import/save/publish enforcement with field-path error details and warning/error severity (2026-02-12)
17. [ ] Provide region-specific sign-in methods (Lowest priority; Apple Developer Program membership required)
28. [x] Full EN/ZH multilingual support — BuilderLocalizations class, Riverpod languageProvider (StateNotifier), language tile in Profile Dialog, browser locale auto-detect, translated Landing/Dashboard/Builder/Profile screens (2026-02-23)
29. [x] Rich Create/Edit Course form — all metadata fields (description, difficulty, estimated hours, price tier, conditional price), `updateCourseInfo()` API, snackbar feedback (2026-02-24)
30. [x] Course thumbnail image upload — local file pick + Supabase Storage bucket (`course-thumbnails`), upload/URL toggle UI with preview, `uploadCourseThumbnail()` returning (url, error) tuple (2026-02-24)
31. [x] Fix `pickImageFileBytes` silent hang — switched from `readAsArrayBuffer` (returns unusable `ByteBuffer` in Dart Web) to `readAsDataUrl` + `base64.decode()`; also fixed `uploadCourseThumbnail` swallowing Supabase errors (2026-02-24)
32. [x] Migrate Builder + Viewer to cloud Supabase — both apps now default to `rygafvlzzkvqhhenajzi.supabase.co`; all 18 migrations pushed; `uuid_generate_v4()` → `gen_random_uuid()` for cloud compatibility (2026-02-25)
33. [x] Role-based access control for Builder — `BuilderAccessNotifier` singleton checks role on cold-start and auth events; `user`-role accounts blocked; router guards updated; landing screen shows checking spinner + access-denied banner (2026-02-25)
34. [x] Fix sign-out red-screen crash — (a) popup menu: delay signOut 300 ms for dismiss animation; (b) dashboard async handlers: capture `ScaffoldMessenger` before `await`, check `messenger.mounted`; (c) profile dialog: pop before signOut; (d) landing `onSuccess`: set to null (2026-02-25)
35. [x] Restore hackathon GitHub Pages custom domain — added `hackathon/web/CNAME` with `primoria.dpdns.org`; re-bound via GitHub API; site live at https://primoria.dpdns.org (2026-02-26)
36. [x] Browser password autofill on login/register — added `AutofillGroup` + `autofillHints` to Builder auth dialog and Viewer login/register screens; browsers now show save-password prompt and auto-fill on return (2026-02-26)
37. [x] AI backend Edge Function — moved Gemini call + prompt to `supabase/functions/ai-generate-course-json`; `generateViaApi()` in `ai_course_generator.dart` calls it; dashboard one-sentence dialog uses it; API key input removed from AI Generate dialog; `verify_jwt = false` in `config.toml` (2026-03-03)
38. [x] Fix drag-and-drop red-screen crash — `ReorderableListView` moves dragged item's `GlobalKey` into an Overlay, so `localToGlobal(ancestor: viewportBox)` throws "Unexpected null value"; fixed with try-catch in `builder_canvas.dart` (2026-03-03)
39. [x] Fix Builder blank-canvas init — normalise empty courseId to null in `initState`; call `_initializeBlankCourse()` when no courseId is provided so `/builder` without params works correctly (2026-03-03)
40. [x] Course Manage entry UX simplification — removed left sidebar "Build Course" button; "Add Lesson" now opens blank Builder (`/builder`) instead of opening the existing course (`/builder?courseId=<id>`) (2026-03-03)
41. [x] Preserve unsaved content across Preview round-trip on blank sessions — blank Builder now gets local temp `courseId`, draft autosave is enabled immediately, and Preview always routes with `courseId` so blocks/AI-generated content are restored when returning (2026-03-03)
42. [x] Builder default blank title rename — default new title switched from `Untitled Course` to `Untitled Lesson` in `builder_state` + `course_provider` (2026-03-03)
43. [x] AI multi-lesson generation — Edge Function produces 2-4 structured lessons (6-9 blocks each); server-side TypeScript schema validator; truncation detection + model fallback chain fix; stay on Dashboard after generation; `_saveCourseSnapshot` syncs one lesson row per page (2026-03-04)
44. [x] Function Flow block type — node-edge diagram for visualising caller-callee execution paths; step-through playback widget; property-panel editor; schema migration + validator; tests (2026-03-04)
45. [x] Add Lesson flow — `/builder?addLesson=1&courseId=…&draftId=…`; `saveLessonToCourse()` for independent lesson creation; draft persistence; Viewer back-navigation preserves add-lesson context (2026-03-04)
46. [x] Function Flow post-release stabilization — hardened path-metric rendering in `function_flow_block_widget.dart` (iterator-based metric read) and adjusted viewer smoke test to assert control availability (`function_flow_step`) for lower flake rate (2026-03-04)
47. [x] Code Execution block type — added `code-execution` end-to-end: model/registry/module panel, property editor, Builder + Viewer interactive renderer (play/pause/step/back/reset, line highlight, variables/stdout, checkpoint Q&A), schema migrator aliases (`codeExecution`/`code_execution`), validator path-level checks, and smoke/model/migration/validator tests (2026-03-04)
48. [x] AI Agentic Course Builder (Milestones 1–3) — full pipeline: one-sentence → CoursePlanJson → per-lesson block generation (retry + quality hints) → schema validation tool → quality evaluation (4 rules, score 0–100) → autonomous quality improvement pass → human-in-the-loop enhancement dialog (add-interactive / add-final-quiz); deployed 5 Edge Functions + 2 DB migrations (2026-03-04)
49. [x] Drop lesson group columns — removed `group_sort_key`/`group_title` from DB (migration 20260304000004); updated Builder and Viewer supabase_service.dart to use flat sort_key ordering (2026-03-04)
50. [x] Matching content editor extraction — `MatchingContentEditor` moved to dedicated file with smoke tests (2026-03-04)
51. [x] Function Flow dropdown overflow fix — `isExpanded`, `TextOverflow.ellipsis`, and `selectedItemBuilder` added to Entry Node and edge From/To dropdowns (2026-03-04)
52. [x] Delete lesson from Dashboard — hover-reveal ✕ button on each lesson card; `AlertDialog` confirmation; last-lesson guard; `getCourseContent` → `removePage` → `saveCourse` flow with cache invalidation (2026-03-04)
53. [x] AI Agentic local execution — moved entire generation pipeline from Supabase Edge Functions to client-side Flutter (direct Gemini API calls); eliminates 60 s Edge Function timeout; `generateCourseAgentLocally()` with real progress callbacks; `get-gemini-key` Edge Function vends API key securely (2026-03-05)
54. [x] Fix duplicate lessons on save — `_saveCourseSnapshot` upper-bound sort_key filter `< 2000` was missing agentic-created rows (sort_key = 2000, 3000…); removed upper bound so all existing lesson rows are fetched before upsert (2026-03-05)
55. [x] AI lesson generation reliability — reduced max blocks per lesson 15 → 8; compact fallback prompt (4-6 blocks) for retry rounds; MAX_TOKENS partial-content repair; graceful placeholder lesson when all models fail so entire course is never abandoned (2026-03-05)

## Viewer
1. [x] Build learning home page: support common features (Profile, achievements, etc.) — Home/Library/Community/Profile 4-tab redesign ported from Figma templates with LevelMap navigation (2026-02-18)
2. [x] Introduce social/friend features — Community tab with galaxy "find" visualization + message conversation list (2026-02-18)
3. [x] Generate records after course completion — `complete_lesson_and_award_xp` RPC (atomic XP award + streak update), called from LessonScreen on final slide (2026-02-18)
4. [ ] In a lesson, show current progress in the top bar after each block; do not write to the DB until the entire lesson is completed
5. [x] Connect all Viewer screens to Supabase DB — HomeScreen, SearchScreen, CourseScreen, LessonScreen all load/write live data; seed migration for local dev (2026-02-18)
6. [x] User authentication with Supabase — email/password sign-in/sign-up, Google OAuth, password reset, session restore, error translation (2026-02-17)
7. [x] Auth guard for protected routes — unauthenticated users redirected to /login from Home/Course/Lesson (2026-02-18)
8. [x] Remember Me on login — email + checkbox persisted in SharedPreferences, pre-filled on next launch (2026-02-18)
9. [x] Logout confirmation dialog — custom dialog with loading state, navigates to /login on confirm (2026-02-18)
10. [x] Profile stats from backend — XP, following count, followers count, bio synced from user_stats + follows + profiles tables (2026-02-18)
11. [x] Enrollment flow in CourseScreen — "Enroll in Course" button when not enrolled, calls enrollInCourse upsert (2026-02-18)
12. [ ] Cloud data synchronization (real-time / offline)
13. [ ] Real-time progress updates
14. [ ] Offline mode with content caching
15. [x] Landing screen + login/register screen redesign — split-panel layout, CSS-matched design tokens, social login grid (2026-02-17)
16. [x] Full EN/ZH multilingual support — AppLocalizations class, LanguageProvider (ChangeNotifier), language picker in Profile tab, browser locale auto-detect, translated Home/Search/Course/Lesson/Profile screens (2026-02-23)
17. [x] Profile top-right menu + dedicated settings flow — `Settings/About/Help/Log out`; Settings opens Personal Info page (2026-02-23)
18. [x] Profile Personal Info data bound to DB — edit `username`/`bio`, show `role`, show joined month-year from `profiles.created_at` (2026-02-23)
19. [x] Avatar upload end-to-end in Settings — web/native picker + Supabase Storage (`avatars`) + immediate DB persistence and profile refresh (2026-02-23)
20. [x] Remove redundant bottom settings block from Profile tab; keep settings entry only in top-right menu (2026-02-23)
21. [x] Profile cover image upload — web picker + 5 MB guard + Supabase Storage + DB persistence + instant banner refresh (2026-03-05)
22. [x] XP heatmap on Profile — GitHub-style 53×7 grid; 5-tier indigo colour scale from xp_transactions; month/day labels; scroll-to-right; tap SnackBar (2026-03-05)
23. [x] Session auth hardening — `ensureAuthenticated()` refresh + `lastOperationError` exposed to UI; avatar/cover upload now pre-checks session (2026-03-05)
24. [x] Profile banner edge-to-edge — SafeArea refactored so banner bleeds behind status bar; IndexedStack tabs manage their own SafeArea (2026-03-05)
25. [x] getUserStats live aggregation — stats now computed from xp_transactions / enrollments / lesson_completions in real time; home screen calls refreshStats() on load (2026-03-05)
26. [x] Home streak badge semantics + scrollbar alignment — top-right star badge now shows streak days (derived from consecutive positive-XP days, consistent with heatmap), and home scroll container is full-width so scrollbar stays at the far-right viewport edge (2026-03-05)

## Content & Curriculum
1. [ ] Course content management system
2. [ ] Multiple subject categories (Math, Science, Logic, etc.)
3. [ ] Difficulty levels
4. [ ] Prerequisites and learning paths

## Gamification
1. [x] Achievement system with badges — achievement definitions + user_achievements table; AchievementWallScreen; pinned achievements on Profile (2026-03-05)
2. [ ] Leaderboards
3. [x] XP and leveling system — xp_transactions; complete_lesson_and_award_xp RPC; XP heatmap (2026-03-05)
4. [x] Daily/weekly challenges — DailyTaskService; daily tasks card on Home (2026-03-05)
5. [x] Streak rewards — streak computed from xp_transactions positive days; streak stat on Profile (2026-03-05)
6. [ ] XP heatmap prompt — add getDailyXpHistory query to heatmap widget (design prompt ready)

## Social
1. [ ] User profiles
2. [ ] Friends and following
3. [ ] Course discussions
4. [ ] Share progress on social media

## Database
1. [ ] Parent mode
2. [x] Seed test user accounts — `20260218000002_seed_data.sql` with 5 subjects, 8 courses, 10 chapters, 19 lessons (2026-02-18)

## Quality
1. [ ] Unit tests expansion
2. [ ] Widget tests
3. [ ] Integration tests
4. [ ] Performance optimization
5. [ ] Error tracking and reporting
6. [ ] Accessibility improvements
