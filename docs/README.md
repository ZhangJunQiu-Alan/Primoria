# Primoria Documentation Index

Last updated: 2026-03-06

Primoria is a dual-app Flutter system:
- `Builder/`: course authoring (Flutter Web + Riverpod + GoRouter + Supabase)
- `Viewer/`: learning experience (Flutter + Provider + Supabase)

## Current Product Status

- Builder auth + role-gated dashboard is live (`author` / `admin` can access Builder pages).
- Builder supports AI-assisted course generation, save/publish, JSON import/export, and lesson-level editing.
- Dashboard has 4 tabs:
  - Home: redesigned
  - Course Manage: redesigned creator workspace (core production flows preserved)
  - Data Center: redesigned
  - Fans Management: redesigned
- Viewer supports course discovery, enrollment, lesson learning, profile settings, XP/streak/achievements, and markdown lesson text rendering.

## Core Routes (Builder app)

- `/`: landing
- `/dashboard`: creator dashboard
- `/builder`: editor
- `/viewer`: builder-side preview viewer
- `/auth/callback`: OAuth callback

## Block Types (Canonical)

`text`, `image`, `code-block`, `code-playground`, `code-execution`, `function-flow`, `multiple-choice`, `fill-blank`, `true-false`, `matching`, `animation`, `video`

## Docs in This Folder

- `prd.md` / `prd-zh.md`: product requirements (current baseline)
- `database-schema.md` / `database-schema-zh.md`: effective Supabase schema and migration notes
- `course-json-guide.md` / `course-json-guide-zh.md`: canonical course JSON guide
- `dashboard.md` / `dashboard-zh.md`: dashboard architecture and tab behavior
- `test-checklist.md` / `test-checklist-zh.md`: regression checklist aligned with current repo
- `todo.md` / `todo-zh.md`: active backlog only
- `changelog.md`: recent releases and architecture-impacting changes
- `prompt.txt`: current prompt template for block planning

## Run & Validate

```bash
# Builder
cd Builder
flutter pub get
flutter analyze lib/features/dashboard
flutter test test/dashboard_course_manage_tab_test.dart
flutter test

# Viewer
cd ../Viewer
flutter pub get
flutter analyze
flutter test
```

## Notes

- Docs are intentionally synchronized to the current implementation state, not historical drafts.
- Historical context should be read from git history and commit logs.
