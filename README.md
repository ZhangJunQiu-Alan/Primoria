# Primoria

Primoria is an AI-native learning workspace for generating short courses, interactive learning widgets, course-aware tutoring, and future classroom/workspace collaboration flows.

The main product direction is documented in [docs/long-horizon-learning-principles.md](docs/long-horizon-learning-principles.md).

The repository is a pnpm monorepo with two main apps:

- `apps/web` — Next.js web app, course library, tutor UI, course detail pages, API routes.
- `apps/agent` — LangGraph agent used by the CopilotKit path.

## Prerequisites

- Node.js 20+
- pnpm 10+ (`corepack enable` is recommended)
- An OpenAI-compatible or Anthropic-compatible model endpoint

## Install

```bash
pnpm install
```

## Environment variables

Create a local environment file for the web app:

```bash
cp apps/web/.env.example apps/web/.env.local
```

At minimum, configure one model provider.

### OpenAI-compatible provider

```bash
AI_PROVIDER=openai-compatible
OPENAI_BASE_URL=https://your-openai-compatible-endpoint/v1
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-5.4
```

### Anthropic-compatible provider

```bash
AI_PROVIDER=anthropic-compatible
ANTHROPIC_BASE_URL=https://your-anthropic-compatible-endpoint
ANTHROPIC_API_KEY=your-key
ANTHROPIC_MODEL=your-model
```


### Supabase cloud database and accounts

Primoria currently uses Postgres for account creation, user sessions, CopilotKit chat history, provider settings, generated courses, and workspace collaboration state. For team collaboration, use a shared Supabase cloud Postgres database.

```bash
DATABASE_URL="postgresql://postgres.[project-ref]:[db-password]@[pooler-host].pooler.supabase.com:5432/postgres"
```

Create the Supabase project at `https://database.new`, copy the Session Pooler URI from the dashboard Connect panel, replace the password placeholder, and put the value in `apps/web/.env.local` or the hosted app environment variables. Do not guess the pooler host from the region; Supabase may use hosts such as `aws-0-...` or `aws-1-...`.

Then verify the cloud connection and run migrations:

```bash
pnpm --filter @primoria/web db:check
pnpm --filter @primoria/web db:migrate
```

See `docs/supabase-cloud.md` for the full cloud setup runbook. The database layer remains Postgres-first and vendor-portable; Supabase is the current shared cloud provider, but application code should rely on Primoria repositories rather than direct vendor-specific calls.

Initial auth support includes:

- `users`
- `identities`
- `sessions`
- reserved `otp_codes` for future phone/email OTP login
- email + password sign-up/sign-in
- HTTP-only session cookies

Local JSON files are no longer used as a runtime fallback in the database-backed app. Use the import command only for one-time migration of older local data into a database account:

```bash
pnpm --filter @primoria/web import:local-data you@example.com
```

Create the account in the app before running the import command.

### Optional CopilotKit / LangGraph mode

The default web tutor can run directly through the Next.js API routes. If you want to use the CopilotKit + LangGraph agent path, also set:

```bash
NEXT_PUBLIC_USE_COPILOTKIT=1
LANGGRAPH_DEPLOYMENT_URL=http://localhost:2024
```

Then copy the same provider settings into the agent app:

```bash
cp apps/web/.env.local apps/agent/.env
```

## Run locally

### Recommended full dev mode

This starts both the web app and the LangGraph agent:

```bash
pnpm dev
```

Expected local services:

- Web app: `http://localhost:3000`
- LangGraph agent: `http://localhost:2024`

### Web app only

Use this if `NEXT_PUBLIC_USE_COPILOTKIT` is not enabled:

```bash
pnpm --filter @primoria/web dev
```

Open:

```text
http://localhost:3000
```

### Agent only

```bash
pnpm --filter @primoria/agent dev
```

The agent exposes the `primoria_tutor` graph declared in `apps/agent/langgraph.json`.

## Common development commands

```bash
# Type-check the web app
pnpm --filter @primoria/web typecheck

# Build the web app
pnpm build

# Lint the web app
pnpm lint

# Generate database migrations after schema changes
pnpm --filter @primoria/web db:generate

# Verify DATABASE_URL connectivity
pnpm --filter @primoria/web db:check

# Apply database migrations when DATABASE_URL is configured
pnpm --filter @primoria/web db:migrate
```

## Useful test / verification commands

```bash
# Widget export and STEM renderer unit checks
node_modules/.pnpm/node_modules/.bin/tsx apps/web/tests/widget-export.unit.ts
node_modules/.pnpm/node_modules/.bin/tsx apps/web/tests/stem-code.unit.ts

# Check agent graph syntax
node --check apps/agent/src/graph.mjs
```

## Product areas

Current roadmap issues live in GitHub Issues. Major planned areas include:

- Course Copilot context and actions
- Markdown rendering for course detail pages
- Interactive widget stability
- 3D interactive UI
- Long-term memory / mem0-style integration
- Account creation and identity
- Workspace communication for teachers, students, and homework

## Contribution workflow

Please do not push directly to `main` for issue work.

1. Pick an issue and comment that you are taking it.
2. Create a dedicated branch for that issue.
3. Keep changes focused on that issue only.
4. Open a separate pull request for each issue.
5. Include a summary, screenshots for UI changes, and testing notes.
6. Link the issue with `Closes #issue_number` or `Related to #issue_number`.

## Local data files

During local development, generated courses may be stored in workspace-level JSON files such as:

- `.primoria-courses.json`

Treat these as local development artifacts unless intentionally adding fixtures.
