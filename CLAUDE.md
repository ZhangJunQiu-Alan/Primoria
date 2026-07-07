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

### Tests (no test runner, run directly with tsx or node)

```bash
# Unit tests
node_modules/.pnpm/node_modules/.bin/tsx apps/web/tests/widget-html.unit.ts
node_modules/.pnpm/node_modules/.bin/tsx apps/web/tests/sediment.unit.ts
node_modules/.pnpm/node_modules/.bin/tsx apps/web/tests/widget-export.unit.ts
node_modules/.pnpm/node_modules/.bin/tsx apps/web/tests/attachments.unit.ts

# E2E (requires running app)
node apps/web/tests/widget-renderer.e2e.mjs
node apps/web/tests/sediment.e2e.mjs

# Verify agent graph syntax
node --check apps/agent/src/graph.mjs
```

## Architecture

### Monorepo layout

```
apps/web/     Next.js app — UI, API routes, DB, CopilotKit integration
apps/agent/   LangGraph agent — serves the primoria_tutor graph
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

### Artifact types (`apps/web/src/lib/ai/types.ts`)

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

In the main AI Tutor, course creation starts with the `position_learning_goal` tool in `apps/agent/src/graph.mjs`; the web side performs KG positioning, course creation, and persistence. Courses are stored in the `courses` and `lessons` tables (Drizzle schema in `apps/web/src/lib/db/schema.ts`). Lesson blocks are stored as `jsonb`.

### DB

ORM: Drizzle + `postgres` driver. Schema: `apps/web/src/lib/db/schema.ts`. Tables include `users`, `identities`, `sessions`, `otp_codes`, `courses`, `course_edit_events`, `copilot_chat_threads`, `copilot_chat_messages`, and `user_settings`.

### Model provider

`apps/web/src/lib/ai/deepagent/model.ts` resolves provider settings from env vars or per-request `TutorProviderSettings`. Supports `openai-compatible` (default) and `anthropic-compatible`. The agent uses `ChatOpenAI` or `ChatAnthropic` from LangChain.

## Key constraints

- `apps/agent/` is plain ESM (`.mjs`), no TypeScript, no imports from `apps/web/`.
- Widget HTML must be an iframe fragment (no `<html>/<head>/<body>` wrapper, no `100vh` layouts).
- The widget dependency allowlist in `widget-renderer.tsx` and `graph.mjs` must be kept in sync.
- DB access is only from `apps/web/` server-side code; never from client components directly.
