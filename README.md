# Primoria

Primoria is an AI-native learning app for adaptive course generation, course-aware tutoring, interactive learning artifacts, and learner memory.

The long-horizon product direction is documented in [docs/long-horizon-learning-principles.md](docs/long-horizon-learning-principles.md). Broader architecture notes live in [docs/product-architecture.md](docs/product-architecture.md).

## Product Focus

Primoria is built for long-term learning rather than one-shot content generation. A learner can describe a goal in natural language, have that goal positioned in a multidisciplinary knowledge graph, receive a grounded course path, work through generated lessons, answer concept-level quizzes, and produce learning evidence that can update mastery, trigger remediation, and feed learner memory.

The core loop is:

1. Position a learner goal against the knowledge graph.
2. Generate a course outline from topics, concepts, prerequisites, and default order.
3. Generate lessons lazily so the first lesson is available quickly and later lessons can adapt.
4. Render mixed learning blocks: explanation, analogy, image, interactive visual, quiz, code, transfer, and review-oriented formats.
5. Record learning events, quiz attempts, feedback, and lesson completion.
6. Update concept mastery and decide whether to continue, skim, or insert remediation.
7. Distill durable learner facts for future tutoring and course planning.

Primoria is aimed at students and self-directed learners working through complex subjects with prerequisite structure, especially mathematics, physics, algorithms, machine learning, software engineering, and other topics where interactive visualization and evidence-driven review are useful.

## Repository Layout

This is a pnpm monorepo:

- `apps/web` - Next.js app: UI, API routes, auth, DB access, course generation, workers, and CopilotKit integration.
- `apps/agent` - LangGraph/deepagents tutor runtime serving the `primoria_tutor` graph.
- `packages/contracts` - shared artifact, chat, and stream contracts.
- `packages/memory` - optional memory-provider package integration.
- `data/knowledge-graphs/source` - committed source-of-truth KG JSON files and sidecars.
- `data/knowledge-graphs/generated` - exported generated graph candidates awaiting review/promotion.
- `docs` - current product, KG, UX, and implementation notes. Task reports and old handoff notes are not kept as project docs.

## Prerequisites

- Node.js 20+
- pnpm 10+ (`corepack enable` is recommended)
- A Docker-compatible runtime for local Postgres. Docker Desktop works, but on
  macOS the current local setup uses Docker CLI + Compose with Colima.
- An OpenAI-compatible or Anthropic-compatible model endpoint.

## Install

```bash
pnpm install
```

## Environment Variables

Create a local environment file for the web app:

```bash
cp apps/web/.env.example apps/web/.env.local
```

For local agent development, copy the relevant server-side values to the agent app:

```bash
cp apps/web/.env.local apps/agent/.env
```

### Model Provider

Configure one provider. OpenAI-compatible is the default.

```bash
AI_PROVIDER=openai-compatible
OPENAI_BASE_URL=https://your-openai-compatible-endpoint/v1
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-5.4
```

```bash
AI_PROVIDER=anthropic-compatible
ANTHROPIC_BASE_URL=https://your-anthropic-compatible-endpoint
ANTHROPIC_API_KEY=your-key
ANTHROPIC_MODEL=your-model
```

### Database, Auth, and Knowledge Graph

Primoria persistence is Postgres-first. Courses, lessons, auth/session data, chat history, lesson jobs, learning events, concept mastery, learner facts, and media assets are stored in Postgres.

Local development defaults to the Docker Compose database in this repository.
It runs `pgvector/pgvector:pg16`, creates the `primoria` database, creates the
`primoria_app` user, and binds Postgres to `127.0.0.1:5432`. `pnpm db:bootstrap`
enables the `vector` extension and installs all schemas.

```bash
DATABASE_URL="postgresql://primoria_app:primoria_dev@127.0.0.1:5432/primoria"
DATABASE_SSL=disable
```

Start the local database before running app processes:

```bash
# If using Colima instead of Docker Desktop:
# brew install docker docker-compose colima
colima start

docker compose up -d postgres
```

The local `primoria_dev` password is only for the Docker development database.
Data is stored in the named Docker volume `primoria-postgres-data`.

The old private Tencent Cloud tunnel is no longer the default local path. Use it
only when intentionally targeting that remote database:

```bash
DATABASE_URL="postgresql://primoria_app:[db-password]@127.0.0.1:15432/primoria"
DATABASE_SSL=false
ssh -N -L 15432:127.0.0.1:5432 ubuntu@<server>
```

Server deployments on the same Tencent Cloud host should use `127.0.0.1:5432`
directly instead of opening port 5432 to the public internet.
For a remote direct connection to a managed Postgres service that requires SSL,
set `DATABASE_SSL=require`.

Check the connection and bootstrap all database schemas. This is the only
schema initialization command for local Docker and production deployments:

```bash
pnpm --filter @primoria/web db:check
pnpm db:bootstrap
```

`db:bootstrap` applies the versioned KG/pgvector schema, Drizzle
App/Auth/Course migrations, and the isolated `agent_runtime` schema. It is safe
to repeat and never calls an external model provider. Each schema keeps its own
owner and migration history.

Knowledge-graph source data and embeddings are initialized separately. For a
new environment, import every graph, cross-subject edge, and embedding with:

```bash
pnpm db:initialize:kg
```

Individual maintenance commands remain available when updating one graph:

```bash
pnpm --filter @primoria/web db:seed:kg <graph-id>
pnpm --filter @primoria/web db:seed:kg-cross
pnpm --filter @primoria/web db:seed:kg-embeddings <graph-id>
```

KG embeddings default to the OpenAI-compatible `/embeddings` API:

```bash
KG_EMBEDDING_PROVIDER=openai-compatible
KG_EMBEDDING_BASE_URL=https://api.openai.com/v1
KG_EMBEDDING_API_KEY=your-embedding-key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
KG_EMBEDDING_MODEL_VERSION=openai:text-embedding-3-small:1536
```

When `KG_EMBEDDING_BASE_URL` and `KG_EMBEDDING_API_KEY` are unset, the
OpenAI-compatible embedding path falls back to `OPENAI_BASE_URL` and
`OPENAI_API_KEY`. Only use that fallback when the chat endpoint also implements
`POST /embeddings`; DeepSeek's chat endpoint does not serve the configured
OpenAI embedding model.

MiniMax native embeddings are also supported. Use this only with a MiniMax Open
Platform key; legacy MiniMax embedding endpoints usually require `GroupId`.

```bash
KG_EMBEDDING_PROVIDER=minimax
MINIMAX_API_KEY=your-minimax-key
MINIMAX_GROUP_ID=your-minimax-group-id
MINIMAX_EMBEDDING_BASE_URL=https://api.minimax.chat/v1
MINIMAX_EMBEDDING_MODEL=embo-01
KG_EMBEDDING_MODEL_VERSION=minimax:embo-01:1536
```

`GET /api/health` reports database connectivity, KG table presence, and whether
embeddings are seeded for the current model version (`ok` / `degraded` /
`unhealthy`). KG infrastructure failures (missing KG tables, unreachable
database, unavailable embedding provider) surface as safe API errors and never
reroute learner goals into generated `gen_*` graphs. For local development
against a database without KG tables, set:

```bash
# Local/dev only. Lets a missing-KG-schema error degrade into the freeform
# out-of-library path instead of failing. Never enable in production.
PRIMORIA_ALLOW_KG_INFRA_FALLBACK=1
```

The email/password session system stores `users`, `identities`, and `sessions`
in Postgres once `DATABASE_URL` is set. Supabase client keys are no longer part
of the Primoria runtime path.

Auth endpoints are rate-limited before password hashing/verification. Defaults:
`AUTH_RATE_LIMIT_IP_MAX=5`, `AUTH_RATE_LIMIT_ACCOUNT_MAX=5`, and
`AUTH_RATE_LIMIT_WINDOW_SECONDS=60`. Proxy IP headers such as
`cf-connecting-ip`, `x-real-ip`, `x-forwarded-for`, and `forwarded` are ignored
unless one exact header is selected with `AUTH_RATE_LIMIT_CLIENT_IP_HEADER`.
Only configure a header that your edge layer overwrites after removing any
client-supplied value. When it is unset or the trusted header has no valid IP,
the app skips the IP bucket and still enforces the per-account bucket.

Password reset uses Tencent Cloud SES through the `SendEmail` API and an
approved email template. The app generates a one-time reset token, stores only
its hash in `otp_codes`, and sends a reset URL through SES. Configure:

```bash
APP_BASE_URL=https://your-primoria-domain.com
EMAIL_PROVIDER=tencent-ses
TENCENT_SES_SECRET_ID=your-secret-id
TENCENT_SES_SECRET_KEY=your-secret-key
TENCENT_SES_REGION=ap-guangzhou
TENCENT_SES_ENDPOINT=ses.tencentcloudapi.com
TENCENT_SES_FROM_EMAIL="Primoria <noreply@your-domain.com>"
TENCENT_SES_PASSWORD_RESET_TEMPLATE_ID=123456
TENCENT_SES_PASSWORD_RESET_SUBJECT="Reset your Primoria password"
PASSWORD_RESET_EXPIRES_MINUTES=30
```

The SES template should expose at least one reset-link variable. Primoria sends
both camelCase and snake_case names so the approved template can use whichever
style Tencent Cloud accepts for the template:
`resetUrl`/`reset_url`, `expiresMinutes`/`expires_minutes`, and
`productName`/`product_name`.

Business setup still required in the Tencent Cloud console:

1. Activate SES for the account that will own production mail.
2. Add and verify a sender domain.
3. Create a sender address such as `noreply@your-domain.com`.
4. Create and wait for approval of the password-reset email template.
5. Create a least-privilege API key that can call SES `SendEmail` and place it
   only in the deployment environment, not in git.

### AI Tutor Agent

The web app talks to Primoria's self-hosted AG-UI Agent runtime through CopilotKit:

```bash
PRIMORIA_AGENT_URL=http://localhost:2024
```

If unset, the web route defaults to `http://localhost:2024`. The service uses
the open-source LangGraph library directly; it does not use LangGraph Agent
Server, LangSmith Deployment, Redis, or a LangGraph production license.

### Optional Capabilities

Image blocks use Gemini image generation when configured:

```bash
GEMINI_API_KEY=your-key
GEMINI_IMAGE_MODEL=gemini-3.1-flash-lite-image
```

If `GEMINI_IMAGE_MODEL` is unset, Primoria uses `gemini-3.1-flash-lite-image` by default. Override it only when you want a different quality/cost tradeoff; output capability limits should be checked against Google's current model documentation.

## Run Locally

### Full Local Stack

The root dev script runs every `dev:*` script in parallel: web app, Primoria Agent runtime, lesson-generation worker, learning-progress worker, and extractor worker.

```bash
docker compose up -d postgres
pnpm dev
```

Expected services:

- Web app: `http://localhost:3000`
- Primoria Agent runtime: `http://localhost:2024`
- Background workers: run in the terminal process and require `DATABASE_URL`.

Route entry points: `/welcome` is the public landing page; `/` is the signed-in
app home and redirects signed-out visitors through `/login`. Signing out
returns to `/welcome`.

### Individual Processes

```bash
# Web app only. AI Tutor still needs PRIMORIA_AGENT_URL to point at a running agent.
pnpm --filter @primoria/web dev

# Primoria Agent runtime only. Applies its runtime migration before starting.
pnpm --filter @primoria/agent dev

# Background workers.
pnpm --filter @primoria/web worker:lesson-generation
pnpm --filter @primoria/web worker:learning-progress
pnpm --filter @primoria/web worker:extractor
```

## Common Commands

```bash
# Type-check the web app
pnpm --filter @primoria/web typecheck

# Lint the web app
pnpm lint

# Build the web app
pnpm build

# Bundle size report (webpack build; reports land in apps/web/.next/analyze/)
ANALYZE=true pnpm --filter @primoria/web exec next build --webpack

# Generate migrations after schema changes
pnpm --filter @primoria/web db:generate

# Verify database connectivity
pnpm --filter @primoria/web db:check

# Apply all KG and App/Auth/Course schema migrations
pnpm db:bootstrap
```

## Tests and Verification

Unit tests run under Vitest:

```bash
# All unit tests
pnpm test

# Watch mode
pnpm --filter @primoria/web test:watch
```

Legacy self-executing `tests/*.unit.ts` scripts are executed through the `tests/legacy-units.spec.ts` bridge; write new tests as native vitest `tests/*.spec.ts` files.

Database-backed and E2E suites remain separate from `pnpm test`, but CI runs them in dedicated jobs:

```bash
# All seven DB-backed tests. TEST_DATABASE_URL must be an isolated database
# whose name contains "test" and must differ from DATABASE_URL.
pnpm test:db

# Browser E2E suites start their own isolated Next dev servers.
pnpm test:learning-path:e2e
pnpm test:widget:e2e

# Agent package and offline real-graph checks
node --check apps/agent/src/graph.mjs
pnpm --filter @primoria/agent typecheck
pnpm test:agent
pnpm test:agent:integration

# Agent run-store and real HTTP/SSE integration (isolated TEST_DATABASE_URL)
pnpm --filter @primoria/agent test:runtime:db

# Production route bundle budgets (run after build)
pnpm --filter @primoria/web build
pnpm --filter @primoria/web bundle:check
```

The learning-path smoke requires `CI_LEARNING_SMOKE=1` and a test `DATABASE_URL`; seed it first with `pnpm --filter @primoria/web exec tsx scripts/seed-ci-learning-smoke.ts`. It exercises real sign-in, course rendering, quiz grading, lesson completion, and progress/extractor job persistence without calling an external model.

## Deployment (Single Server)

Production runs the whole stack on one server (e.g. a Tencent Cloud CVM) with Docker Compose. `docker-compose.prod.yml` defines Postgres, App/KG and Agent-runtime migration jobs, the web app, the self-hosted Agent runtime, three background workers, and Caddy.

Port boundaries: only Caddy (80/443) is reachable from outside. The web app (3000), the agent (2024 — it has no auth of its own and must never be published), the workers, and Postgres stay on the internal compose network; Postgres additionally binds `127.0.0.1:5432` for server-side administration.

### First Deploy

Server prerequisites: Docker Engine with the Compose plugin, and at least 4 GB RAM — the Next.js image build needs it (on a 2 GB machine, add swap first).

```bash
git clone <repo-url> /srv/primoria && cd /srv/primoria
cp .env.production.example .env   # fill in every replace-* value
docker compose -f docker-compose.prod.yml up -d --build

# First deploy only: seed every knowledge graph, cross-graph edge, and embedding.
docker compose -f docker-compose.prod.yml run --rm migrate \
  pnpm --filter @primoria/web db:initialize:kg
```

Startup order is enforced by the compose file: postgres (healthcheck) →
`migrate` (App/KG) → `agent-migrate` (`agent_runtime`) → healthy Agent → Web.
KG data and embedding imports remain separate
because an external model outage must not block a normal application release.

HTTPS: leave `PRIMORIA_DOMAIN` empty to serve plain HTTP on `:80` while testing against a bare IP. Once a DNS A record points your domain at the server, set `PRIMORIA_DOMAIN` (and matching `APP_BASE_URL`/`NEXT_PUBLIC_APP_URL`), open ports 80+443 in the security group, and rerun `up -d --build` — Caddy provisions and renews certificates automatically.

Provider note for mainland-China servers: direct DeepSeek/MiniMax endpoints work there (it is campus/office DNS that blocks them), while OpenRouter is unreliable from the mainland. `.env.production.example` defaults to direct endpoints — the opposite of a campus-network dev setup.

### Updating

```bash
cd /srv/primoria
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

This rebuilds the images, reruns migrations, and restarts only the services whose image or config changed. `NEXT_PUBLIC_*` values are baked into the web bundle at build time, so changing them also requires this rebuild.

### Day-2 Operations

```bash
# Status / logs / restart one service
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f --tail=200 web agent
docker compose -f docker-compose.prod.yml restart worker-extractor

# Requeue failed background jobs (all queues, one queue, or one job)
docker compose -f docker-compose.prod.yml run --rm migrate \
  pnpm --filter @primoria/web jobs:requeue-failed

# Inspect and operate durable Agent runs
pnpm agent:runs:status
pnpm agent:runs:inspect <runId>
pnpm agent:runs:cancel <runId>
# Creates a new run ID and preserves the original run's events for audit.
pnpm agent:runs:retry <runId>
pnpm agent:runs:recover
pnpm agent:runs:prune [retentionDays]
```

### Monitoring and Alerts

`GET /api/health` reports database/KG state plus job-queue backlog (queued/running/failed counts and the age of the oldest queued job per queue). A dead worker surfaces as a stalled queue: once a job waits longer than `PRIMORIA_HEALTH_QUEUE_STALL_SECONDS` (default 600), the overall status flips from `ok` to `degraded`.

The internal Agent service exposes `/health/live` and `/health/ready`; Docker
Compose gates Web startup on Agent readiness. Port 2024 is not an external
monitoring endpoint and must remain private to the Compose network.

Point an uptime probe (Tencent Cloud 云监控 site monitoring, or any external uptime service) at `https://<domain>/api/health` every minute and alert when the response body stops containing `"status":"ok"` — that single check catches DB outages, missing schema, and dead workers.

### Backups

`scripts/pg-backup.sh` dumps the database via `pg_dump` into `/var/backups/primoria` (override with `PRIMORIA_BACKUP_DIR`) and prunes dumps older than 14 days. Schedule it daily:

```bash
sudo install -d -o "$USER" -g "$(id -gn)" -m 700 /var/backups/primoria
crontab -e
# 30 4 * * * /srv/primoria/scripts/pg-backup.sh >> /var/log/primoria-backup.log 2>&1
```

Backups are written through a temporary file and atomically renamed only after
`pg_dump` and gzip both succeed. Files are owner-readable only. The restore
command is documented in the script header.

## CI

`.github/workflows/ci.yml` runs four independent gates on every push/PR to `main`:

- `fast-checks`: Web typecheck/lint/unit, KG source validation, Drizzle migration drift, and Agent syntax/type/unit/offline graph integration.
- `bundle-budget`: production build plus raw/gzip first-load JS budgets from `apps/web/bundle-budgets.json`.
- `database-integration`: `pgvector/pg16`, two consecutive `db:bootstrap` runs, all seven Web DB tests, and Agent run-store/HTTP tests.
- `browser-integration`: an isolated `pgvector/pg16` database, deterministic login-to-course-completion smoke, and Widget renderer E2E.

## Architecture

### Active Tutor Path

There is one active main tutor runtime path:

Browser CopilotKit UI -> `apps/web/src/app/api/copilotkit/route.ts` -> `PrimoriaHttpAgent` -> internal AG-UI `POST /agent` -> `apps/agent/src/graph.mjs`.

The route normalizes Copilot attachments, injects hidden course-detail context when the learner is inside a course, and adds learner profile/fact context for tutor dialogue.

The legacy `POST /api/tutor/chat` stack is no longer an active runtime path. Do not add new main-tutor behavior there.

### State Ownership

The web app owns user state, course creation, learning events, mastery updates, background jobs, and database writes. The tutor agent owns tool orchestration and structured interaction. In the main course-creation path, the agent expresses intent through `position_learning_goal`; the browser/web side performs KG positioning, creates the course, persists records, and enqueues generation jobs.

The agent may read persisted course data for bounded tool behavior such as restoring a course card, but new state-changing behavior should be implemented through web-owned APIs, workers, or repositories rather than direct agent-side database mutation.

### Agent Tooling and Artifacts

The active tutor graph is composed in `apps/agent/src/graph.mjs` from focused modules — `prompts.mjs`, `model.mjs`, `middleware.mjs`, `widget-html.mjs`, and `tools/{visualization,renderers,course,quiz}.mjs`. It uses deepagents with a focused tool surface:

- `position_learning_goal` - the only main-tutor entry for creating a course from a learner goal.
- `get_course_card` - restores a course card from persisted course data.
- `render_chat_quiz` - creates a temporary quiz inside chat without creating a course block or changing mastery.
- `plan_visualization` + `widgetRenderer` - custom interactive HTML widget flow.
- `stemRenderer` - constrained STEM simulations using the subject runtime API.
- `render_chart`, `render_diagram`, `render_physics_scene`, `render_3d_scene`, `render_algorithm`, `render_math_explorer`, `render_wave`, `render_graph`, and `render_molecule` - specialized structured renderers.

`TutorArtifact` types are defined in `packages/contracts/src/artifacts` and re-exported through `apps/web/src/lib/ai/types.ts`. `ToolCard` routes artifacts to renderers in `apps/web/src/components/generative-ui/tool-card.tsx`.

Adding a new artifact type usually requires:

1. Add the shared type and Zod schema in `packages/contracts/src/artifacts` (runtime schemas live in `schemas.mjs` + hand-written `schemas.d.mts`, shared by the agent and the web hook — never `z.any()`).
2. Add a renderer or branch in `ToolCard`.
3. Add or update the agent tool in the matching `apps/agent/src/tools/*.mjs` module.

### Widget Rendering

HTML widgets execute inside a sandboxed iframe. `apps/web/src/components/generative-ui/widget-renderer.tsx` assembles a standalone document around the fragment, theme CSS, SVG/form helpers, a `window.sendPrompt` bridge, and validated dependencies.

Widget HTML must be a fragment: no `<!doctype>`, no `<html>`, `<head>`, or `<body>` wrapper, and no `100vh` app-shell layouts.

External widget dependencies are allowlisted in a single source: `packages/contracts/src/artifacts/widget-dependencies.mjs`. The agent tool, the web normalizer (`apps/web/src/lib/ai/widget-dependencies.ts`), and the iframe bootstrap all import it; `apps/web/tests/widget-dependencies-sync.spec.ts` fails if a copy is reintroduced.

### Course Generation and Learning Progress

Course creation starts with `position_learning_goal`. The browser/web side performs knowledge-graph positioning, resolves the authoritative course context, initializes or reuses the course outline, persists it, and enqueues the first lesson-generation job through `POST /api/learning/course`.

Lessons are made of blocks rather than one long article. Core generated block types include:

- `text` - explanation, hook, roadmap, summary, and examples.
- `analogy` - mapping a difficult concept to a familiar structure.
- `image` - static cognitive anchor generated from an image brief.
- `visual` - interactive visualization rendered through the sandboxed widget pipeline or specialized renderers.
- `quiz` - concept checks that can create learning evidence.
- `code` - runnable or editable code examples for programming and computational topics.
- `transfer` - integrated application that connects concepts or domains.

Additional course block renderers include `mind_map`, `slide`, and `worksheet`.

The course lesson surface is a focused reader, not a long course-detail feed.
`/course/[id]` resolves the active lesson in the client, renders one
`CourseBlock` at a time, and shows step progress as current block / total lesson
blocks. Text, analogy, transfer, image, visual, code, slide, mind-map, quiz, and
worksheet blocks all stay behind `BlockRenderer`; the reader only owns navigation
and layout. Ordinary content steps advance with Continue / Done, while quiz and
worksheet steps keep Check semantics by delegating to the existing practice
controls. Done returns to `/course/[id]/outline`; lesson completion still comes
from quiz/evidence paths.

The lesson reader has its own top bar and returns to the outline with X. It no
longer embeds the upcoming outline below the current lesson. Course Tutor remains
available as a right-side AI rail: collapsed by default, expandable in place,
and scoped to the current course, lesson, visible blocks, selected block, and
selected text.

Lesson materialization is recoverable and worker-driven:

- `worker:lesson-generation` writes planned lesson content.
- `worker:learning-progress` updates concept mastery and produces next-step recommendations after lesson completion.
- `worker:extractor` distills durable learner facts from learning events.

The main persistence tables include `courses`, `lessons`, `lesson_generation_jobs`, `lesson_generation_checkpoints`, `learning_events`, `learning_progress_jobs`, `user_concept_mastery`, `learner_profiles`, `learner_facts`, and `extractor_jobs`.

### Model Provider

`apps/web/src/lib/ai/deepagent/model.ts` and `apps/agent/src/model.mjs` resolve provider settings from environment variables. Supported providers are:

- `openai-compatible`
- `anthropic-compatible`

Provider credentials come only from server-side environment variables. The app does not support BYOK — clients cannot supply their own provider, base URL, or API key.

## Roadmap

The current implementation covers the main personal learning loop: goal positioning, course creation, lazy lesson generation, interactive lesson blocks, quizzes, learning events, concept mastery, learner facts, chat history, and account/session foundations.

Near-term priorities:

- Stabilize remediation after lesson quizzes, including learner choice, navigation, and resume behavior.
- Inject concept mastery into lesson-building prompts so mastered concepts are skimmed and weak concepts receive deeper instruction.
- Improve learner-memory distillation for preferences, pace, depth, blockers, and useful learning moments.
- Keep lesson generation close to the intended micro-learning recipe with balanced text, image, visual, quiz, code, analogy, and transfer blocks.
- Continue hardening the course reader and Course Tutor baseline: current lesson
  context, visible block scope, selected block/text context, revision tools, and
  collapsed AI rail behavior.
- Increase interactive visualization stability across screen sizes and themes.

Longer-term roadmap:

- P0 personal learning loop: goal positioning, course creation, evaluation, remediation, and memory distillation.
- P1 classroom: teacher, student, assignment, and class-learning analytics.
- P2 collective intelligence: shared courses, feedback ranking, and system-level learning from aggregated outcomes.

The former collaborative workspace-agent line (workspace rooms, agent profiles, approvals, skills, DeepAgent runtime) was removed in July 2026 to focus on the personal learning loop; see git history if it needs to be revived.

## Local Data Import

Local JSON files are not a runtime persistence fallback. `.primoria-courses.json` is only supported as an old-data import source:

```bash
pnpm --filter @primoria/web import:local-data you@example.com
```

Create the account in the app before running the import command.

## Key Constraints

- `apps/agent` is plain ESM (`.mjs`). Do not import from `apps/web`.
- Course/user state mutations and DB writes belong in `apps/web` server-side code, scripts, or workers. Client components must never access the DB directly. Agent-side DB access should stay bounded to explicit read-only tool needs unless a new architecture decision says otherwise.
- Main tutor course creation goes through `position_learning_goal` and the web-side KG/course flow.
- Widgets must be iframe fragments and must only use allowlisted external dependencies.
- Long-running course generation, progress updates, and learner-fact extraction run through workers and require `DATABASE_URL`.
- Shared artifact contracts live in `packages/contracts`, not in app-local type files.

## Contribution Workflow

Prefer a feature branch for issue work. Direct `main` commits should be limited
to local maintenance or explicitly requested cleanup.

1. Pick an issue and comment that you are taking it.
2. Create a dedicated branch for that issue.
3. Keep changes focused on that issue.
4. Open a separate pull request for each issue.
5. Include a summary, screenshots for UI changes, and testing notes.
6. Link the issue with `Closes #issue_number` or `Related to #issue_number`.
