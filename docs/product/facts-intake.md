# Background Facts Intake

Status: implemented product contract, July 2026.

## Product flow

Onboarding step two requires a learning stage and curriculum and keeps the
2–2000 character self-introduction optional. The curriculum is an inline badge
beside the stage question, not a separate detection card. Stage plus region may
display a curriculum only when one candidate remains; multiple candidates stay
unselected and open a compact choice list. Region/IP is not saved, and Continue
is the only confirmation boundary. The page then moves directly to the existing
Tutor Style step. Settings provides the same direct-write text intake and
refreshes the editable Facts list when the job finishes.

`POST /api/onboarding/facts` owns structured education confirmation and optional
onboarding text submission/skip.
`POST /api/learner-facts/intake` enqueues Settings text; its owner-scoped `GET`
reports job status. A learner has at most one queued/running profile intake.

## Queue and retention

`profile_fact_intake_jobs` is separate from lesson `extractor_jobs`. The shared
Extractor Worker claims profile intake first and uses the same lease, heartbeat,
fencing, two-attempt retry, and stale-recovery pattern. A job temporarily stores
`source_text`; completion, cancellation, stale recovery, and permanent failure
clear it. Logs contain IDs, status, duration, and result counts, never source or
model text.

`learner_profiles` stores `education_stage`, `curriculum_system`,
`education_context_source`, and `education_context_confirmed_at`. It also
mirrors `pending | completed | skipped | failed` plus job/message/timestamp
state. Goal positioning and a terminal intake
state are the readiness gate for first-course preparation. Pending intake never
blocks onboarding completion or workspace entry. If the goal is waiting on a
curriculum-system choice, the readiness gate re-positions it from confirmed
structured context before consulting explicit Facts; the write succeeds only
while that same goal is still current.

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
exact source quote. `knowledgeBackground` supports `middle_school`,
`high_school`, `undergraduate`, and `graduate`; free text updates it only from an
explicit education-stage quote. Course names such as CS61A/CS61B are not degree evidence.
An explicitly stated curriculum, examination system, or study jurisdiction is
preserved as `profile_context`; UI language, timezone, and IP location are not
extraction evidence.

## Consumption boundary

Planner/Tutor context prioritizes `learning_gap`, `prior_knowledge`, then
`preference`; at most two `interest` facts follow. `goal` and `profile_context`
remain profile-only. Intake facts are self-report context: they never write
`user_concept_mastery`, skip KG concepts, or expand course coverage.
The routing gate uses the confirmed structured curriculum first. For migrated
profiles without that confirmation, only active `profile_context` or
`prior_knowledge` Facts are considered. Raw fact text is not sent into embedding
search or Stage 2, and unresolved or conflicting context returns clarification.
