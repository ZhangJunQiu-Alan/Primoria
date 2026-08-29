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
- [`product-architecture.md`](product-architecture.md) — long-horizon system design; every future-only section is labeled.
- [`web-implementation-status.md`](web-implementation-status.md) — concise implementation inventory and remaining hardening work.
- [`long-horizon-learning-principles.md`](long-horizon-learning-principles.md) — stable product principles behind the adaptive loop.
- [`用户意图.md`](用户意图.md) — current Tutor intent taxonomy and tool-routing expectations.

## Interactive visualization

- [`交互组件规范.md`](交互组件规范.md) — canonical production component contract, routing flow, file boundaries, and acceptance gates.
- [`Primoria全学科交互可视化Catalog工作报告.md`](Primoria全学科交互可视化Catalog工作报告.md) — current catalog implementation and operations report.
- [`交互组件入库审核报告.md`](交互组件入库审核报告.md) — dated admission evidence plus closure status for later follow-ups.
- [`opengenerative-ui-adaptation.md`](opengenerative-ui-adaptation.md) — renderer patterns adopted by Primoria and remaining future ideas.
- [`角度组件设计稿.html`](角度组件设计稿.html) — static design artifact, not runtime code.

## Knowledge graph

- [`knowledge-graph/import-runbook.md`](knowledge-graph/import-runbook.md) — validation, schema, import, cross-graph edges, embeddings, and derived artifacts.
- [`knowledge-graph/topic-grain-standards.md`](knowledge-graph/topic-grain-standards.md) — concept granularity and prerequisite-edge rules.

## Operations and engineering

- [`deployment-preflight.md`](deployment-preflight.md) — production release, privileges, verification, rollback, and recovery.
- [`dependency-security.md`](dependency-security.md) — production audit policy, overrides, and accepted non-blocking findings.
- [`issue-taxonomy-and-roadmap.md`](issue-taxonomy-and-roadmap.md) — issue labels and current implementation slices.
- [`tutor-benchmark.md`](tutor-benchmark.md) — Stage 0 Tutor answer-quality fixture, deterministic scoring contract, live-call lock, and report format.
- [`Primoria中文TutorBench-v1-审阅稿.md`](Primoria中文TutorBench-v1-审阅稿.md) — 20 个中文学习者画像与 60 个来源约束任务的逐条人工审阅稿。

## Design references

- [`ui-reference-craft.md`](ui-reference-craft.md) — dated visual research reference; it is not a statement of implemented roles or screens.
- [`craft-homepage.png`](craft-homepage.png) — screenshot evidence used by that reference.

## Maintenance rule

Update documentation in the same change when a modification affects any of the
following: runtime path, tool name, data owner, schema command, environment
variable, route, component catalog, public capability, or release gate. Keep
historical reports dated and add a current-status addendum instead of rewriting
their original evidence as though it happened later.
