# Primoria Web implementation status

## Current Result

The Web app is the active Primoria product surface. It is no longer a static
mock and no longer depends on Supabase runtime helpers.

Implemented:

- Next.js / React / TypeScript web app under `apps/web`
- Chat-first AI Tutor UI
- Light Primoria visual style
- Settings UI for model/provider preferences where wired
- CopilotKit thread history with New chat reset
- CopilotKit runtime route backed by the LangGraph `primoria_tutor` graph
- OpenAI-compatible and Anthropic-compatible chat model configuration
- OpenAI-compatible and MiniMax KG embedding configuration
- DeepAgent/LangGraph tutor prompt
- Structured model response:
  - normal text reply
  - visualization plan artifact
  - `html_widget` artifact
  - `code` artifact
  - suggestions
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
- Local verification through CopilotKit and LangGraph Studio
- Postgres-backed self-owned auth (`users`, `identities`, `sessions`)
- Auth endpoint rate limiting through `auth_rate_limits`
- Tencent Cloud PostgreSQL as the current shared development database

## Runtime Config

Server defaults live in `apps/web/.env.local`:

```env
OPENAI_BASE_URL=https://ai.orbitlink.me/v1
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.4
DATABASE_URL=postgresql://primoria_app:[password]@127.0.0.1:15432/primoria
DATABASE_SSL=false
```

Supported model providers:

- `AI_PROVIDER=openai-compatible`
- `AI_PROVIDER=anthropic-compatible`

KG embeddings are configured separately with `KG_EMBEDDING_PROVIDER`.

## Verification

Passed:

- `pnpm --filter @primoria/web typecheck`
- `pnpm --filter @primoria/web test`
- `pnpm --filter @primoria/web build`
- `node --check apps/agent/src/graph.mjs`

## Next Implementation Steps

1. Run full local-stack QA: web, agent, workers, Tencent DB, and real model keys.
2. Calibrate KG positioning thresholds after MiniMax embedding migration.
3. Add user-level limits for cost-bearing AI endpoints beyond auth.
4. Fix the remaining widget iframe sandbox hardening item.
