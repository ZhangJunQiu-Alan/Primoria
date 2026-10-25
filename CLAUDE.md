# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install deps
pnpm install

# Start web, self-hosted Agent runtime, and background workers
pnpm dev

# Web app only; AI Tutor still needs PRIMORIA_AGENT_URL to reach a running agent
pnpm --filter @primoria/web dev

# Type-check
pnpm --filter @primoria/web typecheck

# Lint
pnpm lint

# Build
pnpm build

# Production dependency audit; fails on high/critical advisories
pnpm audit:prod

# Bootstrap KG, Drizzle App/Auth/Course, and Agent runtime schemas
pnpm db:bootstrap

# Generate Drizzle migrations after App/Auth/Course schema changes
pnpm --filter @primoria/web db:generate
pnpm --filter @primoria/web db:migrate

# First-time full KG data + embedding import
pnpm db:initialize:kg

# KG source/governance validation and review-pack regeneration
pnpm --filter @primoria/web validate:kg
pnpm --filter @primoria/web build:curriculum-review-packs
pnpm --filter @primoria/web build:core-pedagogy

# One-time local data import into a DB account
pnpm --filter @primoria/web import:local-data <email>
```

### Tests (Vitest)

```bash
# All unit tests (vitest; legacy tests/*.unit.ts scripts run via the
# tests/legacy-units.spec.ts bridge as tsx child processes)
pnpm --filter @primoria/web test

# Watch mode
pnpm --filter @primoria/web test:watch

# DB-backed tests (need DATABASE_URL; not part of `pnpm test`)
pnpm --filter @primoria/web test:lesson-jobs:db

# E2E (requires running app; not part of `pnpm test`)
node apps/web/tests/widget-renderer.e2e.mjs

# Catalog and stage-1 routing regression
pnpm catalog:validate
pnpm --filter @primoria/web test:interactive-routing
pnpm --filter @primoria/web eval:interactive-routing  # calls configured real model

# Permanent learning-goal routing and deterministic course-scope regression
pnpm test:learning-goal-routing
pnpm eval:learning-goal-routing --case=<case-id>  # calls configured real model

# Verify agent graph syntax
node --check apps/agent/src/graph.mjs

# Agent tests (offline; graph-e2e invokes the real graph against a local fake LLM)
pnpm --filter @primoria/agent test:context-trim
pnpm --filter @primoria/agent test:graph-e2e
```

Write new Web tests as native Vitest `tests/*.spec.ts` files; do not add new self-executing Web `*.unit.ts` scripts. Agent tests remain plain ESM under `apps/agent/tests/` and run through package scripts. CI (`.github/workflows/ci.yml`) runs typecheck, lint, and unit tests on every PR.

## Architecture

### Monorepo layout

```
apps/web/     Next.js app — UI, API routes, DB, CopilotKit integration
apps/agent/   Self-hosted Node/AG-UI runtime for the primoria_tutor graph
packages/contracts/  Cross-runtime artifacts, tool schemas, dependency and interactive catalogs
data/knowledge-graphs/source/  Committed KG source JSON files and sidecars
data/knowledge-graphs/generated/  Exported generated graph candidates awaiting review/promotion
data/knowledge-graphs/governance/  Provenance, license, stable-ID, review, and decision records
data/knowledge-graphs/curricula/  Official frameworks plus pending mappings, gaps, and resolutions
data/knowledge-graphs/pedagogy/  Reviewable diagnostic, teaching-strategy, and assessment knowledge
data/visualization-components/  Versioned all-subject catalog and JSON Schema
```

### AI Tutor path

There is one active tutor runtime path:

Browser CopilotKit UI → `apps/web/src/app/api/copilotkit/route.ts` → `PrimoriaHttpAgent` → internal AG-UI `POST /agent` → `apps/agent/src/graph.mjs`.

The legacy `POST /api/tutor/chat` stack has been deleted. If you find references to it in older docs, they are stale.

The Agent runtime persists AG-UI events, run state, leases, cancellation, retry metadata, and LangGraph checkpoints in PostgreSQL's isolated `agent_runtime` schema. Automatic retry is allowed only before user-visible/tool output. Interrupted runs with persisted output fail explicitly to avoid replaying side effects. Manual retry creates a new run ID and preserves the original audit trail.

### Knowledge graph catalog and governance

The runtime topic-graph registry currently contains 31 source-derived graphs,
all source-approved: the original 21 since 2026-07 and the 10 China/Singapore
secondary and H2 graphs (with their curricula and pedagogy records) since the
2026-10-25 owner review (`data/knowledge-graphs/review/approved/cn-sg-2026-10/`).
Runtime registration, DB import, source approval, curriculum mapping approval,
and pedagogy approval are separate states; current build and import scripts do
not automatically enforce a review-status gate. Pre-approval migration scripts
refuse to overwrite approved files (`apps/web/scripts/kg-approval-guard.mjs`);
change approved content through a new review record. Cold-start goal routing
anchors only to approved graphs by default (`PRIMORIA_REQUIRE_APPROVED_KG=0`
opts out). Canonical inventory: `docs/knowledge-graph/catalog.md`.

The permanent learning-goal fixture contains 1,726 bilingual cases across all
31 runtime graphs. Its generator requires bilingual subject labels and English
plus Chinese manual boundary coverage for every China/Singapore graph. Keep the
1,718-case floor and all existing gold policies intact.

### Visualization routing

Visualization is catalog-first with structured/sandbox fallbacks:

1. When an implemented entry in the versioned all-subject catalog fits, the main model calls
   `open_interactive_component`. This is a stateless Web-as-brain signal; the
   browser card calls authenticated `POST /api/interactive-component`.
2. Web generates a full config for create or a minimal patch for adjust,
   validates it with the component Zod schema, and renders the registered React
   component. The Agent never reads or writes the config. Above 40 entries the
   prompt carries only a discipline directory and the model first calls the
   read-only `search_interactive_components` tool.
   Outputs persist in the owner-scoped `interactive_component_instances` table
   (immutable initial config, current config, revision-locked PATCH). Course
   VisualBlocks use the same components via `engine: "interactive"`. A catalog
   `version` bump must add the component's `migrations` step (sync test);
   stored configs are upgraded on read, never batch-rewritten.
3. If no catalog entry fits, use the matching specialized renderer. Remaining
   custom cases use the inseparable `plan_visualization` → `widgetRenderer`
   sandbox flow.

The isolated QA route uses the shared `selectInteractiveComponent` helper to
evaluate stage-1 routing; it is not the production Tutor path. Production
selection is the model's `open_interactive_component` tool choice.

The agent is split into modules composed only by `apps/agent/src/graph.mjs`:
`prompts.mjs`, `model.mjs`, `middleware.mjs`, `widget-html.mjs`, and
`tools/{course,interactive,quiz,renderers,visualization}.mjs`. Tool-argument Zod
schemas are imported from `@primoria/contracts/artifacts/schemas`.

### Artifact types (`packages/contracts/src/artifacts`, re-exported by `apps/web/src/lib/ai/types.ts`)

`TutorArtifact` is a discriminated union on `type`:
- `html_widget` — sandboxed iframe widget
- `visualization_plan` — planning card (shown collapsed after widget renders)
- `code` — code block
- `course_card` — links to a generated course
- `todo_list` — step tracker
- `tool_status` — transient executing/complete status
- specialized structured artifacts: `echarts_widget`, `mermaid_diagram`,
  `physics_scene`, `algorithm_visualization`, `math_explorer`,
  `wave_visualization`, `graph_visualization`, and `molecule`

`open_interactive_component` is a frontend-tool signal, not a `TutorArtifact`.
Its UI state stays in `InteractiveComponentCard` and the Web component runtime.

### Widget rendering (`apps/web/src/components/generative-ui/widget-renderer.tsx`)

Widgets execute inside a sandboxed `<iframe>`. The iframe host assembles a full HTML document (`assembleWidgetStandaloneHtml`) that includes: theme CSS, SVG helpers, form styles, a `window.sendPrompt` bridge, and all declared dependencies (scripts/styles/modules). External library URLs are validated against `ALLOWED_DEPENDENCY_URLS` — only CDN URLs in the allowlist are permitted. Streaming HTML is diffed before execution; scripts run only after HTML has settled. Libraries like `Matter`, `THREE`, `Chart`, `p5`, `mermaid`, `gsap`, `d3` are loaded from CDN at runtime, not installed as npm packages.

`ToolCard` (`apps/web/src/components/generative-ui/tool-card.tsx`) routes each `TutorArtifact` type to its renderer. Cross-runtime Zod schemas live in `packages/contracts/src/artifacts/schemas.mjs` (plain ESM runtime shared by agent and web) with hand-written types in `schemas.d.mts`; `apps/web/tests/contracts-artifact-schemas.spec.ts` guards drift between the two. Adding a new artifact type requires: (1) type + schema in `packages/contracts/src/artifacts`, (2) a branch in `ToolCard`, (3) the tool in the matching `apps/agent/src/tools/*.mjs` module. Never type an artifact or tool-argument schema as `z.any()` — import the contracts schema.

Adding a catalog component is a different workflow: update the versioned JSON
catalog, Web component module and registry, shared compact Agent catalog, React
widget and widget map, then pass the catalog/registry/widget sync tests. The
canonical checklist is `docs/交互组件规范.md`.

### Course generation

In the main AI Tutor, course creation starts with the `position_learning_goal` tool in `apps/agent/src/tools/course.mjs`; the web side performs KG positioning, course creation, and persistence. Courses are stored in the `courses` and `lessons` tables (Drizzle schema in `apps/web/src/lib/db/schema.ts`). Lesson blocks are stored as `jsonb`.

Positioning distinguishes canonical full-graph, topic/concept closure, `goal_scoped`, hybrid/generated, clarification, and fallback outcomes. Goal-scoped anchors carry multiple terminal `targetConceptIds`, `scope: "goal"`, and the original `learningGoal`. Approved cross-subject prerequisite edges provide deterministic targets when available; otherwise the selector may choose a minimal in-graph target set. Partial or invalid coverage routes out of library instead of expanding to the whole matched KG. Courses persist `scope_key` and active reuse is unique by owner plus exact scope, so canonical and goal-specific courses from the same graph coexist. Canonical policy: `docs/knowledge-graph/learning-goal-routing.md`.

For overlapping school subjects, curriculum system is a hard route constraint.
Priority is: an explicit system in the current goal or subject chip, then a
confirmed structured onboarding curriculum, then an explicit active
`profile_context`/`prior_knowledge` fact, then clarification. Region/IP may only
narrow uncommitted onboarding suggestions; it is never persisted as curriculum
evidence. Auto-display a curriculum only when stage plus region leaves one
candidate; multiple candidates require an inline learner choice. Continue is
the confirmation boundary. Re-position a previously clarifying goal behind the
current-goal write fence before building the first course.

The outline is built from a **concept frontier**, not one lesson per authored topic. At creation the web side takes a one-time mastery snapshot (`user_concept_mastery`, status `mastered`) and calls the pure `buildConceptFrontierOutline` (`apps/web/src/lib/knowledge-graph/concept-frontier.ts`): it walks the concept prerequisite DAG (built into the `topic-graphs.generated` artifact as `conceptEdges` by `build-topic-graph.mjs`; generated `gen_*` graphs get a synthesized linear chain) in a priority topological order keyed by authored order (`topicDefaultOrder`, then `conceptDefaultOrder`), skips mastered concepts, and greedily groups the remainder into lessons of 2–3 concepts. `centrality` is only a full-tie break plus a `[core]` depth marker in the generation prompt — never a primary sort key (that would reintroduce depth-first incoherence). Empty mastery reproduces the authored order exactly. Each lesson persists its `conceptIds` (jsonb); a mastery read failure degrades to an empty set (cold, never skip content), and an old lesson with empty `conceptIds` dual-reads its whole authored topic. A `conceptEdges` edge may carry an optional `reason` (why `to` needs `from`): source edges author it opt-in, `gen_*` graphs emit it from the generator, `validate-kg.mjs` bounds it (≤240 chars), and `lesson-generation-context.ts` threads intra-lesson reasons into the planner prompt to motivate ordering (`buildKgContextPrompt`). A concept may likewise carry an optional `assessmentHint` (`assessment_hint` in KG source; ≤240 chars; gen_* graphs emit it) — consumed ONLY by quiz-block generation (`block-writer.ts` appends it to quiz jobs), never by mastery scoring, which stays rule-based in `apps/web/src/lib/mastery/rules.ts`.

Lesson titles and descriptions start as deterministic concept-name templates; after a NEW course is created, one best-effort background LLM call (`apps/web/src/lib/ai/course-generation/outline-enrichment.ts`, scheduled with `after()` in `initializeCourseOutline`) rewrites both the title and description behind a title+description-equality write fence — failures keep the templates, and `PRIMORIA_DISABLE_OUTLINE_ENRICHMENT=1` disables the call.

### Onboarding, mastery, and learner facts

Onboarding persists the learning goal/KG anchor, confirmed `education_stage`
and `curriculum_system`, a skippable free-text Facts intake, and Tutor style in
`learner_profiles`. `POST /api/onboarding/facts` synchronously confirms the
structured education context; when optional text exists it durably enqueues a
`profile_fact_intake_jobs` row and advances immediately. The shared Extractor
Worker writes supported facts and derives `knowledgeBackground` only from
explicit education-stage evidence.
Course preparation waits for goal positioning plus a terminal intake state,
while pending intake never blocks workspace entry. A curriculum-ambiguous goal
is re-positioned from confirmed structured context first, with explicit Facts
as a compatibility fallback after intake reaches a terminal state;
if multiple systems remain possible, course creation stays behind clarification.
Settings uses the same queue.

Tutor style (`socratic` | `feynman` | `euclid`, default `feynman`) and its
persona prompts are single-sourced in `packages/contracts` (`tutor-style.mjs` ids for Web/browser code, `tutor-style-prompt.mjs` prompt text for the Agent only).
Web passes the stored `learner_profiles.tutor_style` (or null) as server-set
`primoria_tutor_style` run state; the Agent's `PrimoriaTutorStyleMiddleware`
appends exactly one TUTOR STYLE section plus the shared TUTOR PRESENTATION
(structured cards: bold emoji block labels, comparison tables, final question
in a blockquote) to the main Tutor and `concept-agent` system prompts; they
govern teaching-reply form, layout, and length (never tool routing). Style shapes Tutor dialogue only: it is not a learner fact and
never enters lesson generation. Settings changes it via
`PUT /api/settings/tutor-style`. Per-style behavior markers live in
`apps/agent/evals/tutor-style.v1.json` (`pnpm --filter @primoria/agent eval:tutor:style`, real model).

Keep mastery and facts distinct. `user_concept_mastery` is rule/evidence-driven
concept state written by the learning-progress worker and, for subject-folder
quizzes, by the quiz submit transaction (rolling window of each concept's last
five first-attempt answers, `computeRollingMasteryUpdates`). `learner_facts` stores
durable preferences, prior knowledge, learning gaps, interests, goals, and
profile context, written manually in Settings or by the Extractor worker. Only active
teaching-relevant categories enter Tutor/planner context; interest is
lower-priority and capped at two, while goal and profile_context remain
profile-only. Self-report evidence never writes mastery.

### Personal progression and guild profile

Keep progression separate from both mastery and learner facts. XP represents
verified effort/completion; it is not proof of competence. Full RPG UI belongs
only on `/profile`; quiz/course pages may show transient rewards after a
successful server response, while `/stats` and `/weekly-report` remain numeric.

`xp_awards` is an append-only server ledger. Award XP only through a unique
owner/rule/dedupe key and increment `player_progress.total_xp` only when that
ledger row is inserted. `player_progress.started_at` excludes all earlier
learning history. Daily quests and streaks use the validated IANA timezone in
`user_settings.preferences.timeZone`, with UTC fallback. The launch catalog is
fixed at eight ranks, three daily quests, and ten solo achievements; do not add
leaderboards, group quests, Teach-Back bosses, matching games, or client-authored
rewards without a new product decision.

A concept requires at least three concept-question results and 80% accuracy to
become `mastered`. Mastery workers emit idempotent `mastery.transition` events
only when status changes; lesson completion emits idempotent `lesson.completed`
events.

### Course sharing

Courses are shared via public snapshot links. `course_share_links` stores one immutable, sanitized snapshot per course (learner progress stripped, non-global image assets degraded); the public `/share/[token]` page and the import flow read only the snapshot, never the live course rows. Revoking and re-enabling mints a new token, so revoked links stay dead. Imports are idempotent per user via `courses.imported_from_share_id`. Owner APIs: `/api/courses/[id]/share` (GET/POST/DELETE); import: `POST /api/share/[token]/import`; logic: `apps/web/src/lib/courses/share-store.ts`.

### Learning materials

Learners file study materials into owner-private subject folders on `/materials` (`material_folders`; one system Unsorted inbox per owner; files carry a lecture/reference role and a fractional position seeded from lecture numbers parsed from file names, then manual order wins — `apps/web/src/lib/materials/{folders,ordering}.ts`, design `docs/product/subject-folders.md`; each lecture in a subject folder gets a small KG from the durable `material_kg_jobs` queue, processed by the Extractor worker serialized per folder, which merges into the folder's existing concepts via `sameAs`/`requires` and places a lecture with no number via one light model call, and `rebuildFolderGraph` deterministically assembles the small KGs in lecture order into the folder's `mat_<hash(folder)>` graph — `folder-graph.ts`/`folder-graph-store.ts`, rerun on analysis, reorder, role change, move, rename, and delete; folder quizzes draw weakness-weighted single-choice questions over the whole folder graph from a per-concept bank that grows by one grounded model call when unanswered questions run out — `folder-quiz.ts`/`folder-quiz-store.ts`, `/api/folders/[id]/quizzes/**`, no XP; each folder has one concept-frontier course on scope `graph:<folder graph>:full`, "sync" inserts planned lessons for concepts later lectures added, and every rebuild re-anchors that course's lesson topics to their concepts and drops planned lessons whose concepts all left — `folder-course.ts`/`folder-course-reconcile.ts`, `/api/folders/[id]/course/**`) and upload PDF/DOCX/Markdown/TXT ( ≤ 8 MiB per file because `proxy.ts` buffers request bodies up to Next's 10 MB `proxyClientMaxBodySize`). `POST /api/materials` extracts text synchronously (shared parsers in `apps/web/src/lib/ai/document-text.ts`; PDF pages keep page numbers), chunks it (`apps/web/src/lib/materials/chunking.ts`), and stores only text in `learning_materials` + `learning_material_chunks` — never the original bytes; same-owner re-uploads dedupe by `content_sha256`. `POST /api/materials/courses` builds (or reuses) an owner-private `mat_*` TopicGraph in `material_topic_graphs` with one utility-model call over a budgeted, labelled material map; every concept cites its source chunks (`concept_sources`), and labels the model invents are dropped. The course then runs the normal outline + lesson-job pipeline. `mat_*` graphs are never shared across users or promoted (unlike `gen_*`), resolve only for their owner (`apps/web/src/lib/courses/course-graph.ts` is the single graph resolver), and lesson generation injects the cited chunks as `CourseContext.sourceExcerpts` into Planner and Writer prompts as data, not instructions. Material lessons write owner-scoped images (owner-namespaced cache key), material courses cannot be shared (`POST /api/courses/[id]/share` → 403), and deleting a material is refused while any course uses a material-set graph derived from it (deleting a folder lecture re-assembles the folder graph instead). `user_concept_mastery` has a foreign key into library KG concepts, so mastery of generated-graph concepts (`gen_*` and `mat_*`) lives in `generated_concept_mastery`; `apps/web/src/lib/mastery/owner-store.ts` routes by graph id. Inside a material course, the course-rail Tutor answers material-first: `/api/copilotkit` re-reads the owner's course and `mat_*` graph server-side (only the course id and block ids come from the browser context), retrieves up to six chunks with reciprocal-rank fusion of BM25 (Latin words + CJK bigrams), pgvector similarity over `material_chunk_embeddings` (KG SQL migration 0003; indexed best-effort after upload/course build via `after()`), and the current lesson's cited chunks, and injects them as a hidden `COURSE MATERIAL EXCERPTS` block beside COURSE DETAIL MODE with citation rules; content beyond the material must be labelled as a supplement. Missing embeddings or a failed vector query degrade to lexical + lesson prior; library/`gen_*` courses and the main Tutor never receive material excerpts. Canonical spec and roadmap: `docs/product/learning-materials.md` (subject folders: `docs/product/subject-folders.md`).

### Media assets

Lesson image assets are a global pool by design: generation always writes `media_assets.owner_id = NULL`, the media route serves ownerless assets publicly with immutable caching, and `imageCacheKey` is concept-level — sorted conceptIds + style version + primary language subtag, without the image model, image kind, or the writer's learning goal (analogy illustrations still key on kind + learning goal) — so a concept has one canonical image, generated once by a lesson or an offline pre-warm with any model, and later lessons reuse it with the asset's own kind/alt/caption. `media_assets` keeps metadata and `storage_path`; bytes live in Storage (legacy rows keep `data_base64` until `pnpm media:migrate-storage -- --apply`). Image briefs must stay user-agnostic — never feed learner facts into them, and never add owner-scoping to library or `gen_*` lesson images. The `owner_id` private channel has exactly one writer: lessons of owner-private `mat_*` material courses, whose briefs may echo uploaded text; those assets use an `owner:<id>:`-namespaced cache key and the media route serves them only to their owner.

### KG failure policy

`apps/web/src/lib/knowledge-graph/errors.ts` separates KG coverage misses from infrastructure failures. Coverage miss (KG healthy, library has no match) may route through the freeform gate into generated `gen_*` graphs. Infrastructure failure (missing KG tables, DB down, embedding provider down) throws `KnowledgeGraphUnavailableError` and maps to safe API errors — never return or persist raw `error.message` on positioning paths. `GET /api/health` reports DB/KG-schema/embedding state plus job-queue backlog (`apps/web/src/lib/courses/job-queue-health.ts`); a queued job older than `PRIMORIA_HEALTH_QUEUE_STALL_SECONDS` (default 600) flips the status to `degraded`. `PRIMORIA_ALLOW_KG_INFRA_FALLBACK=1` (local dev only, never `NODE_ENV`-derived) lets only `kg_schema_missing` degrade into the freeform gate.

### Route auth policy

Public routes are defined once in `apps/web/src/lib/auth/routes.ts` and shared by the proxy and pages — do not add a second public-path list. `/welcome` is the public landing; `/` is the signed-in app home (signed-out visits redirect through `/login`; sign-out lands on `/welcome`).

### DB

ORM: Drizzle + `postgres` driver. Drizzle owns App/Auth/Course schema; versioned Web SQL owns KG/pgvector (including `material_chunk_embeddings`); `apps/agent/db/migrations/` owns only `agent_runtime`. `pnpm db:bootstrap` applies all three owners idempotently. KG source data and embeddings are imported separately with `pnpm db:initialize:kg`. Core App tables include users, identities, sessions, rate limits, courses, lessons, lesson/progress/extractor jobs, `profile_fact_intake_jobs`, `material_folders`/`learning_materials`/`learning_material_chunks`/`material_topic_graphs`/`material_subgraphs`/`material_kg_jobs`, `generated_concept_mastery`, folder quizzes (`folder_quiz_questions`/`folder_quiz_sessions`/`folder_quiz_answers`), learning events, mastery, learner profiles/facts, `player_progress`, `xp_awards`, `daily_quest_completions`, `achievement_unlocks`, chat messages, `interactive_component_instances`, media assets, and settings.

The selected shared database is managed Supabase PostgreSQL in the existing Primoria Singapore project. Root commands load the ignored `.env.supabase` through `scripts/with-database-env.mjs`, with separate migration/runtime roles and verified TLS. Supabase hosts the database plus a private `lesson-media` Storage bucket for lesson image bytes, reached server-side only with `SUPABASE_URL`/`SUPABASE_SECRET_KEY` (`apps/web/src/lib/ai/media/media-storage.ts`); authentication remains Web-owned and no browser Supabase SDK/anon key is used. Explicit environment connections take priority. Runtime traffic belongs on the Transaction pooler (6543) and migrations on the Session pooler (5432, KG advisory lock); pool sizes default from the URL (1 per client on the Session pooler) unless `DATABASE_POOL_MAX`/`AGENT_DATABASE_POOL_MAX` is set, so never add session-level SQL (advisory locks, LISTEN, session `SET`) to runtime code. Docker PostgreSQL on `127.0.0.1:5432` remains the offline and isolated regression option. See `docs/supabase-deployment.md`.

### Model provider

`apps/web/src/lib/ai/deepagent/model.ts` resolves provider credentials
exclusively from server-side env vars. There is no BYOK. Internal model tiers
are `AI_MODEL_FAST` for routing/utility work and optional `AI_MODEL_CONTENT` for
source comparison and causal timelines; the latter falls back to the default
model, never the fast tier. The Agent's optional `AI_MODEL_TUTOR` overrides its
provider default independently of Web course generation. DeepSeek Web utility
calls and structured course Block Writer calls disable thinking while preserving the selected model tier; other fast-tier calls use low thinking effort. The Agent tutor also runs DeepSeek models with thinking disabled.
Supports `openai-compatible` and
`anthropic-compatible`.

KG embeddings are configured separately through `KG_EMBEDDING_PROVIDER`. Current supported embedding providers are `openai-compatible` and `minimax`.

### Deployment

The selected deployment topology is `docker-compose.supabase.yml`: managed Supabase PostgreSQL plus an application server running migration jobs, web, the self-hosted Node/AG-UI agent, three workers, and Caddy. `docker-compose.prod.yml` remains the explicit self-hosted database alternative. `agent-migrate` initializes the LangGraph checkpoint schema before Agent startup. Web waits for Agent readiness; Agent shutdown drains active runs. Only Caddy is public; port 2024 must never be published. Full runbook: README "Deployment (Single Server)"; credential timing, preflight gates, rollback, and commit/push handoff: `docs/deployment-preflight.md`. Do not request deployment credentials, deploy, commit, or push until the user explicitly asks.

The internal visualization analytics page is `/internal/visualization-analytics`.
Production access fails closed unless `PRIMORIA_ENABLE_INTERNAL_ANALYTICS=1`
and the authenticated email is listed in `PRIMORIA_INTERNAL_EMAILS`.

## Key constraints

- `apps/agent/` is plain ESM (`.mjs`), no TypeScript, no imports from `apps/web/`.
- Widget HTML must be an iframe fragment (no `<html>/<head>/<body>` wrapper, no `100vh` layouts).
- The widget dependency allowlist is single-sourced in `packages/contracts/src/artifacts/widget-dependencies.mjs`; agent and web import it — never re-declare widget CDN URLs elsewhere (`apps/web/tests/widget-dependencies-sync.spec.ts` enforces this).
- The Agent's interactive routing prior is single-sourced in `packages/contracts/src/artifacts/interactive-catalog.mjs`; sync tests prevent component-id/name drift with the Web registry.
- App/Auth/Course/KG writes remain Web-owned. `apps/agent/` may access only `agent_runtime` plus its existing bounded owner-scoped course-card read; never access DB from client components.
- `apps/web/next-env.d.ts` is generated by Next and intentionally ignored. `typecheck` runs `next typegen` before `tsc`; tests must not read or require that file.
- The learning-goal regression corpus in `apps/web/tests/fixtures/learning-goal-routing.manual-seeds.v2.json` and `learning-goal-routing.v2.json` is a permanent product contract. Never delete it, reduce its coverage/count, weaken its gold policy labels, or remove its generator/evaluator/CI gate unless the user explicitly approves that product decision. Add cases for new behavior and preserve the reported LLM-architecture and goal-scoped linear-algebra regressions.
- `docs/README.md` defines document precedence. Update current-state docs when runtime paths, tools, schemas, routes, environment variables, or public capabilities change.
