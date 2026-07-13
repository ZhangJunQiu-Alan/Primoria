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
data/knowledge-graphs/source/  Committed KG source JSON files and sidecars
data/knowledge-graphs/generated/  Exported generated graph candidates awaiting review/promotion
```

### AI Tutor path

There is one active tutor runtime path:

Browser CopilotKit UI → `apps/web/src/app/api/copilotkit/route.ts` → `PrimoriaHttpAgent` → internal AG-UI `POST /agent` → `apps/agent/src/graph.mjs`.

The legacy `POST /api/tutor/chat` stack has been deleted. If you find references to it in older docs, they are stale.

The Agent runtime persists AG-UI events, run state, leases, cancellation, retry metadata, and LangGraph checkpoints in PostgreSQL's isolated `agent_runtime` schema. Automatic retry is allowed only before user-visible/tool output. Interrupted runs with persisted output fail explicitly to avoid replaying side effects. Manual retry creates a new run ID and preserves the original audit trail.

### Agent tool pipeline (visualization)

The standard visualization flow in the active tutor path:
1. `plan_visualization` — AI outputs `VisualizationPlanArtifact` (approach, technology, key elements)
2. `widgetRenderer` — AI writes a self-contained HTML/CSS/JS fragment → `HtmlWidgetArtifact`

The agent is split into modules composed only by `apps/agent/src/graph.mjs`: `prompts.mjs` (system prompt + subagents), `model.mjs`, `middleware.mjs`, `widget-html.mjs`, and `tools/{visualization,renderers,course,quiz}.mjs`. Tool-argument Zod schemas are imported from `@primoria/contracts/artifacts/schemas` — the same runtime schemas the web hook uses.

### Artifact types (`packages/contracts/src/artifacts`, re-exported by `apps/web/src/lib/ai/types.ts`)

`TutorArtifact` is a discriminated union on `type`:
- `html_widget` — sandboxed iframe widget
- `visualization_plan` — planning card (shown collapsed after widget renders)
- `code` — code block
- `course_card` — links to a generated course
- `todo_list` — step tracker
- `tool_status` — transient executing/complete status

### Widget rendering (`apps/web/src/components/generative-ui/widget-renderer.tsx`)

Widgets execute inside a sandboxed `<iframe>`. The iframe host assembles a full HTML document (`assembleWidgetStandaloneHtml`) that includes: theme CSS, SVG helpers, form styles, a `window.sendPrompt` bridge, and all declared dependencies (scripts/styles/modules). External library URLs are validated against `ALLOWED_DEPENDENCY_URLS` — only CDN URLs in the allowlist are permitted. Streaming HTML is diffed before execution; scripts run only after HTML has settled. Libraries like `Matter`, `THREE`, `Chart`, `p5`, `mermaid`, `gsap`, `d3` are loaded from CDN at runtime, not installed as npm packages.

`ToolCard` (`apps/web/src/components/generative-ui/tool-card.tsx`) routes each `TutorArtifact` type to its renderer. Cross-runtime Zod schemas live in `packages/contracts/src/artifacts/schemas.mjs` (plain ESM runtime shared by agent and web) with hand-written types in `schemas.d.mts`; `apps/web/tests/contracts-artifact-schemas.spec.ts` guards drift between the two. Adding a new artifact type requires: (1) type + schema in `packages/contracts/src/artifacts`, (2) a branch in `ToolCard`, (3) the tool in the matching `apps/agent/src/tools/*.mjs` module. Never type an artifact or tool-argument schema as `z.any()` — import the contracts schema.

### Course generation

In the main AI Tutor, course creation starts with the `position_learning_goal` tool in `apps/agent/src/tools/course.mjs`; the web side performs KG positioning, course creation, and persistence. Courses are stored in the `courses` and `lessons` tables (Drizzle schema in `apps/web/src/lib/db/schema.ts`). Lesson blocks are stored as `jsonb`. Outline lesson descriptions start as deterministic templates; after a NEW course is created, one best-effort background LLM call (`apps/web/src/lib/ai/course-generation/outline-enrichment.ts`, scheduled with `after()` in `initializeCourseOutline`) rewrites them behind a description-equality write fence — failures keep the templates, and `PRIMORIA_DISABLE_OUTLINE_ENRICHMENT=1` disables the call.

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

`apps/web/src/lib/ai/deepagent/model.ts` resolves provider credentials (provider/baseUrl/apiKey) exclusively from server-side env vars. There is no BYOK: clients cannot supply provider settings, and `TutorProviderSettings` now carries only the internal model-tier selection (`fastTierSettings`). Supports `openai-compatible` (default) and `anthropic-compatible`. The agent uses `ChatOpenAI` or `ChatAnthropic` from LangChain.

KG embeddings are configured separately through `KG_EMBEDDING_PROVIDER`. Current supported embedding providers are `openai-compatible` and `minimax`.

### Deployment

Production is a single-server Docker Compose stack (`docker-compose.prod.yml`): postgres, App/KG and Agent-runtime migration jobs, web, the self-hosted Node/AG-UI agent, three workers, and Caddy. Web waits for Agent readiness; Agent shutdown drains active runs. Only Caddy is public; port 2024 must never be published. Full runbook: README "Deployment (Single Server)"; credential timing, preflight gates, rollback, and commit/push handoff: `docs/deployment-preflight.md`. Do not request deployment credentials, deploy, commit, or push until the user explicitly asks.

## Key constraints

- `apps/agent/` is plain ESM (`.mjs`), no TypeScript, no imports from `apps/web/`.
- Widget HTML must be an iframe fragment (no `<html>/<head>/<body>` wrapper, no `100vh` layouts).
- The widget dependency allowlist is single-sourced in `packages/contracts/src/artifacts/widget-dependencies.mjs`; agent and web import it — never re-declare widget CDN URLs elsewhere (`apps/web/tests/widget-dependencies-sync.spec.ts` enforces this).
- App/Auth/Course/KG writes remain Web-owned. `apps/agent/` may access only `agent_runtime` plus its existing bounded owner-scoped course-card read; never access DB from client components.
