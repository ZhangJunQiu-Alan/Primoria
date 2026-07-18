# Background Facts Intake

Status: implemented product contract, July 2026.

## Product flow

Onboarding step two is a skippable 2–2000 character self-introduction. Continue
waits only for a durable database enqueue, then moves directly to Tutor Style.
There is no model preview, fact editing, or confirmation in onboarding. Settings
provides the same direct-write intake and refreshes the editable Facts list when
the job finishes.

`POST /api/onboarding/facts` owns onboarding submission/skip.
`POST /api/learner-facts/intake` enqueues Settings text; its owner-scoped `GET`
reports job status. A learner has at most one queued/running profile intake.

## Queue and retention

`profile_fact_intake_jobs` is separate from lesson `extractor_jobs`. The shared
Extractor Worker claims profile intake first and uses the same lease, heartbeat,
fencing, two-attempt retry, and stale-recovery pattern. A job temporarily stores
`source_text`; completion, cancellation, stale recovery, and permanent failure
clear it. Logs contain IDs, status, duration, and result counts, never source or
model text.

Onboarding mirrors `pending | completed | skipped | failed` plus job/message/
timestamp state into `learner_profiles`. Goal positioning and a terminal intake
state are the readiness gate for first-course preparation. Pending intake never
blocks onboarding completion or workspace entry.

## Extraction contract

The extractor emits at most eight independently validated `save` or `ignore`
decisions. A saved fact must be 2–240 characters, use an exact source quote,
have confidence at least 0.8, pass injection filtering, and use one persisted
category:

- `preference`
- `prior_knowledge`
- `learning_gap`
- `interest`
- `goal`
- `profile_context`

`ignore` is a decision, not a stored category. Durable learning-relevant input
without a safe teaching category uses `profile_context`; temporary, irrelevant,
unsupported, unsafe, and ambiguous content is ignored. Dismissed tombstones are
never automatically restored and active duplicates are not inserted again.

Evidence records `onboarding_intake` or `settings_intake`, the job ID, and the
exact source quote. `knowledgeBackground` is updated only from an explicit
education-stage quote; course names such as CS61A/CS61B are not degree evidence.

## Consumption boundary

Planner/Tutor context prioritizes `learning_gap`, `prior_knowledge`, then
`preference`; at most two `interest` facts follow. `goal` and `profile_context`
remain profile-only. Intake facts are self-report context: they never write
`user_concept_mastery`, skip KG concepts, or expand course coverage.
