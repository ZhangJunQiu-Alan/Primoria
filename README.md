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
`primoria_app` user, enables the `vector` extension, and binds Postgres to
`127.0.0.1:5432`.

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

Check the connection and apply Drizzle migrations:

```bash
pnpm --filter @primoria/web db:check
pnpm --filter @primoria/web db:migrate
```

Knowledge-graph seeding and embedding maintenance use separate scripts:

```bash
pnpm --filter @primoria/web db:migrate:kg
pnpm --filter @primoria/web db:seed:kg
pnpm --filter @primoria/web db:seed:kg-cross
pnpm --filter @primoria/web db:seed:kg-embeddings
```

or, for the common migration + KG seed + embedding flow:

```bash
pnpm --filter @primoria/web db:sync:kg
```

KG embeddings default to the OpenAI-compatible `/embeddings` API:

```bash
KG_EMBEDDING_PROVIDER=openai-compatible
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
KG_EMBEDDING_MODEL_VERSION=openai:text-embedding-3-small:1536
```

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

The email/password session system stores `users`, `identities`, and `sessions`
in Postgres once `DATABASE_URL` is set. Supabase client keys are no longer part
of the Primoria runtime path.

Auth endpoints are rate-limited before password hashing/verification. Defaults:
`AUTH_RATE_LIMIT_IP_MAX=5`, `AUTH_RATE_LIMIT_ACCOUNT_MAX=5`, and
`AUTH_RATE_LIMIT_WINDOW_SECONDS=60`. Proxy IP headers such as
`cf-connecting-ip`, `x-real-ip`, `x-forwarded-for`, and `forwarded` are ignored
unless `AUTH_RATE_LIMIT_TRUST_PROXY_HEADERS=true`; only enable that when your
edge layer overwrites client-supplied forwarding headers.

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

The web app talks to the LangGraph agent through CopilotKit:

```bash
LANGGRAPH_DEPLOYMENT_URL=http://localhost:2024
```

If unset, the web route defaults to `http://localhost:2024`.

### Optional Capabilities

Image blocks use Gemini image generation when configured:

```bash
GEMINI_API_KEY=your-key
GEMINI_IMAGE_MODEL=gemini-3.1-flash-lite-image
```

If `GEMINI_IMAGE_MODEL` is unset, Primoria uses `gemini-3.1-flash-lite-image` by default. Override it only when you want a different quality/cost tradeoff; output capability limits should be checked against Google's current model documentation.

## Run Locally

### Full Local Stack

The root dev script runs every `dev:*` script in parallel: web app, LangGraph agent, lesson-generation worker, learning-progress worker, and extractor worker.

```bash
docker compose up -d postgres
pnpm dev
```

Expected services:

- Web app: `http://localhost:3000`
- LangGraph agent: `http://localhost:2024`
- Background workers: run in the terminal process and require `DATABASE_URL`.

### Individual Processes

```bash
# Web app only. AI Tutor still needs LANGGRAPH_DEPLOYMENT_URL to point at a running agent.
pnpm --filter @primoria/web dev

# LangGraph agent only.
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

# Generate migrations after schema changes
pnpm --filter @primoria/web db:generate

# Verify database connectivity
pnpm --filter @primoria/web db:check

# Apply Drizzle migrations
pnpm --filter @primoria/web db:migrate
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

Database-backed and E2E suites are not part of `pnpm test`:

```bash
# DB-backed tests (require DATABASE_URL)
pnpm --filter @primoria/web test:lesson-jobs:db
pnpm --filter @primoria/web test:progress:db
pnpm --filter @primoria/web test:extractor:db

# Widget browser E2E (requires a running app)
pnpm --filter @primoria/web test:widget:e2e

# Agent graph syntax and package checks
node --check apps/agent/src/graph.mjs
pnpm --filter @primoria/agent typecheck
pnpm --filter @primoria/agent test:course-store
```

Some E2E tests start their own isolated Next dev server; others expect a running app. Check the test file before running long E2E suites.

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main`: install, type-check, lint, unit tests, and an agent graph syntax check.

## Architecture

### Active Tutor Path

There is one active main tutor runtime path:

Browser CopilotKit UI -> `apps/web/src/app/api/copilotkit/route.ts` -> `PrimoriaLangGraphAgent` / `LangGraphAgent(graphId: "primoria_tutor")` -> `apps/agent/src/graph.mjs`.

The route normalizes Copilot attachments, injects hidden course-detail context when the learner is inside a course, and adds learner profile/fact context for tutor dialogue.

The legacy `POST /api/tutor/chat` stack is no longer an active runtime path. Do not add new main-tutor behavior there.

### State Ownership

The web app owns user state, course creation, learning events, mastery updates, background jobs, and database writes. The tutor agent owns tool orchestration and structured interaction. In the main course-creation path, the agent expresses intent through `position_learning_goal`; the browser/web side performs KG positioning, creates the course, persists records, and enqueues generation jobs.

The agent may read persisted course data for bounded tool behavior such as restoring a course card, but new state-changing behavior should be implemented through web-owned APIs, workers, or repositories rather than direct agent-side database mutation.

### Agent Tooling and Artifacts

The active tutor graph is defined in `apps/agent/src/graph.mjs`. It uses deepagents with a focused tool surface:

- `position_learning_goal` - the only main-tutor entry for creating a course from a learner goal.
- `get_course_card` - restores a course card from persisted course data.
- `render_chat_quiz` - creates a temporary quiz inside chat without creating a course block or changing mastery.
- `plan_visualization` + `widgetRenderer` - custom interactive HTML widget flow.
- `stemRenderer` - constrained STEM simulations using the subject runtime API.
- `render_chart`, `render_diagram`, `render_physics_scene`, `render_3d_scene`, `render_algorithm`, `render_math_explorer`, `render_wave`, `render_graph`, and `render_molecule` - specialized structured renderers.

`TutorArtifact` types are defined in `packages/contracts/src/artifacts` and re-exported through `apps/web/src/lib/ai/types.ts`. `ToolCard` routes artifacts to renderers in `apps/web/src/components/generative-ui/tool-card.tsx`.

Adding a new artifact type usually requires:

1. Add the shared type in `packages/contracts/src/artifacts`.
2. Add a renderer or branch in `ToolCard`.
3. Add or update the agent tool schema in `apps/agent/src/graph.mjs`.

### Widget Rendering

HTML widgets execute inside a sandboxed iframe. `apps/web/src/components/generative-ui/widget-renderer.tsx` assembles a standalone document around the fragment, theme CSS, SVG/form helpers, a `window.sendPrompt` bridge, and validated dependencies.

Widget HTML must be a fragment: no `<!doctype>`, no `<html>`, `<head>`, or `<body>` wrapper, and no `100vh` app-shell layouts.

External widget dependencies are normalized and allowlisted in both `apps/web/src/lib/ai/widget-dependencies.ts` and `apps/agent/src/graph.mjs`. Keep those lists in sync.

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

`apps/web/src/lib/ai/deepagent/model.ts` and `apps/agent/src/graph.mjs` resolve provider settings from environment variables. Supported providers are:

- `openai-compatible`
- `anthropic-compatible`

The web app also supports per-request provider settings where explicitly wired.

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
