# Primoria Agent

LangGraph/deepagents runtime for the Primoria AI Tutor. It serves the `primoria_tutor` graph declared in the repository-root `langgraph.json` and implemented in `apps/agent/src/graph.mjs`.

## Local Development

From the repository root:

```bash
pnpm install
cp apps/web/.env.local apps/agent/.env
pnpm --filter @primoria/agent dev
```

The dev script loads `apps/agent/.env` when present and runs `langgraphjs dev --config ../../langgraph.json --host 127.0.0.1 --no-browser`, serving the graph at `http://localhost:2024`. Keep the LangGraph config at the repository root so deployment packages the shared workspace packages under `packages/`, including `@primoria/contracts`.

The Next.js app talks to this graph through CopilotKit in `apps/web/src/app/api/copilotkit/route.ts`, using a `LangGraphAgent` subclass (`PrimoriaLangGraphAgent`) with `graphId: "primoria_tutor"`.

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

Set `DATABASE_URL` when tools need to read persisted course data, such as restoring course cards. Course creation itself is initiated by the agent with `position_learning_goal`, then performed by the web app's KG/course-generation flow.

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
pnpm --filter @primoria/agent test:course-store
```
