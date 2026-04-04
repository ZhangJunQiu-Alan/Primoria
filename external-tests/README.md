# Primoria External User-Story Tests (Python)

This folder is a standalone Python test harness that validates Primoria user stories **without adding test files inside `packages/viewer-react/`, `packages/schema/`, or `supabase/` app code**.

## What it tests

1. US1: Social catalog includes `Basics of Psychology` as the second course.
2. US2: A learner can sign up and sign in.
3. US3: A signed-in learner can enroll in `Basics of Psychology` and read its lessons.

## Prerequisites

- Local Supabase is running (`http://127.0.0.1:54321`), for example:

```bash
cd /Users/sithuhein/Documents/GitHub/Primoria
./supabase/run_with_env.sh start
```

- `Basics of Psychology` migration has been applied.

## Setup

```bash
cd /Users/sithuhein/Documents/GitHub/Primoria/external-tests
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Update `.env` if needed (usually only `PROJECT_ROOT`).

## Run tests

```bash
pytest -q
```

Run one story only:

```bash
pytest -q tests/test_us1_social_catalog.py
pytest -q tests/test_us2_auth_signup_login.py
pytest -q tests/test_us3_enroll_and_lessons.py
```

## Notes

- This suite is black-box API-level E2E against Supabase REST/Auth endpoints.
- It does not require changes in app source files.
- Temporary test users are created with random emails.
