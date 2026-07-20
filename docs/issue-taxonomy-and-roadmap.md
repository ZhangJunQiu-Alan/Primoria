# Primoria Issue Taxonomy And Roadmap

## Purpose

Primoria is moving from a course and widget generator into an adaptive learning
system. The issue system should make that shift explicit so product ideas,
agent work, PRs, and implementation slices stay aligned.

Status note, July 2026: the active implementation is the personal learning loop.
The former collaborative workspace-agent runtime was removed from the codebase.
Workspace/classroom issues should be treated as future scope, not existing
runtime follow-up.

The working product loop is:

```text
learner goal
-> course / artifact generation
-> practice or interaction
-> learning signal
-> diagnosis / decision
-> course, memory, task, or artifact update
-> better next run
```

Issues should identify which part of this loop they improve.

## Label Taxonomy

Use four label families on implementation issues:

- `type:*` says what kind of work this is.
- `area:*` says which product/system surface owns it.
- `priority:*` says sequencing pressure.
- `status:*` says planning state.

### Type Labels

| Label | Use for |
| --- | --- |
| `type:roadmap` | Umbrella direction, not one PR. |
| `type:learning-signal` | Attempts, mastery, weak concepts, revision evidence, adaptive decisions. |
| `type:knowledge-graph` | Source graphs, curriculum governance, stable IDs, routing coverage, and KG quality gates. |
| `type:course-tutor` | Course detail assistant context, selected text, block edits, course patching. |
| `type:renderer` | HTML/React/widget/artifact rendering runtime. |
| `type:classroom` | Future classroom, assignments, class/team flows, and collaboration. |
| `type:agent-runtime` | Tutor graph runtime, tool orchestration, model/provider behavior, and future agent productization. |
| `type:memory` | Reviewable memory, preference extraction, long-term personalization. |
| `type:data-architecture` | Database, portability, service boundaries, infra abstractions. |
| `type:sharing` | Published courses, learning paths, community or teacher distribution. |
| `type:onboarding` | Cold-start learner preferences and first-run setup. |
| `type:progression` | Private XP, guild levels, daily quests, streaks, achievements, and reward feedback. |
| `type:refactor` | Behavior-preserving structure extraction and maintainability work. |
| `type:search` | Search/retrieval/discovery work across messages, artifacts, memory, issues, or learning evidence. |

### Area Labels

| Label | Use for |
| --- | --- |
| `area:adaptive-learning` | System-level learning loop and mastery decisions. |
| `area:knowledge-graph` | KG source/runtime artifacts, curriculum evidence, embeddings, routing, and review gates. |
| `area:course` | Course generation, blocks, course detail, course edits. |
| `area:artifact` | Generated artifact representation, renderers, saved outputs. |
| `area:classroom` | Future classroom and collaboration surfaces. |
| `area:agent` | Tutor runtime, tools, model-provider configuration, and future agent surfaces. |
| `area:memory` | Memory review, extraction, preference state. |
| `area:profile` | Learner identity, personal progression, achievements, and profile-only RPG presentation. |
| `area:infra` | Data architecture, deployment, CI, service abstractions. |

### Priority Labels

| Label | Meaning |
| --- | --- |
| `priority:P0` | Unblocks the adaptive learning loop or removes a major implementation blocker. |
| `priority:P1` | Important product capability after the P0 loop is stable. |
| `priority:P2` | Expansion work after core loops exist. |
| `priority:P3` | Later ecosystem, polish, or scale work. |

### Status Labels

| Label | Meaning |
| --- | --- |
| `status:umbrella` | Broad roadmap issue that should be split before implementation. |
| `status:ready` | Small enough for a focused PR. |
| `status:needs-slice` | Valuable but still too broad or under-specified. |
| `status:blocked` | Waiting on another issue or external decision. |
| `status:baseline` | A usable baseline exists in the current product; future issues should be narrow hardening slices. |

## Tracker Synchronization

Do not maintain a hand-written issue-number mapping in this document. The July
2026 mapping reused numbers from an older Builder-era tracker and no longer
matched the actual GitHub issues.

Before planning against the external tracker, read it directly:

```bash
gh issue list --repo ZhangJunQiu-Alan/Primoria --state all --limit 100
```

Then either relabel/close legacy Builder and Studio issues or create a focused
issue for one implementation slice below. A PR may reference an issue number
only after its title, state, and labels have been verified in the same work
session. The implementation slices in this file describe product direction;
they are not aliases for fixed GitHub issue numbers.

## Immediate Implementation Slices

### P0: Close the Adaptive Decision Loop

The minimum evidence layer already exists:

- quiz attempts and learning events
- concept mastery projections and mastery jobs
- stable course/lesson/block context
- persisted generation decisions and course patches
- learner profiles/facts from onboarding and extraction
- private progression projections from the same trusted learning events

The next acceptance target is an evidence-backed closed loop:

```text
weak/repeated evidence -> explainable adaptive decision
-> remediation or next-lesson action -> persisted result
-> later evidence proves whether the intervention helped
```

XP, quests, streaks, and achievements may make this loop visible and motivating,
but they must not become mastery evidence or change the remediation decision.

### Completed baseline: China/Singapore Routing Coverage

The runtime registry now contains 31 graphs, including 10 China/Singapore
secondary and H2 graphs. The protected fixture now contains 1,718 bilingual
cases across all 31 graphs, with curriculum-specific labels and English/Chinese
manual boundary coverage for each new graph. The structural gate passes with a
1,718-case minimum and unchanged gold policies.

Remaining work is content governance rather than routing-fixture restoration:

- review and resolve or explicitly accept each new graph's high root-concept warning;
- keep source/runtime registration and human approval status distinct.

### P1: Maintain The Private Progression Baseline

The launch baseline exists: eight guild ranks, three daily quests, a course
quest map, ten achievements, an idempotent XP ledger, learner-local dates, and
transient course reward notices. Follow-up issues should be narrow and use
`type:progression` plus `area:profile`.

Valid slices include reward-pacing analysis, accessibility, copy, empty states,
and regression coverage. Group quests, public leaderboards, Teach-Back bosses,
matching games, and client-authored rewards require a new product decision; they
are not implicit hardening work.

### P0: Maintain Course Tutor Targeting Baseline

The first Course Tutor targeting baseline exists on the lesson reader. The
assistant receives:

- selected block id
- selected text, when present
- current course id and current lesson id
- the active lesson's visible block list
- edit intent through block actions or chat

Next slices should keep this focused on Course Detail behavior and avoid broad
workspace changes:

- persist richer before/after revision evidence
- add regression coverage for selected-text attachment across block types
- verify the collapsed AI rail does not obscure reader navigation

### P1: Unify Artifact Persistence Without Replacing the Catalog

The current artifact union supports structured renderers and sandbox widgets,
while the visualization catalog provides typed React components through a
frontend-tool path. Do not collapse these working paths merely to create one
renderer abstraction. Any future persistent application representation must
define ownership and lifecycle for:

- `html_widget`
- catalog component id + version + validated config
- generated application source and review state
- course/lesson attachment and sharing policy

The 19-component catalog remains the reviewed production path for stateful
React interactions.

### P1: Tutor Runtime Productization

The active baseline is a self-hosted Node/AG-UI service around the
`primoria_tutor` LangGraph/deepagents graph. PostgreSQL now persists runs,
events, leases, cancellation state, conservative retry/recovery metadata, and
checkpoints. The service has readiness/liveness checks and graceful shutdown;
it does not depend on LangGraph Agent Server, LangSmith Deployment, or Redis.

Next slices should improve behavior and observability without weakening the
current ownership boundary:

- provider failover and timeout behavior
- metrics and alerts for queue age, stale leases, failures, and cancellation latency
- tool status and artifact rendering consistency
- course-detail context targeting
- saved chat/thread persistence checks
- model-specific widget and structured-output regression tests

### P1: Memory As Reviewed Evidence

Raw evidence remains in product tables. Existing learner facts are derived from
explicit onboarding/Settings intake and lesson extractor jobs. Settings already
supports correction and deletion; the next slices improve transparency rather
than inventing another memory store:

- expose fact provenance, source quote, and confidence in the UI
- make background import failures and deduplication outcomes easier to inspect
- keep explicit onboarding facts distinguishable from model inference
- measure whether retrieved facts improve Tutor/course decisions

### P1: Visualization Analytics And Depth

The catalog and production route are implemented. Use the internal
`visualization.render` analysis surface to drive the next work:

- cluster sandbox fallbacks and catalog misses by topic
- compare render/success rates by `componentId`
- expand or deepen components only after real usage evidence
- prioritize humanities interactions such as annotation, source comparison,
  timeline exploration, and map linkage instead of merely adding display cards

## First-Class `type:search`

`type:search` is a cross-cutting issue type.

Use it when the work improves retrieval or discovery over:

- artifacts
- course blocks
- learning signals
- memory
- tutor threads
- GitHub issues / AROS planning state

A `type:search` issue should specify:

- corpus
- query input
- permission boundary
- ranking or filtering rule
- output shape
- verification fixture

## PR Discipline

Each PR should include:

- one primary `type:*` label
- one or two `area:*` labels
- one priority label
- issue link in the PR body
- verification notes
- screenshots for UI changes

Avoid mixing:

- schema changes with unrelated UI polish
- runtime behavior changes with large refactors
- renderer work with course learning-signal work
- memory extraction with raw evidence capture
