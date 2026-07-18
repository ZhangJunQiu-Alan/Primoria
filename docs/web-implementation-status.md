# Primoria Web Implementation Status

Status: current implementation inventory, July 2026.

`apps/web` is the active product surface and product-data owner. It is a
Next.js/React/TypeScript application backed by PostgreSQL and the self-hosted
AG-UI Agent runtime; it is not a static mock and has no Supabase runtime path.

## Implemented product loop

- Self-owned email/password auth, sessions, password reset, and rate limiting.
- Cold-start onboarding for learning goal, KG anchor, background Facts intake,
  Tutor style, first-course readiness, stale-run recovery, and direct fact sync.
- Main CopilotKit Tutor connected to the durable `primoria_tutor` runtime.
- Postgres-backed chat threads and New chat lifecycle.
- KG positioning across library graphs with generated-graph coverage fallback
  and explicit infrastructure-failure handling.
- Concept-frontier course outline initialization (mastery-aware 2–3 concept
  lesson bundles), background title/description enrichment, lazy lesson
  generation, job recovery, and Jump ahead generation.
- One-block-at-a-time lesson reader plus course-aware Tutor rail.
- Text, analogy, image, visual, quiz, code, transfer, mind-map, slide, and
  worksheet block renderers.
- Idempotent course quiz submissions, learning events, concept mastery, and
  post-lesson diagnosis/recommendations.
- Server-authoritative solo progression with an idempotent XP ledger, eight
  guild ranks, three daily quests, course quest map, and ten Profile
  achievements. Full RPG presentation is Profile-only; older learning history
  is excluded by each player's progression start time.
- Durable onboarding/Settings intake jobs plus post-lesson Extractor jobs and
  reviewable/editable/dismissible learner facts across six categories.
- Immutable snapshot course sharing with idempotent import.
- Global user-agnostic generated-image cache.
- Chinese/English interface dictionaries and separate content-language handling.

## Tutor and visualization

The active path is:

```text
Browser CopilotKit
→ /api/copilotkit
→ PrimoriaHttpAgent
→ internal POST /agent
→ apps/agent/src/graph.mjs
```

Visualization is catalog-first:

- 19 all-subject schema-driven React components selected through
  `open_interactive_component`.
- Authenticated Web stage 2 creates a full config or validated minimal patch.
- Structured chart/diagram/STEM/algorithm/math/3D/wave/graph/molecule renderers
  handle off-catalog shapes with known contracts.
- `plan_visualization` + sandboxed `widgetRenderer` remains the custom fallback.
- Catalog, Web registry, Agent routing prior, React widget map, and default
  configs are protected by sync/render tests.
- `visualization.render` telemetry feeds the allowlisted internal report at
  `/internal/visualization-analytics`.
- A fixed 28-case fixture provides repeatable stage-1 routing evaluation.

HTML widgets run in a sandboxed iframe with validated dependency URLs, Primoria
theme tokens, SVG/form helpers, resize and prompt bridges, and deferred script
execution until streaming HTML settles.

## Persistence and workers

PostgreSQL stores App/Auth/Course data, KG/pgvector data, chat history, sharing
snapshots, learner profile/facts, mastery, the progression ledger and
achievements, media, and durable jobs. Three Web
workers consume Postgres queues:

- `worker:lesson-generation`;
- `worker:learning-progress`;
- `worker:extractor`, which prioritizes `profile_fact_intake_jobs` from
  onboarding/Settings and consumes lesson `extractor_jobs` when no intake is
  waiting.

The Agent owns only its isolated `agent_runtime` schema plus the existing
bounded owner-scoped course-card read. Web remains the owner of product writes.

## Runtime configuration

Start from `apps/web/.env.example`; copy relevant server-side provider and DB
values to `apps/agent/.env` for local Agent development.

```env
AI_PROVIDER=openai-compatible
OPENAI_BASE_URL=https://your-endpoint/v1
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-5.4
AI_MODEL_FAST=your-fast-model
AI_MODEL_CONTENT=your-quality-model
DATABASE_URL=postgresql://primoria_app:primoria_dev@127.0.0.1:5432/primoria
DATABASE_SSL=disable
PRIMORIA_AGENT_URL=http://localhost:2024
```

`AI_MODEL_CONTENT` is optional and applies to source comparison and causal
timeline configuration. When unset, those components use the normal default
model rather than `AI_MODEL_FAST`.

Production access to the internal visualization report additionally requires:

```env
PRIMORIA_ENABLE_INTERNAL_ANALYTICS=1
PRIMORIA_INTERNAL_EMAILS=operator@example.com
```

## Verification baseline

Primary gates:

```bash
pnpm --filter @primoria/web typecheck
pnpm lint
pnpm --filter @primoria/web test
pnpm catalog:validate
pnpm --filter @primoria/web test:interactive-routing
pnpm --filter @primoria/agent typecheck
pnpm --filter @primoria/agent test
pnpm --filter @primoria/agent test:integration
pnpm build
```

DB-backed and browser suites remain separate CI gates. The latest local
catalog-routing run passed all 28 real-model cases; this result is evidence, not
a permanent guarantee, so rerun the evaluator after catalog or prompt changes.

## Remaining hardening

1. Accumulate 2–4 weeks of real visualization traffic before selecting the
   next component batch.
2. Deepen high-value humanities interactions before optimizing for component count.
3. Close the full remediation/resume loop, including cross-graph prerequisites.
4. Improve learner-fact extraction quality, review, correction, and decay.
5. Observe XP pace and quest completion quality before changing the fixed
   launch economy; do not add competitive or social progression implicitly.
6. Keep browser QA representative across text, visual, code, quiz, worksheet,
   course sharing, onboarding, and Tutor patch flows.
