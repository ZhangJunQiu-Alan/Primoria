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
data/visualization-components/  Versioned all-subject catalog and JSON Schema
```

### AI Tutor path

There is one active tutor runtime path:

Browser CopilotKit UI → `apps/web/src/app/api/copilotkit/route.ts` → `PrimoriaHttpAgent` → internal AG-UI `POST /agent` → `apps/agent/src/graph.mjs`.

The legacy `POST /api/tutor/chat` stack has been deleted. If you find references to it in older docs, they are stale.

The Agent runtime persists AG-UI events, run state, leases, cancellation, retry metadata, and LangGraph checkpoints in PostgreSQL's isolated `agent_runtime` schema. Automatic retry is allowed only before user-visible/tool output. Interrupted runs with persisted output fail explicitly to avoid replaying side effects. Manual retry creates a new run ID and preserves the original audit trail.

### Visualization routing

Visualization is catalog-first with structured/sandbox fallbacks:

1. When one of the 19 all-subject catalog entries fits, the main model calls
   `open_interactive_component`. This is a stateless Web-as-brain signal; the
   browser card calls authenticated `POST /api/interactive-component`.
2. Web generates a full config for create or a minimal patch for adjust,
   validates it with the component Zod schema, and renders the registered React
   component. The Agent never reads or writes the config.
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

The outline is built from a **concept frontier**, not one lesson per authored topic. At creation the web side takes a one-time mastery snapshot (`user_concept_mastery`, status `mastered`) and calls the pure `buildConceptFrontierOutline` (`apps/web/src/lib/knowledge-graph/concept-frontier.ts`): it walks the concept prerequisite DAG (built into the `topic-graphs.generated` artifact as `conceptEdges` by `build-topic-graph.mjs`; generated `gen_*` graphs get a synthesized linear chain) in a priority topological order keyed by authored order (`topicDefaultOrder`, then `conceptDefaultOrder`), skips mastered concepts, and greedily groups the remainder into lessons of 2–3 concepts. `centrality` is only a full-tie break plus a `[core]` depth marker in the generation prompt — never a primary sort key (that would reintroduce depth-first incoherence). Empty mastery reproduces the authored order exactly. Each lesson persists its `conceptIds` (jsonb); a mastery read failure degrades to an empty set (cold, never skip content), and an old lesson with empty `conceptIds` dual-reads its whole authored topic. A `conceptEdges` edge may carry an optional `reason` (why `to` needs `from`): source edges author it opt-in, `gen_*` graphs emit it from the generator, `validate-kg.mjs` bounds it (≤240 chars), and `lesson-generation-context.ts` threads intra-lesson reasons into the planner prompt to motivate ordering (`buildKgContextPrompt`).

Lesson titles and descriptions start as deterministic concept-name templates; after a NEW course is created, one best-effort background LLM call (`apps/web/src/lib/ai/course-generation/outline-enrichment.ts`, scheduled with `after()` in `initializeCourseOutline`) rewrites both the title and description behind a title+description-equality write fence — failures keep the templates, and `PRIMORIA_DISABLE_OUTLINE_ENRICHMENT=1` disables the call.

### Onboarding, mastery, and learner facts

Onboarding persists the learning goal/KG anchor, knowledge background, and Tutor
style in `learner_profiles` and prepares the first course. Those three choices
are mirrored into evidence-backed `learner_facts`; changing or skipping a
choice updates or dismisses its corresponding fact.

Keep mastery and facts distinct. `user_concept_mastery` is rule/evidence-driven
concept state written by the learning-progress worker. `learner_facts` stores
durable preferences, prior knowledge, learning gaps, and goals, written by
onboarding sync or the Extractor worker. Only active teaching-relevant fact
categories enter Tutor/planner context; stale goals do not drive lesson content.

### Course sharing

Courses are shared via public snapshot links. `course_share_links` stores one immutable, sanitized snapshot per course (learner progress stripped, non-global image assets degraded); the public `/share/[token]` page and the import flow read only the snapshot, never the live course rows. Revoking and re-enabling mints a new token, so revoked links stay dead. Imports are idempotent per user via `courses.imported_from_share_id`. Owner APIs: `/api/courses/[id]/share` (GET/POST/DELETE); import: `POST /api/share/[token]/import`; logic: `apps/web/src/lib/courses/share-store.ts`.

### Media assets

Lesson image assets are a global pool by design: generation always writes `media_assets.owner_id = NULL`, the media route serves ownerless assets publicly with immutable caching, and `imageCacheKey` (a hash of brief semantics) reuses one asset across users. Image briefs must stay user-agnostic — never feed learner facts into them, and never add owner-scoping to lesson images. `owner_id` is a reserved private channel with no current writers.

### KG failure policy

`apps/web/src/lib/knowledge-graph/errors.ts` separates KG coverage misses from infrastructure failures. Coverage miss (KG healthy, library has no match) may route through the freeform gate into generated `gen_*` graphs. Infrastructure failure (missing KG tables, DB down, embedding provider down) throws `KnowledgeGraphUnavailableError` and maps to safe API errors — never return or persist raw `error.message` on positioning paths. `GET /api/health` reports DB/KG-schema/embedding state plus job-queue backlog (`apps/web/src/lib/courses/job-queue-health.ts`); a queued job older than `PRIMORIA_HEALTH_QUEUE_STALL_SECONDS` (default 600) flips the status to `degraded`. `PRIMORIA_ALLOW_KG_INFRA_FALLBACK=1` (local dev only, never `NODE_ENV`-derived) lets only `kg_schema_missing` degrade into the freeform gate.

### Route auth policy

Public routes are defined once in `apps/web/src/lib/auth/routes.ts` and shared by the proxy and pages — do not add a second public-path list. `/welcome` is the public landing; `/` is the signed-in app home (signed-out visits redirect through `/login`; sign-out lands on `/welcome`).

### DB

ORM: Drizzle + `postgres` driver. Drizzle owns App/Auth/Course schema; versioned Web SQL owns KG/pgvector; `apps/agent/db/migrations/` owns only `agent_runtime`. `pnpm db:bootstrap` applies all three owners idempotently. KG source data and embeddings are imported separately with `pnpm db:initialize:kg`. Core App tables include users, identities, sessions, rate limits, courses, lessons, jobs, learning events, mastery, learner profiles/facts, chat messages, media assets, and settings.

Local development uses the Docker Compose PostgreSQL service (`pgvector/pgvector:pg16`) bound to `127.0.0.1:5432`. The old `127.0.0.1:15432` Tencent Cloud SSH tunnel is a remote-database fallback only, not the default local path. Supabase runtime helpers have been removed; do not add new Supabase URL/anon-key paths unless the database/auth strategy is intentionally changed.

### Model provider

`apps/web/src/lib/ai/deepagent/model.ts` resolves provider credentials
exclusively from server-side env vars. There is no BYOK. Internal model tiers
are `AI_MODEL_FAST` for routing/utility work and optional `AI_MODEL_CONTENT` for
source comparison and causal timelines; the latter falls back to the default
model, never the fast tier. Supports `openai-compatible` and
`anthropic-compatible`.

KG embeddings are configured separately through `KG_EMBEDDING_PROVIDER`. Current supported embedding providers are `openai-compatible` and `minimax`.

### Deployment

Production is a single-server Docker Compose stack (`docker-compose.prod.yml`): postgres, App/KG and Agent-runtime migration jobs, web, the self-hosted Node/AG-UI agent, three workers, and Caddy. Web waits for Agent readiness; Agent shutdown drains active runs. Only Caddy is public; port 2024 must never be published. Full runbook: README "Deployment (Single Server)"; credential timing, preflight gates, rollback, and commit/push handoff: `docs/deployment-preflight.md`. Do not request deployment credentials, deploy, commit, or push until the user explicitly asks.

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
- `docs/README.md` defines document precedence. Update current-state docs when runtime paths, tools, schemas, routes, environment variables, or public capabilities change.
