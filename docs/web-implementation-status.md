# Primoria Web implementation status

## Current Result

The Web app is the active Primoria product surface. It is no longer a static
mock and no longer depends on Supabase runtime helpers.

Implemented:

- Next.js / React / TypeScript web app under `apps/web`
- Chat-first AI Tutor UI
- Light Primoria visual style
- Course outline route with generated/planned/locked lesson states and explicit
  Jump ahead generation for planned lessons
- Full-screen course lesson reader at `/course/[id]`: one block per step, lesson
  title/progress in the reader top bar, bottom step controls, and no embedded
  upcoming outline
- Course Tutor on lesson pages as a collapsed right-side AI rail that expands
  into the existing CopilotKit Course Tutor surface
- Settings UI for model/provider preferences where wired
- Postgres-backed CopilotKit thread history with New chat reset
- CopilotKit runtime route backed by Primoria's self-hosted AG-UI service and
  the LangGraph `primoria_tutor` graph
- PostgreSQL-backed Agent runs, streamed events, leases, cancellation,
  conservative retry/recovery, and LangGraph checkpoints
- OpenAI-compatible and Anthropic-compatible chat model configuration
- OpenAI-compatible and MiniMax KG embedding configuration
- DeepAgent/LangGraph tutor prompt
- Structured model response:
  - normal text reply
  - visualization plan artifact
  - `html_widget` artifact
  - `code` artifact
  - suggestions
- Course block renderers for text, analogy, transfer, image, visual, code,
  quiz, mind map, slide, and worksheet blocks
- LangGraph visual tool pipeline:
  - prompt routing chooses course, visualization, STEM simulation, greeting, or concept answer
  - `plan_visualization`
  - `widgetRenderer`
  - `stemRenderer`
- Sandboxed iframe renderer for interactive HTML/CSS/JS widgets
- Runtime iframe resize bridge
- OpenGenerativeUI-style widget shell:
  - Primoria theme CSS injection
  - SVG helper classes
  - form/input default styles
  - import map for approved visualization modules
  - widget-to-tutor prompt bridge
- Local verification through CopilotKit, the self-hosted Agent runtime on port
  2024, and browser QA
- Postgres-backed self-owned auth (`users`, `identities`, `sessions`)
- Auth endpoint rate limiting through `auth_rate_limits`
- Docker Compose local PostgreSQL with `pgvector/pgvector:pg16` as the default
  development database

## Runtime Config

Local runtime config should start from `apps/web/.env.example`, then be copied to
`apps/web/.env.local`. The LangGraph agent should receive the same relevant
server-side values via `apps/agent/.env`.

```env
AI_PROVIDER=openai-compatible
OPENAI_BASE_URL=https://your-openai-compatible-endpoint/v1
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-5.4
DATABASE_URL=postgresql://primoria_app:primoria_dev@127.0.0.1:5432/primoria
DATABASE_SSL=disable
PRIMORIA_AGENT_URL=http://localhost:2024
```

Supported model providers:

- `AI_PROVIDER=openai-compatible`
- `AI_PROVIDER=anthropic-compatible`

KG source JSON files live under `data/knowledge-graphs/source/`; generated graph
exports awaiting review live under `data/knowledge-graphs/generated/`. KG
embeddings are configured separately with `KG_EMBEDDING_PROVIDER`.

## Verification

Passed:

- `pnpm --filter @primoria/web typecheck`
- `pnpm --filter @primoria/web test`
- `pnpm --filter @primoria/web build`
- `pnpm --filter @primoria/agent typecheck`
- `pnpm --filter @primoria/agent test`
- `pnpm --filter @primoria/agent test:integration`
- `pnpm --filter @primoria/agent test:runtime:db`

## Next Implementation Steps

1. Run full local-stack QA: web, agent, workers, Docker Postgres, and real model keys.
2. Calibrate KG positioning thresholds after MiniMax embedding migration.
3. Add user-level limits for cost-bearing AI endpoints beyond auth.
4. Fix the remaining widget iframe sandbox hardening item.
5. Browser-check the redesigned lesson reader across representative text,
   visual, code, quiz, and worksheet lessons before release.
