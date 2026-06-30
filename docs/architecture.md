# Primoria Architecture

> Historical architecture and cleanup plan. This document records a migration
> proposal and dead-code verification notes; it is not the current runtime source
> of truth for the AI Tutor path. The active tutor path is
> Browser CopilotKit UI → `/api/copilotkit` → `primoria_tutor` in
> `apps/agent/src/graph.mjs`.

This document is the construction blueprint for Primoria's codebase structure. It
defines the target package topology, the laws that govern dependencies, the
file-by-file migration plan, and the phased rollout.

It is a **structural** design (how the code is organized so it stays clean and
sharable). It deliberately does *not* design the adaptive-learning loop itself —
that is a separate product-architecture effort. The goal here is to make the
codebase a clean foundation that the learning loop can later be built on.

Status: **Phase 0 verified, not yet executed.** See [Rollout](#6-phased-rollout).

---

## 1. Why this redesign

Today `apps/web` is a god-package: UI, API routes, DB access, AI orchestration,
and domain logic all live inside one Next.js app. Because `apps/agent`
(the LangGraph runtime) is a *separate process that cannot import from
`apps/web`*, every piece of shared logic is **copy-pasted across the
TS/mjs boundary**. Measured duplication:

| Concern | Web (TS) | Agent (mjs) | Duplicated lines |
| --- | --- | --- | --- |
| Course generator | `lib/ai/deepagent/course-generator.ts` (855) | `apps/agent/src/course-generator.mjs` (1087) | ~2000 |
| Agent runtime + prompt | `lib/ai/deepagent/primoria-deep-agent.ts` (576) | `apps/agent/src/graph.mjs` (1089) | large |
| Widget HTML normalize | `lib/ai/widget-html.ts` | inline in `graph.mjs` (~60) | ~60 |
| Artifact contract | `lib/ai/types.ts` (397) | hand-written Zod in `graph.mjs` | triplicated |

`CLAUDE.md` literally instructs "keep them in sync" — a design defect promoted to
a discipline requirement.

---

## 2. Design principles

Four laws. Every decision below is derived from these.

1. **A package boundary is a cross-runtime sharing line.** Code is extracted to
   `packages/*` *only* when both `apps/web` (TS) and `apps/agent` (mjs) need it
   and cannot import each other. Everything else is solved with **directories**,
   not packages. (This is why we do *not* copy LobeHub's 50-package layout — that
   count is driven by their Web/Desktop/Mobile/Extension multi-platform need,
   which Primoria does not have.)
2. **Dependencies flow one way, never backward.** `apps/*` → `packages/*`, and
   within `packages` the layering is one-directional. A cycle means the design is
   wrong.
3. **Domain logic has zero framework dependency.** `packages/domain` must not
   import Next.js, React, CopilotKit, or LangGraph. It understands "course",
   "widget", "model provider" — not "where it runs".
4. **Contracts have a single source of truth.** An artifact type is defined once;
   schemas are the source and types are derived (`z.infer`); UI and both agent
   paths consume the same definition.

---

## 3. Target topology

```
        ┌─────────────────────────────────────────────┐
        │            apps/web (Next.js)                │
        │  components/ (UI)   app/api/ (thin routes)    │
        │  lib/db/ models + services (web-only)         │
        └───────┬──────────────────────────┬───────────┘
                │                           │
        ┌───────▼────────┐                  │
        │  apps/agent    │                  │
        │  (LangGraph)   │                  │
        └───────┬────────┘                  │
                │ both apps depend on        │
   ┌────────────▼───────────────────────────▼──────────┐
   │                  packages/                          │
   │   domain/  ───────── depends on ─────────► contracts/
   │   course / widget / ai-provider / capability   types │
   │   (pure logic, zero framework)                schema  │
   │                                               intent  │
   └─────────────────────────────────────────────────────┘

Dependency law (one-way, top → bottom):
  apps/web   ──► packages/domain ──► packages/contracts
  apps/agent ──► packages/domain ──► packages/contracts
  packages/contracts ──► (nothing; it is a leaf)
  apps/web/lib/db ──► packages/domain  (web-internal, server-only)
  apps/web  and  apps/agent  are peers — neither imports the other.
```

Two hard rules: **`contracts` is a leaf** (depends on nothing, not even domain),
and **`db` stays inside `apps/web`** — the agent never touches the DB, so there is
no cross-runtime consumer and therefore no package boundary. `db` is layered with
*directories*, borrowing LobeHub's schema/model/service split.

---

## 4. The three units

### 4.1 `packages/contracts` (leaf — built first)

Single source of truth. Kills today's three-way manual sync.

| Content | Lives today in | Moves to |
| --- | --- | --- |
| `TutorArtifact` 14-variant union | `lib/ai/types.ts` (397) | `contracts/artifacts.ts` |
| Artifact Zod schemas | hand-written in `graph.mjs` + `visual-schemas.ts` | `contracts/schemas.ts` |
| Intent keywords (课程/course/lesson…) | regex in `tutor-agent.ts` + both prompts | `contracts/intent.ts` |
| `TutorStreamEvent` envelope | `lib/ai/types.ts` | `contracts/stream.ts` |

Key design: **schema is the source, type is derived** via `z.infer<typeof X>`.
Schema changes propagate to types automatically — drift becomes impossible.

### 4.2 `packages/domain` (pure logic — kills the ~2000-line dup)

| Submodule | Duplication today | Becomes |
| --- | --- | --- |
| `course/` | `course-generator.ts` (855) + `course-generator.mjs` (1087) | one copy |
| `course/` | `course-editor.ts` + agent side | one copy |
| `widget/` | `widget-html.ts` + `normalizeWidgetHtml` in `graph.mjs` | one copy |
| `widget/` | `widget-dependencies.ts` + allowlist in `graph.mjs` | one copy |
| `ai-provider/` | `model.ts` + divergent `createModel` in `graph.mjs` | one copy |

`domain` compiles to an ESM artifact; `apps/agent` imports the built output
(the "eliminate the boundary via shared compiled output" decision). This is what
removes the agent's copy-paste burden at the root.

### 4.3 `apps/web/lib/db` (NOT a package — but layered)

Cures the "inline queries in `store.ts` + whole-jsonb rewrite" disease.

```
lib/db/
  schema/     ← split today's 544-line schema.ts by table domain
    courses.ts  identities.ts  workspaces.ts  learning.ts …
  models/     ← single-entity CRUD classes (replace scattered store.ts)
    CourseModel.ts  CapabilityModel.ts …
  services/   ← cross-entity business logic, called by API routes
    CourseService.ts  SedimentationService.ts …
  client.ts   ← keep (connection pool)
```

API routes become thin: `route.ts` only does `parse HTTP → call service →
serialize response`.

---

## 5. Dead-code verification (Phase 0 scope)

Before deleting anything, the legacy TS tutor path was traced end-to-end with
`grep`. Findings (verified, not assumed):

**Confirmed dead — safe to delete:**

| File | Evidence |
| --- | --- |
| `components/tutor/tutor-chat-client.tsx` | `TutorChatClient` has only its definition line; **no JSX mount, no import** anywhere. |
| `app/api/tutor/chat/route.ts` | Only fetched by `tutor-chat-client.tsx` (the dead client). A QA file already notes this endpoint "no longer exists". |
| `lib/ai/tutor-agent.ts` | Imported only by the dead `/api/tutor/chat` route. |
| `lib/ai/deepagent/primoria-deep-agent.ts` | Imported only by `tutor-agent.ts`. Its `createTutorModel` re-export is redundant — the real definition is in `model.ts`. |
| `app/api/tutor/debug/`, `app/api/tutor/mock/` | Empty directories (no `route.ts`). |

**MUST NOT delete — live-path dependencies (corrects the initial assumption):**

| File | Live consumer |
| --- | --- |
| `lib/ai/deepagent/model.ts` | Used through Agent OS facades by course chat, workspace runtime model creation, course-generator, and course-editor. |
| `lib/ai/deepagent/course-generator.ts` | Used through `lib/agent-os/ai.ts` by `/api/courses/[id]/chat`. |
| `lib/ai/deepagent/course-editor.ts` | Used through `lib/agent-os/ai.ts` by `/api/courses/[id]/edit`. |

→ course-generator/editor are **not** dead; they are deferred to Phase 2 (merge
with the `.mjs` copies), not deleted in Phase 0.

---

## 6. Phased rollout

Each phase ends with `pnpm build` + `pnpm typecheck` + `node --check
apps/agent/src/graph.mjs` passing before the next begins. Each phase is
independently revertible.

```
Phase 0  Delete verified dead code (§5). Zero runtime risk.
         → removes half the sync burden before any extraction.

Phase 1  Create packages/contracts (the chosen starting point).
         Move artifact types + Zod schemas + intent keywords.
         Wire both apps/web and apps/agent to import it; delete the
         hand-written duplicates in graph.mjs and types.ts.

Phase 2  Create packages/domain. Merge course-generator .ts/.mjs into one,
         widget-html + dependencies, ai-provider/model. Point apps/agent at
         the compiled output; delete the .mjs copies.

Phase 3  Re-layer apps/web/lib/db: store.ts → models/ + services/.
         Split the 544-line schema.ts by table domain. Thin the API routes.
```

**Sequencing rationale:** Phase 0 first (chosen) because deleting dead code is
zero-risk and shrinks the surface every later phase has to move. Contracts before
domain because `contracts` is the leaf — domain depends on it, so it must exist
first.

---

## 7. How this maps to the product roadmap

This structural work is the enabling substrate for the adaptive-learning loop
described in `docs/long-horizon-learning-principles.md`:

- `packages/contracts` gives a stable artifact IR — the precondition the roadmap
  names for `#17 React renderer` and `type:renderer` work.
- `apps/web/lib/db` layering (models/services) is where the future
  `learning_events`, `learner_concept_state`, and concept-graph tables land
  cleanly, instead of as more inline queries.
- Removing the agent duplication means the eventual teaching-method policy and
  action-selection helpers are written **once** in `domain`, not twice across
  the TS/mjs split.

This document covers structure only. The learning-loop policy, mastery model,
and evidence log are separate design concerns.
