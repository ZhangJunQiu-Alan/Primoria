# Handoff

## Goal

Continue layering the workspace / agent system without changing behavior. The current direction is to reduce the large workspace files into clear layers:

- UI components and client view-state helpers.
- Agent profile domain rules.
- Agent profile persistence row mappers.
- Later: store services/repositories, then runtime provider/persistence/stream modules.

Keep changes surgical and verify after each extraction with `pnpm --filter @primoria/web typecheck`.

## Current Progress

- Branch: `codex/workspace-layering`.
- Working tree has uncommitted refactor changes.
- Frontend extraction completed:
  - `apps/web/src/components/workspace/workspace-composer.tsx` now owns the chat composer UI, attachment tray, and `@ agent` mention popover.
  - `apps/web/src/components/workspace/workspace-client-state.ts` now owns client-side workspace merge rules, optimistic message dedupe, thread bumping, mention range detection, and last-read localStorage helpers.
  - `apps/web/src/components/workspace/workspace-client.tsx` still owns container state, API calls, and business orchestration.
- Backend rule extraction completed:
  - `apps/web/src/lib/workspaces/agent-profile-rules.ts` now owns agent templates, handle slugging/unique handle generation, capability construction, capability policy validation, skill path validation, and text guardrails.
  - `apps/web/src/lib/workspaces/store.ts` imports these rules instead of defining them inline.
- Backend persistence mapper extraction completed:
  - `apps/web/src/lib/workspaces/agent-profile-persistence.ts` now owns agent capability/profile/connection DB row conversion, profile capability grouping, visible connection filtering, and hidden reference capability input conversion helper.
  - `apps/web/src/lib/workspaces/store.ts` imports the persistence mappers.
- Agent connection service extraction completed:
  - `apps/web/src/lib/workspaces/agent-connection-service.ts` now owns connection tool-name normalization, workspace/user connection visibility rules, connection lookup, and MCP capability connection validation.
  - `apps/web/src/lib/workspaces/store.ts` keeps thin wrappers that pass local-store and DB workspace guards into the service.
- Agent profile service extraction completed:
  - `apps/web/src/lib/workspaces/agent-profile-service.ts` now owns DB visible profile id discovery, hidden reference capability merge for DB updates, profile lookup/resolution, and profile manage-permission checks.
  - `apps/web/src/lib/workspaces/store.ts` still owns high-level create/update/member/run orchestration.
- Agent memory helper extraction completed:
  - `apps/web/src/lib/workspaces/agent-memory-service.ts` now owns memory row conversion, local/DB owner visibility checks, and source run/message visibility validation.
  - `apps/web/src/lib/workspaces/store.ts` still owns create/archive/restore/delete/list orchestration.
- Workspace artifact helper extraction completed:
  - `apps/web/src/lib/workspaces/workspace-artifact-service.ts` now owns artifact kind inference, default review status, artifact record construction, artifact upsert, DB value conversion, row conversion, and artifact-from-message construction.
  - `apps/web/src/lib/workspaces/store.ts` keeps `buildWorkspaceArtifactMessageBundle` because it depends on the existing message timestamp generation path.
- Workspace task helper extraction completed:
  - `apps/web/src/lib/workspaces/workspace-task-service.ts` now owns task metadata serialization/parsing, DB task row conversion, and local/DB task source visibility checks.
  - `apps/web/src/lib/workspaces/store.ts` still owns task create/update orchestration.
- Workspace thread helper extraction completed:
  - `apps/web/src/lib/workspaces/workspace-thread-service.ts` now owns thread agent trigger normalization, allowed-agent id normalization, participant id normalization, local/DB direct participant construction, DB thread visibility/grouping helpers, and DB thread row conversion.
  - `apps/web/src/lib/workspaces/store.ts` still owns thread create/update orchestration.
- Workspace summary mapper extraction completed:
  - `apps/web/src/lib/workspaces/workspace-summary-service.ts` now owns DB workspace row conversion.
- Workspace message helper extraction completed:
  - `apps/web/src/lib/workspaces/workspace-message-service.ts` now owns message construction, monotonic local message timestamps, per-thread message windowing, thread bumping, and `MESSAGE_WINDOW_PER_THREAD`.
- Workspace access helper extraction completed:
  - `apps/web/src/lib/workspaces/workspace-access-service.ts` now owns database-mode detection and DB workspace/thread access guards.
  - `apps/web/src/lib/workspaces/store.ts` still owns local in-memory store access guards.
- Local view helper extraction completed:
  - `apps/web/src/lib/workspaces/workspace-local-view-service.ts` now owns local view shaping: visible memories, message windowing, workspace list, and personal agent library merge.
- Agent run persistence mapper extraction completed:
  - `apps/web/src/lib/workspaces/agent-run-persistence.ts` now owns message, agent run, agent run event, and approval DB row conversion.
  - `apps/web/src/lib/workspaces/store.ts` still owns run creation/cancellation/retry and approval decision orchestration.
- Agent run helper extraction completed:
  - `apps/web/src/lib/workspaces/agent-run-helpers.ts` now owns run event construction, pending approval construction, terminal status checks, runtime visible message snapshots, run id generation, profile run snapshots, and approval payload/object readers.
  - `apps/web/src/lib/workspaces/store.ts` still owns run lifecycle orchestration and DB writes.
- Workspace member mapper extraction completed:
  - `apps/web/src/lib/workspaces/workspace-member-service.ts` now owns DB member row conversion.
  - `apps/web/src/lib/workspaces/store.ts` still owns member creation, join flow, and permission checks.
- Verification:
  - `pnpm --filter @primoria/web typecheck` passed after the frontend extraction.
  - `pnpm --filter @primoria/web typecheck` also passed after the agent profile rules and persistence mapper extraction.
  - `pnpm --filter @primoria/web typecheck` passed after the agent connection service extraction.
  - `pnpm --filter @primoria/web typecheck` passed after the agent profile service extraction.
  - `pnpm --filter @primoria/web typecheck` passed after the agent memory helper extraction.
  - `pnpm --filter @primoria/web typecheck` passed after the workspace artifact helper extraction.
  - `pnpm --filter @primoria/web typecheck` passed after the workspace task helper extraction.
  - `pnpm --filter @primoria/web typecheck` passed after the workspace thread helper extraction.
  - `pnpm --filter @primoria/web typecheck` passed after the agent run persistence mapper extraction.
  - `pnpm --filter @primoria/web typecheck` passed after the workspace member mapper extraction.
  - `pnpm --filter @primoria/web typecheck` passed after the agent run helper extraction.
  - `pnpm --filter @primoria/web typecheck` passed after the task source visibility extraction.
  - `pnpm --filter @primoria/web typecheck` passed after the thread participant helper extraction.
  - `pnpm --filter @primoria/web typecheck` passed after the workspace summary mapper extraction.
  - `pnpm --filter @primoria/web typecheck` passed after the workspace message helper extraction.
  - `pnpm --filter @primoria/web typecheck` passed after the workspace access helper extraction.
  - `pnpm --filter @primoria/web typecheck` passed after the local view helper extraction.
  - `git diff --check` passed after the latest extraction.

## What Worked

- Small behavior-preserving extractions worked well.
- Keeping `WorkspaceClient` as the orchestrator while extracting pure UI/state helpers avoided risky frontend rewrites.
- Moving agent profile rules before DB mapping made the backend layering more readable.
- TypeScript caught the extraction boundaries cleanly; no runtime behavior changes were needed.
- Passing a small context object from `store.ts` into service modules worked well for helpers that need local-store and DB workspace guard access without creating circular imports.
- Leaving `buildWorkspaceArtifactMessageBundle` in `store.ts` avoided moving message timestamp behavior while still extracting pure artifact helpers.
- Row mapper extraction is working well for `task` and `thread` without moving write orchestration.
- Mapper-only modules are now covering profile, memory, artifact, task, thread, agent run, and member rows.
- `agent-run-helpers.ts` took the pure run/approval helpers without moving DB lifecycle code.
- `workspace-task-service.ts` and `workspace-thread-service.ts` now own their nearest validation/participant helpers, while orchestration stays in `store.ts`.
- DB access guards and local view shaping now have separate modules, which keeps DB permissions separate from in-memory store state.

## What Didn't Work

- The work was interrupted twice mid-turn, so avoid assuming the narrative in chat is complete. Trust the current files plus typecheck.
- Do not jump straight into a full `store.ts` rewrite. It mixes local in-memory and DB-backed paths, so a big-bang refactor is risky.
- Do not move database queries and business rules in the same step. The successful pattern so far is one boundary per change.
- Keep service modules narrow. `agent-profile-persistence.ts` should remain row conversion/grouping/filtering, while `agent-profile-service.ts` owns workspace visibility and permission checks.
- Do not move message construction just to extract artifact helpers. `buildMessage` and `nextMessageTimestamp` are shared store concerns for now.
- Keep source visibility checks near orchestration until there is a clear service boundary; they currently depend on workspace/thread guards.
- Remaining helpers are mostly orchestration or seed/local-store plumbing; pause before extracting unless doing a dedicated service slice.
- Local store mutation/global state still lives in `store.ts`; keep it there unless intentionally creating a local store adapter.

## Next Steps

1. Inspect the current diff:
   - `git status --short --branch`
   - `git diff --stat`
   - `git diff -- apps/web/src/lib/workspaces/store.ts apps/web/src/lib/workspaces/agent-profile-rules.ts apps/web/src/lib/workspaces/agent-profile-persistence.ts`

2. Decide whether to commit this first layering slice now.
   - It already typechecks.
   - Suggested commit message: `refactor: layer workspace agent profile helpers`

3. Consider committing the current layering slice before larger service extraction:
   - The current diff is broad but behavior-preserving and repeatedly typechecked.
   - Suggested commit message: `refactor: layer workspace helpers`

4. If continuing extraction before committing, use a dedicated service slice:
   - seed workspace helpers, or
   - local store adapter, or
   - invite-code helpers.
   - Avoid mixing these with run lifecycle or approval decision changes.

5. Run verification after each slice:
   - `pnpm --filter @primoria/web typecheck`
   - `git diff --check`

6. Later, when the store is thinner, split larger domains:
   - `memory-service`
   - `artifact-service`
   - `agent-run-service`
   - `approval-service`
   - local/db adapters
