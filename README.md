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
- `packages/domain` - shared domain logic for agent context, memory, events, and signals.
- `packages/memory` - optional memory-provider package integration.

## Prerequisites

- Node.js 20+
- pnpm 10+ (`corepack enable` is recommended)
- Postgres. Supabase cloud Postgres is the current shared provider.
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

```bash
DATABASE_URL="postgresql://postgres.[project-ref]:[db-password]@[pooler-host].pooler.supabase.com:5432/postgres"
```

Use the Supabase Dashboard Connect panel to copy the Session Pooler URI. Replace only the password placeholder; do not guess the pooler host.

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

The main email/password session system stores `users`, `identities`, and `sessions` in Postgres once `DATABASE_URL` is set. Supabase-client/RLS-backed paths also need the public project values from the Supabase dashboard:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-anon-key
```

See [docs/supabase-cloud.md](docs/supabase-cloud.md) for the cloud setup runbook.

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
GEMINI_IMAGE_MODEL=gemini-3.1-flash-image
```

## Run Locally

### Full Local Stack

The root dev script runs every `dev:*` script in parallel: web app, LangGraph agent, lesson-generation worker, learning-progress worker, and extractor worker.

```bash
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

There is no single all-project test runner. Run the suite that matches the area you changed.

```bash
# Widget and renderer checks
pnpm --filter @primoria/web test:widget
pnpm --filter @primoria/web test:widget:e2e

# Knowledge graph, positioning, and course planning
pnpm --filter @primoria/web test:kg

# Lesson image generation pipeline
pnpm --filter @primoria/web test:image

# Recoverable lesson-generation jobs
pnpm --filter @primoria/web test:lesson-jobs
pnpm --filter @primoria/web test:lesson-jobs:db

# Learning-progress and mastery decisions
pnpm --filter @primoria/web test:progress
pnpm --filter @primoria/web test:progress:db

# Extractor and learner-fact pipeline
pnpm --filter @primoria/web test:extractor
pnpm --filter @primoria/web test:extractor:db

# Agent graph syntax and package checks
node --check apps/agent/src/graph.mjs
pnpm --filter @primoria/agent typecheck
pnpm --filter @primoria/agent test:course-store
```

Database-backed tests require `DATABASE_URL`. Some E2E tests start their own isolated Next dev server; others expect a running app. Check the test file or the relevant docs before running long E2E suites.

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

`TutorArtifact` types are defined in `packages/contracts/src/artifacts`. `ToolCard` routes artifacts to renderers in `apps/web/src/components/generative-ui/tool-card.tsx`.

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
- Improve course-detail tutor context for the current course, lesson, block, selected text, and concept.
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

Do not push directly to `main` for issue work.

1. Pick an issue and comment that you are taking it.
2. Create a dedicated branch for that issue.
3. Keep changes focused on that issue.
4. Open a separate pull request for each issue.
5. Include a summary, screenshots for UI changes, and testing notes.
6. Link the issue with `Closes #issue_number` or `Related to #issue_number`.
