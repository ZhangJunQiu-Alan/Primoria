# Onboarding Tutor Visual and Home Entry Work Report

Date: 2026-06-29

## Background

This round focused on the new-user Onboarding preview flow:

- Step 3, "Choose how the tutor should think with you", needs persona-specific illustrations.
- The illustration on the right should change when the user switches between Socratic, Feynman, and Euclid tutor styles.
- Temporary image assets originally placed under `temple/img` should be removed after being integrated into the web app.
- When all Onboarding steps are skipped, the completion state should offer a clear entry point instead of leaving only "Restart preview".

## Completed Changes

### 1. Tutor-style illustration switching

Updated `apps/web/src/components/onboarding/onboarding-client.tsx` so the Step 3 visual image is no longer fixed.

The three tutor styles now map to dedicated WebP illustrations:

- Socratic -> `/onboarding/tutors/socratic.webp`
- Feynman -> `/onboarding/tutors/feynman.webp`
- Euclid -> `/onboarding/tutors/euclid.webp`

When the user clicks a different tutor style option, the selected style state updates and the right-side illustration changes with it.

### 2. Static asset migration

Moved the three temporary persona images from `temple/img` into the app's public static asset directory:

- `apps/web/public/onboarding/tutors/socratic.webp`
- `apps/web/public/onboarding/tutors/feynman.webp`
- `apps/web/public/onboarding/tutors/euclid.webp`

The temporary `temple/img` directory has been removed.

### 3. Completion-page entry action

Updated the final Onboarding completion state:

- If a course exists, the primary action opens the generated course outline.
- If no course exists because the learning goal was skipped, the primary action displays `Enter homepage` and points to `/`.
- In debug mode, `Restart preview` remains as a secondary action for preview iteration.

### 4. Mobile completion layout adjustment

Adjusted `apps/web/src/app/globals.css` so the completion page has a dedicated mobile layout class.

This avoids using the same large control-region height as the three question steps and keeps the completion actions visible on narrow screens.

## Important Product Note

The current `Enter homepage` target is `/`.

In the real app this is correct, but in `/dev/onboarding` it can look like the click has no effect because `/dev/onboarding` is a mock/debug flow:

- Debug skip actions do not persist real learner onboarding state.
- `/` runs the real homepage gate.
- If auth is enabled and the user is not logged in, `/` redirects to login.
- If the user is logged in but real onboarding is incomplete, `/` can render onboarding again.

Recommended follow-up:

Create a dedicated debug homepage route such as `/dev/home`, then make debug-mode completion use `/dev/home` while production completion continues to use `/`.

## Verification

Completed checks:

- `git diff --check` for the touched onboarding component and CSS.
- `tsc --noEmit -p apps/web/tsconfig.json --pretty false`.
- `tsx apps/web/tests/onboarding-static.unit.ts`.
- Confirmed the three WebP assets are served from `/onboarding/tutors/*`.

## Current Touched Files

- `apps/web/src/components/onboarding/onboarding-client.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/public/onboarding/tutors/socratic.webp`
- `apps/web/public/onboarding/tutors/feynman.webp`
- `apps/web/public/onboarding/tutors/euclid.webp`
