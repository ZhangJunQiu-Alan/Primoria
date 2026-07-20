# Primoria Product Architecture

Status: current implementation architecture, July 2026.

Primoria is a Postgres-first personal adaptive-learning product deployed as a
modular monolith plus. This document describes implemented runtime boundaries.
Unapproved classroom, marketplace, Goal Space, and cross-user learning ideas
live under `docs/vision/` and are not current capabilities.

## 1. System boundary

```text
Browser
  ├─ Next.js UI and authenticated product APIs
  └─ CopilotKit Tutor surface
          │
          ▼
apps/web
  ├─ App/Auth/Course/KG policy and writes
  ├─ course positioning and generation
  ├─ learner state and progression
  └─ durable Postgres job queues
          │ internal AG-UI
          ▼
apps/agent
  ├─ primoria_tutor orchestration
  ├─ model and tool selection
  └─ agent_runtime runs/events/checkpoints
```

`apps/web` owns product business rules, transactions, and writes. `apps/agent`
owns Tutor orchestration and its isolated `agent_runtime` schema. The Agent has
one bounded owner-scoped course-card read; it does not write courses, mastery,
learner facts, progression, KG data, or interactive-component configs.

## 2. Active Tutor path

There is one production Tutor path:

```text
Browser CopilotKit
→ POST /api/copilotkit
→ PrimoriaHttpAgent
→ internal POST /agent
→ apps/agent/src/graph.mjs
```

The Agent runtime persists runs, streamed AG-UI events, leases, cancellation,
conservative retry state, and LangGraph checkpoints. Automatic replay stops once
user-visible or tool output has been persisted. Manual retry creates a new run
and preserves the original audit trail.

## 3. Personal adaptive-learning loop

```text
learning goal
→ canonical KG, goal-scoped subgraph, or governed generated/hybrid graph
→ mastery-aware concept frontier
→ planned course and lazy lesson generation
→ learner interaction and quiz evidence
→ mastery/progression/fact projections
→ explainable continue, review, or remediation decision
```

Course outlines are built from prerequisite-aware concept frontiers. A one-time
mastery snapshot skips only concepts already marked `mastered`; a mastery read
failure degrades to teaching all concepts. Remaining concepts are grouped into
lessons of two or three in authored topological order. Each lesson persists its
concept IDs and is materialized by a background worker when needed.

Post-lesson progression follows the persisted outline itself: it evaluates the
current lesson's concept IDs and targets the immediate next `sort_key` lesson,
including same-topic or cross-topic bundles. Recommendation acceptance and
target materialization are transactional. Course completion events and rewards
are emitted only after mastery projection chooses `course_complete`; remediation
never emits them.

Positioning treats a purpose-qualified subject as a scope-selection problem,
not as permission to reuse the whole graph. Goal-scoped anchors carry multiple
terminal concept ids and the original learning goal. Approved cross-subject
edges can select targets deterministically; hard-prerequisite closure then
supplies only required foundations. Partial single-graph coverage routes to a
generated/hybrid graph. Courses persist a stable scope identity, so two active
courses may share a source graph without sharing a curriculum. The canonical
policy is `docs/knowledge-graph/learning-goal-routing.md`.

Overlapping school subjects pass through a curriculum-system gate before
semantic routing. The current goal's explicit curriculum wins, followed by the
learner-confirmed structured onboarding curriculum, then an explicit active
learner fact; otherwise the Web returns curriculum-specific choices. Language,
timezone, IP location, and embedding similarity cannot commit a jurisdiction.
Region may only narrow uncommitted onboarding candidates. The Agent and browser
never receive raw Facts for this decision; Web derives only a bounded
curriculum system/region value.

The runtime topic-graph registry currently contains 31 source-derived graphs.
The original 21 source graphs are approved; 10 China/Singapore secondary and H2
graphs are registered while their source status remains `needs_review`.
Governance evidence under `data/knowledge-graphs/{governance,curricula,pedagogy}`
stays separate from the runtime artifact registry, and current build/import
code does not automatically enforce a review-status publication gate. See
`docs/knowledge-graph/catalog.md` for the exact inventory and status split.

Lesson titles and descriptions start as deterministic templates. One
best-effort background enrichment call may rewrite them behind an equality
fence; generation failure keeps the templates.

## 4. Learner state boundaries

Mastery, learner facts, and progression share trusted learning events but answer
different questions:

| State | Meaning | Write authority |
| --- | --- | --- |
| `user_concept_mastery` | Demonstrated concept competence | Rule-based learning-progress worker |
| `learner_facts` | Durable context that can improve teaching | Manual Settings writes or Extractor worker |
| `player_progress` and `xp_awards` | Verified effort and completion since progression start | Server-side idempotent reward rules |

A concept requires at least three concept-question results and 80% accuracy to
become mastered. Self-reported facts never write mastery or skip KG content. XP
never proves competence.

Facts use six persisted categories: `preference`, `prior_knowledge`,
`learning_gap`, `interest`, `goal`, and `profile_context`. Tutor/planner context
uses active teaching-relevant facts only; `interest` is lower priority and
capped at two, while `goal` and `profile_context` remain profile-only.

## 5. Onboarding and course readiness

Onboarding persists the learning goal/KG anchor, confirmed education stage and
curriculum, a skippable free-text Facts intake, and Tutor style. Step two shows
the curriculum as a compact inline badge: a single stage/region candidate is
displayed directly; multiple candidates remain unselected until the learner
chooses. Continue, not IP detection, is the persistence boundary.
`POST /api/onboarding/facts` writes the structured context synchronously and,
when optional text exists, enqueues a `profile_fact_intake_jobs` row before
advancing. The shared Extractor Worker writes supported facts in the background.

First-course preparation requires completed goal positioning and a terminal
Facts Intake state: `completed`, `skipped`, or `failed`. Pending intake does not
block onboarding completion or workspace entry. A shared readiness check plus
course uniqueness constraints removes ordering races among goal, intake, and
Tutor-style completion. When an initial goal is waiting on curriculum
clarification, the readiness check re-positions it from confirmed structured
context first, then explicit Facts as a compatibility fallback, and commits the
anchor only if the same goal is still current.

## 6. Visualization routing

Visualization is catalog-first:

```text
reviewed Catalog component
→ specialized structured renderer
→ plan_visualization + widgetRenderer sandbox fallback
```

For one of the 19 reviewed components, the model calls
`open_interactive_component`. The browser then calls the authenticated Web API,
which generates and validates a full config or minimal adjustment patch. Config
state remains browser/Web-owned; the Agent only emits the stateless signal.

Sandbox widgets execute in an iframe with dependency allowlisting, theme and SVG
helpers, resize/prompt bridges, and deferred script execution. External library
URLs are single-sourced in `packages/contracts`.

## 7. Durable workers and health

Three Web worker processes consume Postgres queues:

- `worker:lesson-generation` materializes planned lessons;
- `worker:learning-progress` projects mastery and next-step recommendations;
- `worker:extractor` prioritizes profile Facts Intake, then consumes lesson
  extractor jobs.

Jobs use leases, heartbeats, fencing, idempotent completion, bounded retry, and
stale recovery. `/api/health` reports DB/KG/embedding state plus queue counts,
oldest-job age, expired leases, and worker heartbeat state. A queue past the
configured stall threshold degrades readiness.

## 8. Persistence and deployment

Drizzle owns App/Auth/Course schema, versioned Web SQL owns KG/pgvector, and
`apps/agent/db/migrations` owns `agent_runtime`. `pnpm db:bootstrap` applies all
three owners idempotently; KG content and embeddings are imported separately.

Production is a single-server Docker Compose stack containing PostgreSQL,
one-shot migration jobs, Web, Agent, three workers, and Caddy. Only Caddy is
public. `agent-migrate` initializes the LangGraph checkpoint schema before Agent
startup. Runtime services use restricted database credentials, non-root
containers, read-only filesystems, and dropped capabilities.

## 9. Current priorities

- improve evidence-backed remediation and resume decisions;
- measure whether learner-fact retrieval changes teaching quality;
- strengthen provider timeout/failover and operational metrics;
- use visualization telemetry to deepen high-value components;
- add spaced-repetition scheduling only after its evidence and UX contracts are
  defined.

Future classroom, user-created Agent, marketplace, Goal Space, and cross-user
system-memory directions are isolated in:

- [`vision/multi-agent-classroom.md`](vision/multi-agent-classroom.md)
- [`vision/memory-and-goal-space.md`](vision/memory-and-goal-space.md)
