# Viewer React Operations Runbook

Updated: 2026-04-04

## Purpose

This runbook describes how to deploy, verify, and recover the current unified React frontend. Viewer is the only supported app in the repository and now includes the Builder workspace.

## Scope

- React frontend package: `packages/viewer-react`
- Builder workspace routes inside Viewer:
  - `/builder/dashboard`
  - `/builder/editor`
  - `/builder/editor/:courseId`
- Viewer backend: `supabase/functions/viewer-ai-tutor`
- Viewer push backend:
  - `supabase/functions/viewer-push-subscribe`
  - `supabase/functions/viewer-push-unsubscribe`
  - `supabase/functions/viewer-push-dispatch`
- Viewer-related migrations in `supabase/migrations/`

## Required Environment

Frontend runtime:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional frontend values:
- `VITE_GEMINI_MODEL`
- `VITE_VIEWER_DEMO_MODE`
- `VITE_GEMINI_API_KEY`
- `VITE_SENTRY_DSN`
- `VITE_POSTHOG_KEY`
- `VITE_POSTHOG_HOST`
- `VITE_VIEWER_RELEASE`
- `VITE_VIEWER_REACT_ENABLED`
- `VITE_VIEWER_AI_TUTOR_ENABLED`
- `VITE_VIEWER_COMMUNITY_ENABLED`

Supabase secrets:
- `GEMINI_API_KEY`

## Release Artifacts

- `viewer-react-ci.yml`
  - Runs `typecheck`, `test`, and fixture-mode `build`.
- `viewer-react-preview.yml`
  - Builds, enforces bundle budgets, deploys a Cloudflare Pages preview when secrets are present, and runs preview smoke checks.
- `viewer-react-production.yml`
  - Builds, enforces bundle budgets, deploys the Cloudflare Pages production artifact, and runs post-deploy smoke.

## Latest Smoke Snapshot

Cloud smoke passed on 2026-03-31 against Supabase project `rygafvlzzkvqhhenajzi`.

Command:

```bash
pnpm --filter @primoria/viewer-react smoke:cloud
```

Successful coverage included:
- learner login, library, enroll, lesson completion, and result page
- settings persistence
- community note persistence
- AI Tutor reply and tool modals
- binding-code generation
- parent redirect and bind-by-code flow

## Deployment Steps

1. Apply the required database migrations.

```bash
supabase db push
```

2. Deploy the viewer edge functions that changed.

```bash
supabase functions deploy viewer-ai-tutor
supabase functions deploy viewer-push-subscribe
supabase functions deploy viewer-push-unsubscribe
supabase functions deploy viewer-push-dispatch
```

3. Confirm frontend environment variables for the target deploy.
   - There is no separate Builder frontend deploy or handoff environment anymore.

4. Build and deploy Viewer React through the preview or production workflow.
   - Cloudflare Pages config is tracked in `packages/viewer-react/wrangler.toml`.

## Smoke Checklist

Learner flow:
- Open `/`
- Sign in or register
- Reach `/home`
- Open library, filter/search, open a course
- Enroll and start a lesson
- Complete the lesson and verify the result page renders XP and unlocked achievements

Profile and settings:
- Open `/profile`
- Open `/settings`
- Save profile fields
- Change a viewer preference and refresh
- Generate a binding code

Parent flow:
- Sign in as a parent
- Confirm redirect to `/parent`
- Select a child and verify report refresh
- Bind or unbind a child if the environment allows it

Community and AI Tutor:
- Open `/community` and verify room/message/note persistence
- Open `/ai-tutor` and verify reply plus tool modals

Builder workspace:
- Open `/builder/dashboard`
- Create or open a course
- Enter `/builder/editor/:courseId`
- Verify save, draft recovery, and return navigation back to `/builder/dashboard`

## Recovery Steps

1. Stop the failing production rollout or disable the affected Viewer feature flag.
2. Record the failing flow, timestamps, and suspected scope.
3. Preserve applied database migrations unless a separate rollback is explicitly approved.
4. Fix forward on a new React viewer build and re-run preview smoke before another production release.

## Ownership

- Frontend owner: unified Viewer package and deployment target
- Backend owner: Supabase migrations, RLS, RPCs, and Edge Functions
- Release owner: deployment window, smoke checklist, and recovery decision
