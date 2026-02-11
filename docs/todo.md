# TODO

## All
1. [ ] Unify UI style
2. [ ] Multilingual support

## Builder
1. [x] Enable Markdown rendering for text blocks — MarkdownBody in canvas, format toggle in property panel (2026-02-11)
2. [ ] Update course prompt to match the new flow
3. [x] Build course management system with sub-courses — Dashboard with Course Manage tab (2026-02-09)
4. [x] Build home page: support common features (Profile, achievements, etc.) — Dashboard Home Page with Course Data, Income, Comments (2026-02-09)
5. [x] Add basic categories to the module panel (physics, chemistry, biology, math, programming, general) — Module panel now has General/Physical/Chemical expandable categories with search (2026-02-09)
6. [~] Add more question types — True/False done (2026-02-11), Matching UX enhanced (2026-02-12); remaining: animation, etc.
7. [ ] Add multi-user collaboration
8. [x] Landing page with sign-in modal and Supabase auth integration (2026-02-09)
9. [x] Builder UI redesign — rounded card panels, pill-shaped buttons, simplified empty states (2026-02-09)
10. [x] Create test users in Supabase for sign-in testing
11. [x] Wire up Dashboard to real Supabase course data (2026-02-10)
12. [ ] Use Google sign-in (OAuth callback handling and session recovery)
13. [ ] Import workflow refinement
14. [ ] Block reorder/insert refinement
15. [~] More block types — True/False added (2026-02-11); remaining: animation, connect, etc.
18. [x] Builder Preview button: phone-mockup viewer with interactive question blocks, visibilityRule gating, page navigation (2026-02-12)
19. [x] Dashboard HomePage wired to backend — fans/likes/shares from DB, comments with count rules, income with fallback (2026-02-11)
20. [x] Create Course modal with DB persistence — name input, validation, error feedback, auto-refresh list (2026-02-11)
21. [x] Create Course stays on Course Manage — lightweight `createCourseRow()`, no auto-navigate to Builder, new courses show only "Add lesson", Builder title save syncs back (2026-02-11)
22. [x] Prevent Preview round-trip data loss for unsaved Builder edits — per-course browser draft auto-save/restore on `/builder?courseId=<id>`, clear draft after cloud Save (2026-02-12)
23. [x] MultipleChoice multi-select authoring + unordered validation — add `correctAnswers`, single/multi mode toggle, and exact set matching in Preview (2026-02-12)
24. [x] Block reorder/insert refinement — insertion indicator, edge auto-scroll, and larger drag handle hitbox in Builder canvas (2026-02-12)
25. [x] Matching block UX improvements — color-coded pairs, numbered badges, shuffle, tap-to-unpair, export validation, unit tests (2026-02-12)
16. [ ] Robust schema validation
17. [ ] Provide region-specific sign-in methods (Lowest priority; Apple Developer Program membership required)

## Viewer
1. [ ] Build learning home page: support common features (Profile, achievements, etc.)
2. [ ] Introduce social/friend features
3. [ ] Generate records after course completion
4. [ ] In a lesson, show current progress in the top bar after each block; do not write to the DB until the entire lesson is completed
5. [ ] RESTful API integration
6. [ ] User authentication with JWT
7. [ ] Cloud data synchronization
8. [ ] Real-time progress updates
9. [ ] Offline mode with content caching

## Content & Curriculum
1. [ ] Course content management system
2. [ ] Multiple subject categories (Math, Science, Logic, etc.)
3. [ ] Difficulty levels
4. [ ] Prerequisites and learning paths

## Gamification
1. [ ] Achievement system with badges
2. [ ] Leaderboards
3. [ ] XP and leveling system
4. [ ] Daily/weekly challenges
5. [ ] Streak rewards

## Social
1. [ ] User profiles
2. [ ] Friends and following
3. [ ] Course discussions
4. [ ] Share progress on social media

## Database
1. [ ] Parent mode
2. [ ] Seed test user accounts

## Quality
1. [ ] Unit tests expansion
2. [ ] Widget tests
3. [ ] Integration tests
4. [ ] Performance optimization
5. [ ] Error tracking and reporting
6. [ ] Accessibility improvements
