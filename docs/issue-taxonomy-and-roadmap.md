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
| `type:course-tutor` | Course detail assistant context, selected text, block edits, course patching. |
| `type:renderer` | HTML/React/widget/artifact rendering runtime. |
| `type:classroom` | Future classroom, assignments, class/team flows, and collaboration. |
| `type:agent-runtime` | Tutor graph runtime, tool orchestration, model/provider behavior, and future agent productization. |
| `type:memory` | Reviewable memory, preference extraction, long-term personalization. |
| `type:data-architecture` | Database, portability, service boundaries, infra abstractions. |
| `type:sharing` | Published courses, learning paths, community or teacher distribution. |
| `type:onboarding` | Cold-start learner preferences and first-run setup. |
| `type:refactor` | Behavior-preserving structure extraction and maintainability work. |
| `type:search` | Search/retrieval/discovery work across messages, artifacts, memory, issues, or learning evidence. |

### Area Labels

| Label | Use for |
| --- | --- |
| `area:adaptive-learning` | System-level learning loop and mastery decisions. |
| `area:course` | Course generation, blocks, course detail, course edits. |
| `area:artifact` | Generated artifact representation, renderers, saved outputs. |
| `area:classroom` | Future classroom and collaboration surfaces. |
| `area:agent` | Tutor runtime, tools, provider settings, and future agent surfaces. |
| `area:memory` | Memory review, extraction, preference state. |
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

## Current Issue Mapping

| Issue | Labels | Why |
| --- | --- | --- |
| #26 Search/retrieval as first-class surface | `type:search`, `area:agent`, `area:memory`, `area:adaptive-learning`, `priority:P1`, `status:needs-slice` | Seed issue for retrieval/discovery across planning and runtime state. |
| #18 Roadmap: adaptive learning system | `type:roadmap`, `area:adaptive-learning`, `priority:P0`, `status:umbrella` | Parent direction for the learning loop. |
| #25 Adaptive course growth | `type:learning-signal`, `area:adaptive-learning`, `area:course`, `priority:P0`, `status:needs-slice` | Needs a concrete first loop around attempts, weak concepts, and remediation. |
| #14 Block revision history | `type:learning-signal`, `type:memory`, `area:course`, `area:memory`, `priority:P0`, `status:ready` | Existing course edit events are the nearest raw evidence source. |
| #1 Course Tutor context/actions | `type:course-tutor`, `area:course`, `priority:P0`, `status:needs-slice` | Course edits and adaptive growth depend on reliable targeting. |
| #10 Selected-text Course Tutor UI | `type:course-tutor`, `area:course`, `priority:P0`, `status:ready` | A focused UX slice inside #1. |
| #17 React artifact renderer | `type:renderer`, `area:artifact`, `priority:P1`, `status:needs-slice` | Needed for complex stateful artifacts, but should align with artifact IR. |
| #5 Long-term memory | `type:memory`, `area:memory`, `area:adaptive-learning`, `priority:P1`, `status:needs-slice` | Memory should consume reviewed evidence, not replace raw signals. |
| #8 Classroom/collaboration | `type:classroom`, `area:classroom`, `priority:P2`, `status:needs-slice` | Future scope after the personal loop is stable; the old workspace-agent runtime no longer exists. |
| #15 Onboarding preferences | `type:onboarding`, `area:memory`, `priority:P1`, `status:ready` | Good cold-start signal source for adaptive decisions. |
| #16 Postgres-first architecture | `type:data-architecture`, `area:infra`, `priority:P1`, `status:ready` | Current implementation is already Postgres-first; keep boundaries explicit. |
| #13 Course sharing and paths | `type:sharing`, `area:course`, `priority:P2`, `status:needs-slice` | Better after course/artifact schemas stabilize. |

## Immediate Implementation Slices

### P0: Make Learning Signals First-Class

Create the minimum data and service layer for adaptive decisions:

- `quiz_attempts` or `learning_attempts` table.
- `learning_signals` derived view/service.
- course block ids as stable evidence targets.
- simple weak-concept heuristic.
- remediation block insertion or course patch persistence.

First acceptance target:

```text
wrong quiz attempt -> weak block/concept signal -> generated remediation block -> persisted course version
```

### P0: Make Course Tutor Targeting Reliable

Before adaptive patching, the assistant must know exactly what it is changing:

- selected block id
- selected text, when present
- course id and current course version
- edit intent
- before/after revision event

This work should stay focused on Course Detail behavior and avoid broad workspace changes.

### P1: Define Artifact IR Before React Renderer Work

Add a small artifact representation that can support:

- `html_widget`
- `react_widget`
- `quiz`
- `course_patch`
- `learning_app`

Then implement the React renderer against that representation rather than making a renderer-specific one-off schema.

### P1: Tutor Runtime Productization

The active agent runtime is the `primoria_tutor` LangGraph/deepagents graph. The
next slices should make tutor behavior dependable before reintroducing broader
agent surfaces:

- provider failover and timeout behavior
- tool status and artifact rendering consistency
- course-detail context targeting
- saved chat/thread persistence checks
- model-specific widget and structured-output regression tests

### P1: Memory As Reviewed Evidence

Memory should not be a magic sink. Keep raw evidence in product tables and write memory only after a reviewable extraction step:

- onboarding preference -> explicit memory
- course edit event -> extracted preference candidate
- repeated weak signal -> reviewed misconception / weak concept memory

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
