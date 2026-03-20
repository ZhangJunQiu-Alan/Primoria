# Primoria Documentation Index

Last updated: 2026-03-20

Primoria currently ships as a mixed-stack product:
- `packages/builder/`: creator-facing Builder (React 19 + TypeScript + Redux Toolkit + React Router + Supabase)
- `packages/schema/`: canonical shared course schema, fixtures, and migration helpers
- `Viewer/`: learner-facing app (Flutter + Provider + Supabase)

## Deployment

- Viewer is deployed to **[primoria.dpdns.org](https://primoria.dpdns.org)** via GitHub Pages (`.github/workflows/deploy-viewer.yml`).
  Triggered automatically on push to `Viewer/**` on `main`.

## Current Product Status

- Builder supports auth, dashboard, editor, manual save/publish, JSON import/export, course duplication, and schema-backed validation.
- Builder canvas supports inline editing for `text`, `code-block`, and `code-playground`, plus Supabase-backed image uploads.
- Block visibility now supports gated reveal (`afterPreviousCorrect`) with first-block safety defaults.
- In-editor learner preview now follows the Flutter viewer flow more closely: page progress, gated reveal, and `Prev / Check / Next` navigation inside a centered lesson stage.
- Dashboard currently has 4 tabs:
  - Home
  - Course Management
  - Data Center
  - Fan Management
- Viewer remains the learner-facing Flutter app with landing, auth, course discovery, lesson playback, profile, and settings flows.

## Core Routes (React Builder)

- `/`: landing
- `/dashboard`: creator dashboard
- `/editor`: blank-course editor entry
- `/editor/:courseId`: course editor
- `/auth/callback`: OAuth callback

## Block Types (Canonical)

`text`, `image`, `code-block`, `code-playground`, `code-execution`, `function-flow`, `multiple-choice`, `fill-blank`, `true-false`, `matching`, `interactive-visual`, `video`

## Docs in This Folder

- `prd.md` / `prd-zh.md`: product requirements baseline
- `database-schema.md` / `database-schema-zh.md`: effective Supabase schema and migration notes
- `course-json-guide.md` / `course-json-guide-zh.md`: canonical course JSON guide
- `dashboard.md` / `dashboard-zh.md`: React dashboard architecture and tab behavior
- `test-checklist.md` / `test-checklist-zh.md`: current regression checklist
- `todo.md` / `todo-zh.md`: active backlog only
- `changelog.md`: release and architecture-impacting changes
- `prompt.txt`: current AI planning prompt

## Run & Validate

```bash
pnpm install

# Shared schema
pnpm --filter @primoria/schema exec vitest run test/blocks.test.ts test/migrations.test.ts

# React Builder
pnpm --filter @primoria/builder typecheck
pnpm --filter @primoria/builder test

# Viewer
cd Viewer
flutter pub get
flutter analyze
flutter test test/viewer_layout_metrics_test.dart test/viewer_page_shell_test.dart
flutter test
```

## Notes

- Docs are maintained against the current implementation, not historical architecture.
