# Primoria Product Architecture

Status: current implementation architecture, code checked 2026-10-25.

Primoria is a Postgres-first personal adaptive-learning product deployed as a
modular monolith plus. This document describes implemented runtime boundaries.
Unapproved classroom, marketplace, Goal Space, and cross-user learning ideas
live under `docs/vision/` and are not current capabilities.
For user-facing entry points and code evidence, see
[`product/feature-inventory.md`](product/feature-inventory.md).

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
learning goal (or uploaded materials)
→ canonical KG, goal-scoped subgraph, governed generated/hybrid graph,
  or owner-private material graph (mat_*)
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

The runtime topic-graph registry currently contains 31 source-derived graphs,
all source-approved: the original 21 since 2026-07 and the 10 China/Singapore
secondary and H2 graphs since the 2026-10-25 owner review.
Governance evidence under `data/knowledge-graphs/{governance,curricula,pedagogy}`
stays separate from the runtime artifact registry, and current build/import
code does not automatically enforce a review-status publication gate. See
`docs/knowledge-graph/catalog.md` for the exact inventory and status split.
Cold-start anchoring is restricted to approved graphs by default
(`PRIMORIA_REQUIRE_APPROVED_KG=0` opts out): approved graphs are selected when
available, while direct lookups/existing courses remain resolvable. The helper preserves the full
registry if filtering would otherwise leave no candidates.

Lesson titles and descriptions start as deterministic templates. One
best-effort background enrichment call may rewrite them behind an equality
fence; generation failure keeps the templates.

Courses built from uploaded materials use owner-private `mat_*` graphs stored
in `material_topic_graphs`; every concept cites the material chunks it is taught
from, and lesson generation injects those excerpts into Planner/Writer prompts.
`apps/web/src/lib/courses/course-graph.ts` is the single resolver from a course
`graphId` to its TopicGraph (library, `gen_*`, or owner-only `mat_*`) for lesson
generation, the lesson reader, and the learning-progress and Extractor workers.
The course-rail Tutor in a material course receives Web-retrieved material
excerpts (BM25 + pgvector + current-lesson prior, fused) as hidden context; the
Agent itself never reads material rows. See `docs/product/learning-materials.md`.

Subject folders add a durable per-lecture KG queue to the Extractor worker.
Lecture subgraphs are merged in lecture order into the folder's owner-private
graph; one folder course can sync newly added concepts, and graph rebuilds
reconcile its remaining planned lessons. Grounded folder quizzes use a reusable
question bank and rolling first-attempt mastery. These folder operations and
course-rail retrieval remain Web-owned.

## 4. Learner state boundaries

Mastery, learner facts, and progression share trusted learning events but answer
different questions:

| State | Meaning | Write authority |
| --- | --- | --- |
| `user_concept_mastery` (`generated_concept_mastery` for generated `gen_*` and owner-private `mat_*` graphs) | Demonstrated concept competence | Rule-based learning-progress worker; subject-folder quiz submit (rolling first-attempt window) |
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
implemented Catalog component
→ specialized structured renderer
→ plan_visualization + widgetRenderer sandbox fallback
```

For one of the 49 implemented catalog components, the model calls
`open_interactive_component`. The browser then calls the authenticated Web API,
which generates and validates a full config or minimal adjustment patch. Config
state remains browser/Web-owned; the Agent only emits the stateless signal.
Above 40 entries, the Agent uses a discipline directory and bounded read-only
`search_interactive_components` retrieval before selecting a component. Instances
persist per owner with revision checks; course VisualBlocks use the same
versioned components. Catalog implementation is separate from reference-site
coverage and human acceptance.

Sandbox widgets execute in an iframe with dependency allowlisting, theme and SVG
helpers, resize/prompt bridges, and deferred script execution. External library
URLs are single-sourced in `packages/contracts`.

## 7. Durable workers and health

Three Web worker processes consume Postgres queues:

- `worker:lesson-generation` materializes planned lessons;
- `worker:learning-progress` projects mastery and next-step recommendations;
- `worker:extractor` prioritizes profile Facts Intake, then per-lecture material
  KG jobs, then lesson extractor jobs.

Jobs use leases, heartbeats, fencing, idempotent completion, bounded retry, and
stale recovery. `/api/health` reports DB/KG/embedding state plus queue counts,
oldest-job age, expired leases, and worker heartbeat state. A queue past the
configured stall threshold degrades readiness.
`/api/health` and `/api/health/ready` additionally require Agent readiness and
return 503 unless KG/DB health, queues/workers, and Agent are all healthy.
`/api/health/live` is the separate liveness route.

## 8. Persistence and deployment

Drizzle owns App/Auth/Course schema, versioned Web SQL owns KG/pgvector, and
`apps/agent/db/migrations` owns `agent_runtime`. `pnpm db:bootstrap` applies all
three owners idempotently; KG content and embeddings are imported separately.

The selected database is managed Supabase PostgreSQL; use
`docker-compose.supabase.yml` and [the managed deployment runbook](supabase-deployment.md).
Application services remain server-hosted and authentication remains Web-owned.
Lesson image bytes use the private Supabase Storage `lesson-media` bucket when
configured, served through Web's media API; unconfigured local/isolated setups
can keep bytes in PostgreSQL. Browser clients never receive the Storage secret.
The following self-hosted topology is an alternative.

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
