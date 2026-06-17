# Handoff

> Supersedes the prior workspace-layering handoff (that work is committed and done).

## Goal

Redesign Primoria as an **adaptive learning ecosystem operating system**, not a
one-shot course generator. The system is structured as **3 nested rings**
(personal loop → social/workspace → collective intelligence), driven by a
**Decision Engine** that reads 5 layers of memory (User / Goal / Course /
Agent / System) and dispatches to an **Agent Pool**.

The architectural redesign has two parallel threads:

1. **Code structure** — extract shared packages, eliminate duplication across
   the TS/mjs boundary, split god-files.
2. **Product system** — implement the adaptive learning loop: event capture,
   memory writes, decision → action, feedback flow.

User wants to **drive the plan step-by-step** rather than have the next agent
execute a pre-designed roadmap. Each package, each schema, each file is
discussed before it is written.

## Current Progress

### Design phase (complete)

- `docs/architecture.md` (217 lines) — code structure: package topology,
  dependency laws, file-by-file migration plan, Phase 0–3.
- `docs/product-architecture.md` (506 lines) — product system: 8 search spaces,
  3 rings, 5-layer memory, agent ecosystem, 14-section comprehensive design.
- `docs/long-horizon-learning-principles.md` — vision doc (already in repo).
- `docs/issue-taxonomy-and-roadmap.md` — issue label system (already in repo).

### Research phase (complete)

- `deep-research` workflow run (105 sub-agents, 24 verified claims 3-0 votes).
- Key verified tech decisions (see `memory/verified-tech-decisions.md`):
  - **pg-boss** for event job queue (transactional outbox on PG, no Redis)
  - **ts-fsrs** + simplified **BKT** for mastery model (TS-native, production-tested)
  - **AG-UI / CopilotKit** for real-time multi-agent streaming (already in repo)
  - **drizzle-zod** for schema → Zod → Type (single source of truth)
  - **PG range partition by month** for event table

### LobeHub reference (complete, in place)

- Cloned to **`/Users/junjie/ai4edu/lobe-chat/`** (NOT inside primoria).
- 82 packages. Key ones to reference:
  - `packages/database/` — Drizzle schema + models + services pattern
  - `packages/agent-runtime/src/groupOrchestration/` — multi-agent routing
  - `packages/context-engine/src/` — provider+processor+token-accounting pipeline
  - `packages/memory-user-memory/src/extractors/` — GateKeeper + LayerExtractor
  - `packages/builtin-tools/` + 28 individual `@lobechat/builtin-tool-*` — one tool per package
  - `packages/agent-signal/` — agent activity UI contract
  - `packages/fetch-sse/`, `packages/openapi/` — SSE client, OpenAI-compatible gateway

### Persistent memory (complete)

- `/Users/junjie/.claude/projects/-Users-junjie-ai4edu-primoria/memory/`:
  - `MEMORY.md` (index)
  - `lobehub-package-patterns.md` — 50+ package breakdown
  - `lobehub-context-engine.md` — pipeline pattern for LLM context
  - `lobehub-memory-system.md` — 5-dim memory + AI extraction
  - `lobehub-builtin-tool-pattern.md` — one tool per file
  - `verified-tech-decisions.md` — industry-verified tech choices

### Task list (in progress)

11 tasks created. **Phase 0 (delete dead code) is in_progress** but the user
interrupted to clarify direction before deletion actually executed. No files
have been deleted yet.

```
#1  [in_progress] Phase 0: 删死代码    ← paused, awaiting user direction
#2  [pending] Phase 1a: 建 packages/contracts 骨架
#3  [pending] Phase 1b: 搬 artifact 类型 + Zod schema
#4  [pending] Phase 1c: 搬 intent 关键词 + stream envelope
#5  [pending] Phase 2a: 建 packages/domain 骨架
#6  [pending] Phase 2b: 合并 course-generator 重复
#7  [pending] Phase 2c: 14 个 tutor tool 拆成 modules
#8  [pending] Phase 3: apps/web/lib/db 分层
#9  [pending] P0 feature: Event Pipeline (pg-boss)
#10 [pending] P0 feature: Memory layers (User + Course)
#11 [pending] P0 feature: Decision Engine (规则版)
```

## What Worked

- **End-to-end exploration before writing** — three parallel Explore agents
  mapped the codebase (adaptive learning state, agent pipeline, DB schema)
  and revealed: only 1 of 2 agent paths is live, 3 tables are write-only
  dead-ends, schema is built around content ownership not learning. This
  shaped the entire design.
- **Convergence on first principles** — when the user said "think about it
  with system design", narrowing to *"a package boundary is a cross-runtime
  sharing line"* (vs. LobeHub's 50-package multi-platform approach) gave a
  defensible 2-3 package decision instead of a copy.
- **Verifying before deleting** — Phase 0 scope was triple-checked with
  grep: legacy TS tutor path is genuinely dead (no JSX mount, only fetched
  by dead client, only imported by dead route). But course-generator/editor
  are NOT dead — initially assumed they were, corrected after grep.
- **External research as evidence** — `deep-research` produced 3-0
  verified claims (e.g. "BKT matches DKT within 0.04 AUC-ROC on 7/8
  datasets"). Better than hand-waving.
- **Local LobeHub clone** — when the user pointed out we should clone it,
  made everything concrete. We can `ls packages/database/src/` instead of
  guessing.
- **Memory persistence** — LobeHub analysis saved to `.claude/projects/.../memory/`
  survives session boundaries. Future agents on this project see them.

## What Didn't Work

- **Front-loading 11 pre-designed tasks** — user pushed back: "我要一步步
  自己和你讨论！而是不是已经设计好的这种！" The pre-designed roadmap
  (Phase 0–3 + 3 P0 features) was too much pre-planning. User wants to
  drive the plan, not execute one.
- **Asking multi-choice architecture questions with full options pre-written**
  — user rejected the AskUserQuestion for "包结构怎么分" because the
  options were already pre-decided. User wants to be asked "what do you
  want to do next" not "pick from A/B/C/D".
- **Tool result truncation from WebFetch** — first attempt to fetch
  LobeHub's package.json from raw GitHub hit a certificate error. Had to
  use `dokobot` (Chrome-based fetch) instead.
- **GitHub API rate limit** — using `/repos/.../contents/` for directory
  listing hit unauthenticated rate limit. `dokobot read raw.githubusercontent.com`
  works fine as an alternative.
- **Deep-research synthesis step** — the 5-angle fan-out and verification
  all worked, but the final synthesis agent crashed (socket closed). The
  24 verified claims were returned raw; a final synthesis was done by
  hand from the result.
- **Long conversation drift** — the session went from code → design →
  product vision → LobeHub research → tech stack → ready-to-implement,
  in many direction changes. The plan in `docs/architecture.md` is sound
  but may need reshaping as the user exercises the step-by-step mode.

## What Must Survive Any Session Restart

If you (next agent) are reading this, here's the **minimum you need**:

1. **The vision is not "course generator".** It is "adaptive learning
   ecosystem operating system" — 3 rings, 5 memory layers, Decision Engine,
   agent pool. Read `docs/product-architecture.md` §1–6 to internalize.

2. **The package decision is "2-3 packages, not 50".** Boundary is
   cross-runtime sharing (web TS + agent mjs). Read `docs/architecture.md`
   §3–4 for the topology.

3. **LobeHub is at `/Users/junjie/ai4edu/lobe-chat/`**, NOT inside primoria.
   82 packages. `ls packages/` and `ls packages/<name>/src/` to inspect.
   Memory files summarize the patterns but the real code is there.

4. **Memory is at `/Users/junjie/.claude/projects/-Users-junjie-ai4edu-primoria/memory/`**
   — 5 files + index. Read them before designing anything new.

5. **User is in step-by-step mode.** Do not propose a 5-task roadmap.
   Ask "what do you want to discuss next" or "which file/decision
   first". Let user drive.

6. **Phase 0 deletion has NOT happened yet** (5 files verified safe to
   delete, but waiting for user OK). Task #1 is in_progress but paused.

## Next Steps (immediate, awaiting user)

The user has just cloned LobeHub locally and is ready to **discuss the plan
fresh**. Suggested opening question (DO NOT auto-ask — let user direct):

> "LobeHub 在 `/Users/junjie/ai4edu/lobe-chat/` 准备好了。你想从哪里开始?
> 比如: ① 看 LobeHub 的 database 包实际怎么分层的, 我们也学着分;
> ② 看 context-engine 的 pipeline, 我们的 Decision Engine 怎么映射;
> ③ 看 memory-user-memory 的 5 维, 我们的 5 层 memory 怎么正交;
> ④ 还是先删死代码(Phase 0)? 你来定。"

Tasks #1–#11 remain valid as a *backlog* but the user may reshape them
based on what they decide to discuss.

## Files Created in This Session (don't recreate)

- `docs/architecture.md` (217 lines)
- `docs/product-architecture.md` (506 lines)
- `/Users/junjie/.claude/projects/-Users-junjie-ai4edu-primoria/memory/`
  - `MEMORY.md`
  - `lobehub-package-patterns.md`
  - `lobehub-context-engine.md`
  - `lobehub-memory-system.md`
  - `lobehub-builtin-tool-pattern.md`
  - `verified-tech-decisions.md`

## Files NOT Touched Yet (important)

- No code files modified
- No packages created
- No files deleted (Phase 0 pending)
- `apps/web/src/lib/db/schema.ts` — 544-line monolith, untouched (Phase 3)
- `apps/agent/src/graph.mjs` — 1089 lines, untouched (Phase 2)
- `apps/web/src/lib/ai/tutor-agent.ts` and `primoria-deep-agent.ts` —
  verified dead, awaiting deletion (Phase 0)
