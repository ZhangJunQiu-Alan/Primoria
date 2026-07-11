# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install deps
pnpm install

# Start both web (port 3000) and LangGraph agent (port 2024)
pnpm dev

# Web app only; AI Tutor still needs LANGGRAPH_DEPLOYMENT_URL to reach a running agent
pnpm --filter @primoria/web dev

# Type-check
pnpm --filter @primoria/web typecheck

# Lint
pnpm lint

# Build
pnpm build

# DB migrations (after schema changes in apps/web/src/lib/db/schema.ts)
pnpm --filter @primoria/web db:generate
pnpm --filter @primoria/web db:migrate

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

Write new tests as native vitest `tests/*.spec.ts` files; do not add new self-executing `*.unit.ts` scripts. CI (`.github/workflows/ci.yml`) runs typecheck, lint, and unit tests on every PR.

## Architecture

### Monorepo layout

```
apps/web/     Next.js app — UI, API routes, DB, CopilotKit integration
apps/agent/   LangGraph agent — serves the primoria_tutor graph
data/knowledge-graphs/source/  Committed KG source JSON files and sidecars
data/knowledge-graphs/generated/  Exported generated graph candidates awaiting review/promotion
```

### AI Tutor path

There is one active tutor runtime path:

Browser CopilotKit UI → `apps/web/src/app/api/copilotkit/route.ts` → `LangGraphAgent(graphId: "primoria_tutor")` → `apps/agent/src/graph.mjs`.

The legacy `POST /api/tutor/chat` stack has been deleted. If you find references to it in older docs, they are stale.

### Agent tool pipeline (visualization)

The standard visualization flow in the active tutor path:
1. `plan_visualization` — AI outputs `VisualizationPlanArtifact` (approach, technology, key elements)
2. `widgetRenderer` — AI writes a self-contained HTML/CSS/JS fragment → `HtmlWidgetArtifact`

The active tutor prompt and tool schemas live in `apps/agent/src/graph.mjs`.

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

`ToolCard` (`apps/web/src/components/generative-ui/tool-card.tsx`) routes each `TutorArtifact` type to its renderer. Adding a new artifact type requires: (1) the type in `types.ts`, (2) a branch in `ToolCard`, (3) schema in `apps/agent/src/graph.mjs`.

### Course generation

In the main AI Tutor, course creation starts with the `position_learning_goal` tool in `apps/agent/src/graph.mjs`; the web side performs KG positioning, course creation, and persistence. Courses are stored in the `courses` and `lessons` tables (Drizzle schema in `apps/web/src/lib/db/schema.ts`). Lesson blocks are stored as `jsonb`. Outline lesson descriptions start as deterministic templates; after a NEW course is created, one best-effort background LLM call (`apps/web/src/lib/ai/course-generation/outline-enrichment.ts`, scheduled with `after()` in `initializeCourseOutline`) rewrites them behind a description-equality write fence — failures keep the templates, and `PRIMORIA_DISABLE_OUTLINE_ENRICHMENT=1` disables the call.

### KG failure policy

`apps/web/src/lib/knowledge-graph/errors.ts` separates KG coverage misses from infrastructure failures. Coverage miss (KG healthy, library has no match) may route through the freeform gate into generated `gen_*` graphs. Infrastructure failure (missing KG tables, DB down, embedding provider down) throws `KnowledgeGraphUnavailableError` and maps to safe API errors — never return or persist raw `error.message` on positioning paths. `GET /api/health` reports DB/KG-schema/embedding state. `PRIMORIA_ALLOW_KG_INFRA_FALLBACK=1` (local dev only, never `NODE_ENV`-derived) lets only `kg_schema_missing` degrade into the freeform gate.

### Route auth policy

Public routes are defined once in `apps/web/src/lib/auth/routes.ts` and shared by the proxy and pages — do not add a second public-path list. `/welcome` is the public landing; `/` is the signed-in app home (signed-out visits redirect through `/login`; sign-out lands on `/welcome`).

### DB

ORM: Drizzle + `postgres` driver. Schema: `apps/web/src/lib/db/schema.ts`. Core tables include `users`, `identities`, `sessions`, `auth_rate_limits`, `courses`, `lessons`, lesson/progress/extractor jobs, `knowledge_graph_*`, `learning_events`, `quiz_attempts`, `user_concept_mastery`, `learner_profiles`, `learner_facts`, `copilot_chat_threads`, `copilot_chat_messages`, `media_assets`, and `user_settings`.

Local development uses the Docker Compose PostgreSQL service (`pgvector/pgvector:pg16`) bound to `127.0.0.1:5432`. The old `127.0.0.1:15432` Tencent Cloud SSH tunnel is a remote-database fallback only, not the default local path. Supabase runtime helpers have been removed; do not add new Supabase URL/anon-key paths unless the database/auth strategy is intentionally changed.

### Model provider

`apps/web/src/lib/ai/deepagent/model.ts` resolves provider settings from env vars or per-request `TutorProviderSettings`. Supports `openai-compatible` (default) and `anthropic-compatible`. The agent uses `ChatOpenAI` or `ChatAnthropic` from LangChain.

KG embeddings are configured separately through `KG_EMBEDDING_PROVIDER`. Current supported embedding providers are `openai-compatible` and `minimax`.

## Key constraints

- `apps/agent/` is plain ESM (`.mjs`), no TypeScript, no imports from `apps/web/`.
- Widget HTML must be an iframe fragment (no `<html>/<head>/<body>` wrapper, no `100vh` layouts).
- The widget dependency allowlist in `widget-renderer.tsx` and `graph.mjs` must be kept in sync.
- DB access is only from `apps/web/` server-side code; never from client components directly.
