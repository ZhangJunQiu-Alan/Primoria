# Primoria Documentation Map

This index defines which documents describe the current product and which are
design references or dated implementation evidence. When documents disagree,
use the priority order below and verify behavior against the code.

## Source-of-truth order

1. Runtime contracts, schemas, package scripts, and tests in the repository.
2. `README.md` for setup, operations, deployment, and the active architecture.
3. `AGENTS.md` and `CLAUDE.md` for repository constraints used by coding agents.
4. Current-state documents listed below.
5. Dated reports and design references, which must not override current code.

## Current product and architecture

- [`product/feature_specification.md`](product/feature_specification.md) — current product behavior, ownership boundaries, implemented capabilities, and roadmap.
- [`product/facts-intake.md`](product/facts-intake.md) — onboarding/Settings background Facts intake contract, queue lifecycle, classification, and mastery boundary.
- [`product/gamification.md`](product/gamification.md) — implemented private guild Profile, reward rules, and safe modification points.
- [`product-architecture.md`](product-architecture.md) — current modular-monolith-plus ownership, data flow, workers, and adaptive-learning boundaries.
- [`web-implementation-status.md`](web-implementation-status.md) — concise implementation inventory and remaining hardening work.
- [`long-horizon-learning-principles.md`](long-horizon-learning-principles.md) — stable product principles behind the adaptive loop.
- [`用户意图.md`](用户意图.md) — current Tutor intent taxonomy and tool-routing expectations.

## Interactive visualization

- [`交互组件规范.md`](交互组件规范.md) — canonical production component contract, routing flow, file boundaries, and acceptance gates.
- [`opengenerative-ui-adaptation.md`](opengenerative-ui-adaptation.md) — renderer patterns adopted by Primoria and remaining future ideas.

## Knowledge graph

- [`knowledge-graph/learning-goal-routing.md`](knowledge-graph/learning-goal-routing.md) — canonical KG-vs-goal-subgraph-vs-generated-course policy, persisted scope identity, and permanent regression corpus.
- [`knowledge-graph/import-runbook.md`](knowledge-graph/import-runbook.md) — validation, schema, import, cross-graph edges, embeddings, and derived artifacts.
- [`knowledge-graph/topic-grain-standards.md`](knowledge-graph/topic-grain-standards.md) — concept granularity and prerequisite-edge rules.

## Operations and engineering

- [`deployment-preflight.md`](deployment-preflight.md) — production release, privileges, verification, rollback, and recovery.
- [`dependency-security.md`](dependency-security.md) — production audit policy, overrides, and accepted non-blocking findings.
- [`issue-taxonomy-and-roadmap.md`](issue-taxonomy-and-roadmap.md) — issue labels and current implementation slices.

## Future product vision

- [`vision/multi-agent-classroom.md`](vision/multi-agent-classroom.md) — unapproved multi-Agent, classroom, and marketplace direction plus decision gates.
- [`vision/memory-and-goal-space.md`](vision/memory-and-goal-space.md) — unapproved Goal Space and additional memory-layer direction.

## Archive

- [`archive/design-research/craft-ui-reference-2026-07.md`](archive/design-research/craft-ui-reference-2026-07.md) — dated Craft visual research and screenshot evidence.
- [`archive/design-research/angle-component-exploration-2026-07.html`](archive/design-research/angle-component-exploration-2026-07.html) — static angle-component exploration superseded by the production component.
- [`archive/reviews/visualization-catalog-report-2026-07-15.md`](archive/reviews/visualization-catalog-report-2026-07-15.md) — delivery snapshot for the 19-component Catalog.
- [`archive/reviews/visualization-catalog-admission-review-2026-07-15.md`](archive/reviews/visualization-catalog-admission-review-2026-07-15.md) — dated admission evidence and historical test counts.
- [`archive/reviews/primoria-project-review-2026-07-17.html`](archive/reviews/primoria-project-review-2026-07-17.html) — dated repository review; its “current findings” are not current backlog authority.
- [`archive/proposals/adaptive-learning-upgrade-proposal-2026-07-18.md`](archive/proposals/adaptive-learning-upgrade-proposal-2026-07-18.md) — unapproved Trace Forest, Solve-Check, protocol/auth, and package-boundary proposal.

Archived material preserves design and review history. It must not be used as a
runtime contract, current test baseline, or active roadmap.

## Maintenance rule

Update documentation in the same change when a modification affects any of the
following: runtime path, tool name, data owner, schema command, environment
variable, route, component catalog, public capability, or release gate. Keep
historical reports dated and add a current-status addendum instead of rewriting
their original evidence as though it happened later.
