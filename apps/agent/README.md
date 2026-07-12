# Primoria Agent

Self-hosted Node/AG-UI runtime for the Primoria AI Tutor. It invokes the open-source LangGraph/deepagents graph in `apps/agent/src/graph.mjs` directly and does not use the commercial LangGraph Agent Server.

## Local Development

From the repository root:

```bash
pnpm install
cp apps/web/.env.local apps/agent/.env
pnpm --filter @primoria/agent dev
```

The dev script loads `apps/agent/.env`, applies the `agent_runtime` migration,
and starts `src/server.mjs` with Node watch mode on `http://localhost:2024`.

The Next.js app uses `PrimoriaHttpAgent` to send AG-UI input to `POST /agent`. Runs, emitted events, leases, cancellation state, and LangGraph checkpoints are persisted in PostgreSQL's `agent_runtime` schema.

## Required Environment

The agent needs the same model-provider settings as the web app:

```bash
AI_PROVIDER=openai-compatible
OPENAI_BASE_URL=https://your-openai-compatible-endpoint/v1
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-5.4
```

or:

```bash
AI_PROVIDER=anthropic-compatible
ANTHROPIC_BASE_URL=https://your-anthropic-compatible-endpoint
ANTHROPIC_API_KEY=your-key
ANTHROPIC_MODEL=your-model
```

`DATABASE_URL` is required. Agent-owned runtime tables and checkpoints use the isolated `agent_runtime` schema; bounded course-card reads still use App tables. Course creation remains Web-owned.

For local development, use the same Docker Compose database as the web app:

```bash
docker compose up -d postgres
DATABASE_URL=postgresql://primoria_app:primoria_dev@127.0.0.1:5432/primoria
DATABASE_SSL=disable
```

## Verification

```bash
node --check apps/agent/src/graph.mjs
pnpm --filter @primoria/agent typecheck
pnpm --filter @primoria/agent test
pnpm --filter @primoria/agent test:runtime:db
```
