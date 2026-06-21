# Primoria Issue Taxonomy And Roadmap

## Purpose

Primoria is moving from a course and widget generator into an adaptive learning workspace. The issue system should make that shift explicit so product ideas, agent work, PRs, and implementation slices stay aligned.

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
| `type:course-copilot` | Course detail assistant context, selected text, block edits, course patching. |
| `type:renderer` | HTML/React/widget/artifact rendering runtime. |
| `type:workspace` | Workspace communication, members, tasks, class/team flows. |
| `type:agent-runtime` | Agent runs, approvals, DeepAgent runtime, skills, tools, connections. |
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
| `area:workspace` | Workspace communication and collaboration. |
| `area:agent` | Agent profiles, runtime, tools, approvals, skills. |
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
| #1 Course Copilot context/actions | `type:course-copilot`, `area:course`, `priority:P0`, `status:needs-slice` | Course edits and adaptive growth depend on reliable targeting. |
| #10 Selected-text Course Copilot UI | `type:course-copilot`, `area:course`, `priority:P0`, `status:ready` | A focused UX slice inside #1. |
| #17 React artifact renderer | `type:renderer`, `area:artifact`, `priority:P1`, `status:needs-slice` | Needed for complex stateful artifacts, but should align with artifact IR. |
| #5 Long-term memory | `type:memory`, `area:memory`, `area:adaptive-learning`, `priority:P1`, `status:needs-slice` | Memory should consume reviewed evidence, not replace raw signals. |
| #8 Workspace communication | `type:workspace`, `area:workspace`, `priority:P1`, `status:needs-slice` | Workspace exists, but classroom/homework slices need tighter issue boundaries. |
| #15 Onboarding preferences | `type:onboarding`, `area:memory`, `priority:P1`, `status:ready` | Good cold-start signal source for adaptive decisions. |
| #16 Postgres-first architecture | `type:data-architecture`, `area:infra`, `priority:P1`, `status:ready` | Current implementation is already Postgres-first; keep boundaries explicit. |
| #13 Course sharing and paths | `type:sharing`, `area:course`, `area:workspace`, `priority:P2`, `status:needs-slice` | Better after course/artifact schemas stabilize. |

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

### P0: Make Course Copilot Targeting Reliable

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

### P1: Agent Runtime Productization

Workspace agents already have profiles, capabilities, runs, approvals, skills, memory, and artifacts. The next slices should make runtime behavior dependable:

- production DeepAgent runtime path
- approval resume path
- run event display and persistence checks
- saved artifact/memory review flows
- Agent Store install behavior tests

### P1: Memory As Reviewed Evidence

Memory should not be a magic sink. Keep raw evidence in product tables and write memory only after a reviewable extraction step:

- onboarding preference -> explicit memory
- course edit event -> extracted preference candidate
- repeated weak signal -> reviewed misconception / weak concept memory

## First-Class `type:search`

`type:search` is a cross-cutting issue type, not just the existing `search_workspace_messages` tool.

Use it when the work improves retrieval or discovery over:

- workspace messages
- artifacts
- course blocks
- learning signals
- memory
- agent runs
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
