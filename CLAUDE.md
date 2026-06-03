# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install deps
pnpm install

# Start both web (port 3000) and LangGraph agent (port 2024)
pnpm dev

# Web app only (when NEXT_PUBLIC_USE_COPILOTKIT is not set)
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
apps/web/     Next.js app — UI, API routes, DB, agent integration
apps/agent/   LangGraph agent — CopilotKit path only
```

### Two tutor paths

**Default path** (`NEXT_PUBLIC_USE_COPILOTKIT` not set):
`POST /api/tutor/chat` → `runTutorAgent` / `runTutorAgentStream` in `apps/web/src/lib/ai/tutor-agent.ts` → `invokePrimoriaDeepAgent` in `apps/web/src/lib/ai/deepagent/primoria-deep-agent.ts`

**CopilotKit path** (requires `LANGGRAPH_DEPLOYMENT_URL`):
Browser CopilotKit runtime → `apps/agent/src/graph.mjs` (LangGraph, ESM only, no TypeScript)

Both paths produce the same `TutorArtifact` union types and the same UI components consume them.

### Agent tool pipeline (visualization)

The standard visualization flow in both paths:
1. `plan_visualization` — AI outputs `VisualizationPlanArtifact` (approach, technology, key elements)
2. `widgetRenderer` — AI writes a self-contained HTML/CSS/JS fragment → `HtmlWidgetArtifact`

The agent prompt is in `primoria-deep-agent.ts` (default path) and `graph.mjs` (CopilotKit path). Both files define the system prompt and tool schemas. **Keep them in sync when changing tool behavior.**

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

`ToolCard` (`apps/web/src/components/generative-ui/tool-card.tsx`) routes each `TutorArtifact` type to its renderer. Adding a new artifact type requires: (1) the type in `types.ts`, (2) a branch in `ToolCard`, (3) schema in `primoria-deep-agent.ts` and `graph.mjs`.

### Capability library / sedimentation

After a widget renders, `sedimentWidget` in `apps/web/src/lib/capability-library/sedimentation.ts` automatically saves it to the `learning_apps` DB table if it passes size and dedup checks. This is the "widget library" users can browse.

### Course generation

`generateCourseTool` in the agent calls `generateCourse` in `apps/web/src/lib/ai/deepagent/course-generator.ts`. Courses are stored in the `courses` table (Drizzle schema in `apps/web/src/lib/db/schema.ts`). Course blocks are `jsonb` and include types: `text | analogy | transfer | visual | code`. Visual blocks currently carry `{ html }`.

### DB

ORM: Drizzle + `postgres` driver. Schema: `apps/web/src/lib/db/schema.ts`. Tables: `users`, `identities`, `sessions`, `otp_codes`, `courses`, `course_edit_events`, `copilot_chat_threads`, `copilot_chat_messages`, `user_settings`, `learning_apps` (capability library).

### Model provider

`apps/web/src/lib/ai/deepagent/model.ts` resolves provider settings from env vars or per-request `TutorProviderSettings`. Supports `openai-compatible` (default) and `anthropic-compatible`. The agent uses `ChatOpenAI` or `ChatAnthropic` from LangChain.

## Key constraints

- `apps/agent/` is plain ESM (`.mjs`), no TypeScript, no imports from `apps/web/`.
- Widget HTML must be an iframe fragment (no `<html>/<head>/<body>` wrapper, no `100vh` layouts).
- The widget dependency allowlist in `widget-renderer.tsx` and `graph.mjs` must be kept in sync.
- DB access is only from `apps/web/` server-side code; never from client components directly.
