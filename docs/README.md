# Primoria Documentation Index

Last updated: 2026-04-04

Primoria currently ships as a React + Supabase product:
- `packages/schema/`: canonical shared course schema, fixtures, and migration helpers
- `packages/viewer-react/`: unified Viewer app for learner flows and Builder workspace (React 19 + TypeScript + React Router + React Query + Redux Toolkit + Supabase)
- `supabase/`: backend schema, RLS, RPCs, and Edge Functions

## Deployment

- Viewer React preview workflow: `.github/workflows/viewer-react-preview.yml`
- Viewer React production workflow: `.github/workflows/viewer-react-production.yml`
- Viewer React CI workflow: `.github/workflows/viewer-react-ci.yml`

## Current Product Status

- Viewer is the only supported frontend app and includes landing, auth, home, library, lesson runtime, community, AI Tutor, profile, settings, achievements, parent dashboard, Builder dashboard, and Builder editor flows.
- Builder workspace supports dashboard, editor, manual save/publish, JSON import/export, course duplication, and schema-backed validation.
- Builder canvas supports inline editing for `text`, `code-block`, and `code-playground`, plus Supabase-backed image uploads.
- Block visibility supports gated reveal (`afterPreviousCorrect`) with first-block safety defaults.
- In-editor learner preview follows the learner runtime flow: page progress, gated reveal, and `Prev / Check / Next` navigation inside a centered lesson stage.

## Core Routes

Viewer React:
- `/`
- `/login`
- `/register`
- `/auth/callback`
- `/home`
- `/library`
- `/community`
- `/ai-tutor`
- `/profile`
- `/settings`
- `/achievements`
- `/parent`
- `/builder/dashboard`
- `/builder/editor`
- `/builder/editor/:courseId`

## Block Types (Canonical)

`text`, `image`, `code-block`, `code-playground`, `code-execution`, `function-flow`, `multiple-choice`, `fill-blank`, `true-false`, `matching`, `interactive-visual`, `video`

## Docs in This Folder

- `prd.md` / `prd-zh.md`: product requirements baseline
- `database-schema.md` / `database-schema-zh.md`: effective Supabase schema and migration notes
- `course-json-guide.md` / `course-json-guide-zh.md`: canonical course JSON guide
- `dashboard.md` / `dashboard-zh.md`: unified Viewer Builder dashboard architecture and tab behavior
- `test-checklist.md` / `test-checklist-zh.md`: current regression checklist
- `todo.md` / `todo-zh.md`: active backlog only
- `changelog.md`: release and architecture-impacting changes
- `viewer-react-cutover-runbook.md`: current viewer deployment and recovery notes
- `prompt.txt`: current AI planning prompt

## Run & Validate

```bash
pnpm install

# Shared schema
pnpm --filter @primoria/schema exec vitest run test/blocks.test.ts test/migrations.test.ts

# Viewer React (including Builder workspace)
pnpm --filter @primoria/viewer-react typecheck
pnpm --filter @primoria/viewer-react test
pnpm --filter @primoria/viewer-react build
```

## Notes

- Docs are maintained against the current implementation, not historical architecture.
