# Primoria Web Implementation Status

Status: current implementation inventory, code checked 2026-10-25.

`apps/web` is the active product surface and product-data owner. It is a
Next.js/React/TypeScript application backed by PostgreSQL and the self-hosted
AG-UI Agent runtime. The selected shared deployment uses managed Supabase
PostgreSQL/pgvector and private Supabase Storage for lesson images, accessed
server-side. Authentication and product writes remain Web-owned; there is no
browser Supabase SDK/Auth path. Local PostgreSQL remains an isolated/offline
option. See the [Chinese feature inventory](product/feature-inventory.md) for
page/API evidence and explicit implementation-versus-verification boundaries.

## Implemented product loop

- Self-owned email/password auth, sessions, password reset, and rate limiting.
- Cold-start onboarding for learning goal, KG anchor, confirmed education
  stage/curriculum, optional background Facts intake, unchanged Tutor Style,
  first-course readiness, stale-run recovery, and asynchronous fact extraction
  after durable enqueue. Region only narrows uncommitted curriculum candidates;
  multi-candidate contexts require an inline learner choice.
- Main CopilotKit Tutor connected to the durable `primoria_tutor` runtime.
- Tutor style (Socratic / Feynman explain-plus-teach-back / Euclid) rendered as
  a system-prompt persona for the main Tutor and concept subagent; changeable
  in Settings; per-style real-model eval in `apps/agent/evals/tutor-style.v1.json`.
- Postgres-backed chat threads and New chat lifecycle.
- KG positioning across a 31-graph runtime registry with canonical,
  topic/concept closure, and goal-scoped routes; deterministic cross-subject
  targets where approved; generated/hybrid fallback for missing outcomes; and
  explicit infrastructure-failure handling. All 31 source graphs are approved;
  the 10 China/Singapore graphs, with their curricula and pedagogy records,
  were approved by the project owner on 2026-10-25.
- A cold-start routing gate (on by default; `PRIMORIA_REQUIRE_APPROVED_KG=0`
  opts out) selects approved graph anchors when available, without unregistering
  graphs or disabling existing-course resolution; it retains the full candidate
  library if no approved graphs exist.
- Concept-frontier course outline initialization (mastery-aware 2–3 concept
  lesson bundles), background title/description enrichment, lazy lesson
  generation, job recovery, and Jump ahead generation.
- One-block-at-a-time lesson reader plus course-aware Tutor rail.
- Text, analogy, image, visual, quiz, code, transfer, mind-map, slide, and
  worksheet block renderers.
- Natural-language course block rewrite, add, transform, remove, and move via
  owner-scoped Web APIs; selected text can narrow a rewrite. Code and mind-map
  edits persist. Python/JavaScript run in a browser Web Worker with an execution
  timeout; Python loads Pyodide separately from that execution budget.
- Course library search, status filters, sorting, pagination, generation status,
  course deletion, and share management.
- Recoverable idempotent course quiz submissions (stable retry id across
  response loss/reload), learning events, concept mastery, and exact
  persisted-next-lesson diagnosis/recommendations. Recommendation acceptance is
  atomic with lesson materialization; course completion events/rewards are
  deferred until a clean mastery decision.
- Server-authoritative solo progression with an idempotent XP ledger, eight
  guild ranks, three daily quests, course quest map, and ten Profile
  achievements. Full RPG presentation is Profile-only; older learning history
  is excluded by each player's progression start time.
- Durable onboarding/Settings intake jobs plus post-lesson Extractor jobs and
  reviewable/editable/dismissible learner facts across six categories.
- Immutable snapshot course sharing with idempotent import.
- Subject folders for uploaded materials (Unsorted inbox, lecture/reference
  roles, filename-number, AI, and manual lecture order) with per-lecture KG jobs
  (`material_kg_jobs` in the Extractor worker) assembled into one private folder
  KG, a lecture-by-lecture KG overview with mastery, and weakness-weighted
  single-choice folder quizzes with a reusable grounded question bank and
  rolling-window mastery, and one concept-frontier course per folder with
  "sync new content" for later lectures.
- Learner-uploaded study materials (`/materials`; PDF/DOCX/Markdown/TXT text
  extraction and chunking) that build owner-private `mat_*` course graphs with
  per-concept source citations, material-grounded lesson generation,
  concept-level source attribution, private lesson images, and no share links
  (`docs/product/learning-materials.md`).
- Global user-agnostic generated-image cache (owner-scoped only for material
  courses).
- Material-course Tutor retrieval over owner-scoped source chunks using BM25,
  optional pgvector similarity, and current-lesson sources, with citation and
  labelled-supplement prompt rules. This is course-rail-only; the main Tutor
  does not search personal materials.
- `/stats` numeric daily/lifetime summaries and a 30-day activity heatmap;
  `/weekly-report` event-based weekly totals, daily activity, best day, and
  courses worked on. Planned learning minutes are course estimates, not measured
  time spent. Neither page is an automated email report.
- Chinese/English interface dictionaries and separate content-language handling.

Temporary chat quizzes do not write course mastery. Folder quizzes write
rolling-window mastery without question XP; their mastery transitions can count
toward quests/achievements. Uploads store extracted text, not original bytes,
and accept PDF/DOCX/Markdown/TXT up to 8 MiB per material; scanned-image OCR is
not implemented. Material courses and their images stay owner-private and
cannot be shared.

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

- Versioned all-subject schema-driven React components selected through
  `open_interactive_component`; 49 registered components, with bounded catalog
  search instead of inlining the complete catalog above 40 entries.
- Authenticated Web stage 2 creates a full config or validated minimal patch.
- Interactive instances are owner-scoped database records with immutable initial
  configs and optimistic revisions for user control changes. Chat history restores
  completed tool signals, then reads the saved config without another model call.
  Each owner keeps the 2,000 most recently used instances (saved or reopened;
  `INTERACTIVE_COMPONENT_INSTANCE_MAX_PER_OWNER`); a pruned chat card regenerates
  through the budgeted POST path.
- Course VisualBlocks support the same versioned `engine: interactive` payload;
  Web validates generated and shared configurations before persistence. Both
  course and chat render the component directly with its explanation.
- A generated bilingual catalog index serves bounded read-only local retrieval;
  widgets and their schemas load on demand. Static acceptance replay uses these
  production widgets with captured configs and no application/model API access.
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
execution until streaming HTML settles and the authenticated shell-ready
handshake arrives. JSON generation rejects truncated outer values rather than
accepting a complete nested fragment. Course block writers retain the selected
model tier with non-thinking structured writes, and checkpoints invalidate when
the prompt/compiler or catalog context changes.

## Persistence and workers

PostgreSQL stores App/Auth/Course data, KG/pgvector data, chat history, sharing
snapshots, learner profile/facts, mastery, the progression ledger and
achievements, media, and durable jobs. Goal-scoped onboarding anchors persist
multiple target concept ids and scope. Courses use `scope_key` for exact
owner+scope reuse, allowing canonical and goal-specific courses from the same
KG to coexist. Three Web
workers consume Postgres queues:

- `worker:lesson-generation`;
- `worker:learning-progress`;
- `worker:extractor`, which prioritizes `profile_fact_intake_jobs` from
  onboarding/Settings, also processes per-lecture `material_kg_jobs`, and consumes
  lesson `extractor_jobs`.

The Agent owns only its isolated `agent_runtime` schema plus the existing
bounded owner-scoped course-card read. Web remains the owner of product writes.

The active lesson image store uses a private `lesson-media` bucket when
`SUPABASE_URL` and `SUPABASE_SECRET_KEY` are configured; without Storage config,
the media code supports PostgreSQL byte storage for local/isolated environments.
`/api/health` and `/api/health/ready` check DB/KG/embeddings, queues, worker
heartbeats, and Agent readiness; `/api/health/live` is the separate liveness probe.

The optional `packages/memory`/Mem0 call sites belong to the retained standalone
`/api/courses/[id]/chat` API, not the active CopilotKit course rail. Teaching-form
experiments exist behind `PRIMORIA_METHOD_ARMS=1` and are off by default; see
[`teaching-method-experiment.md`](teaching-method-experiment.md).

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
AI_MODEL_TUTOR=your-tutor-model
DATABASE_URL=postgresql://primoria_app:primoria_dev@127.0.0.1:5432/primoria
DATABASE_SSL=disable
PRIMORIA_AGENT_URL=http://localhost:2024
```

`AI_MODEL_CONTENT` is optional and applies to source comparison and causal
timeline configuration. When unset, those components use the normal default
model rather than `AI_MODEL_FAST`.

The selected DeepSeek split uses `deepseek-flash` for `AI_MODEL_TUTOR` and
`AI_MODEL_FAST`, while the Web default remains `deepseek-v4-pro`. The Agent's
Tutor override is independent of the Web course-generation model. DeepSeek
utility calls disable thinking; other Web fast-tier calls (including profile
intake and lesson fact distillation) explicitly use low
thinking effort. Other providers and the quality model keep their existing
behavior.

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
pnpm test:learning-goal-routing
pnpm --filter @primoria/agent typecheck
pnpm --filter @primoria/agent test
pnpm --filter @primoria/agent test:integration
pnpm build
```

DB-backed and browser suites remain separate CI gates. The routing fixture has
28 cases; validate-only checks and real-model evaluation are distinct. Older
successful real-model runs remain dated evidence, not a current guarantee;
rerun the evaluator after catalog or prompt changes.
Learning-goal routing has a permanent 1,718-case bilingual corpus with a
1,718-case minimum, gold-policy invariants, deterministic course-scope checks,
and a CI gate. Historical real-model results for the two reported production
regressions are recorded in `docs/knowledge-graph/learning-goal-routing.md`.

The fixture covers all 31 runtime graphs, including bilingual labels and manual
boundary coverage for the 10 China/Singapore graphs. The curriculum gate keeps
shared school subjects behind explicit goal context, explicit learner facts, or
clarification before course creation.

## Remaining hardening

Tutor-triggered course preparation shares browser deadlines in
`apps/web/src/lib/courses/course-build-timeouts.ts`: positioning waits up to
120 seconds, outline preparation up to 180 seconds, and a pending course card
becomes stale after their combined budget plus 30 seconds (330 seconds). These
are maximum waits, not added delays. First-lesson generation remains an
independent durable worker job. Server model deadlines, Tutor streaming and
onboarding preparation retain their separate lifecycles; durable polling for
the initial preparation request remains future work.

1. Review the high root-concept counts reported by `validate:kg` for all 10 new
   graphs; add justified prerequisite coverage or explicitly approve the entry
   points rather than suppressing the warnings.
2. Accumulate 2–4 weeks of real visualization traffic before selecting the
   next component batch.
3. Deepen high-value humanities interactions before optimizing for component count.
4. Close the full remediation/resume loop, including cross-graph prerequisites.
5. Improve learner-fact extraction quality, review, correction, and decay.
6. Observe XP pace and quest completion quality before changing the fixed
   launch economy; do not add competitive or social progression implicitly.
7. Keep browser QA representative across text, visual, code, quiz, worksheet,
   course sharing, onboarding, and Tutor patch flows.
8. Reduce Stage-2 learning-goal routing latency while preserving the fail-closed
   KG coverage policy.
