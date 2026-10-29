# Tutor course preparation

Main Tutor requests enter `request_course_intake`. Legacy `position_learning_goal`
uses the same Web gate. Agent emits a stateless signal; Web owns all writes.

Web checks the stated goal and bounded explicit learner facts with a fast-tier
structured call (25-second total deadline). Subject-specific experience, purpose
and an initial outcome each require quoted input evidence. A subject label or
education stage is insufficient. Missing background produces exactly three
questions with three to five options each. Already answered dimensions are
replaced by useful constraints or practice preferences. Invalid/unavailable
model output falls back to three localized questions, never an automatic build.

`POST /api/learning/intake` prepares or restores an owner-scoped record.
`PATCH /api/learning/intake` validates three choices and optional details, and
freezes the first successful submission. Owner, goal, graph and content language
determine preparation identity; its background snapshot stays fixed even if
profile extraction finishes later. The course identity also includes that
snapshot and the confirmed answers. Chat history preserves the
tool card so reloads restore the questionnaire.

`POST /api/learning/course` requires a ready owner-scoped `intakeId`. Missing,
foreign or unanswered preparation returns 409 before model work, course writes
or enqueue. Saved language overrides client language. Sufficient explicit
background proceeds directly through the same durable record and build gate.

Purpose/target answers refine the KG query. Confirmed answers reach the lesson
Planner as untrusted data shaping scaffolding, examples and practice. They never
grant mastery, remove prerequisites, enter image briefs, or become permanent
profile facts. A preparation digest extends course scope identity: retries reuse
the course; different backgrounds, languages or answers do not reuse an
incompatible outline. Existing courses and onboarding/material entry points keep
their existing lifecycles; this gate applies to the main Tutor learning-course
API. Streamed partial tool arguments never start intake requests: the card waits
for the tool signal to complete.

## Language

Interface Language selects chrome, including buttons. Learning Content Language
controls Tutor prose, questions/options and the saved course language. Priority:
explicit request in the current user message, fixed content preference, actual
user text in auto mode, previous meaningful user text for numeric replies, then
English fallback. Hidden profile blocks and assistant/tool messages do not select
language. Web overwrites run state server-side; Agent appends the resolved rule
after teaching-style examples, including for concept subagents.

## Validation and release

`course-intake.spec.ts`, `course-intake-form.spec.ts`, and
`course-route-freeform.spec.ts` cover readiness, choices, submission, language and
the API gate. `course-intake.db.spec.ts` joins isolated DB regression for owner
isolation, persistence, first-submission semantics and no mastery writes. Tutor
browser smoke covers three option questions, reload recovery, no early course,
confirmed build, English actions and reuse on reload. It uses a scripted model
and a fixed KG positioning response; it does not validate real-model question
quality or positioning accuracy.

2026-10-29 real-provider spot check: five Tutor graph runs covered all three
styles with an English goal, Chinese auto language, and Chinese input with a
server-resolved English preference. All chose `request_course_intake` and used
the resolved visible language. Three assessment calls covered English/Chinese
vague Python goals and an explicit novice/work/CSV outcome; all returned valid
localized questions and the expected readiness. These are bounded spot checks,
not a guarantee over all subjects or model responses. Local evidence is kept in
`.private/course-intake-20261029/real-agent.json` and `real-intake.json`.

Deployment requires Drizzle migration `0062_course_intakes`. Local validation
does not apply that migration to production.
