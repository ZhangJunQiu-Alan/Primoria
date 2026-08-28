# Integration Regression Testing

Status: local deterministic implementation verified; external release gates pending

Decision ID: `IRT-2026-08-27-01`

Approved: 2026-08-27

Scope owner: Primoria project owner

## Implementation status

Implemented on 2026-08-27:

- `pnpm test:regression:fast`, `pnpm test:regression:db`,
  `pnpm test:regression:browser`, and the combined
  `pnpm test:regression` entry point;
- isolated per-run PostgreSQL databases with production Web, KG, and Agent
  migrations, plus all 31 source graphs for browser regression;
- a scripted OpenAI-compatible SSE model for Tutor text, tool-call,
  pre-output retry, and post-output no-replay tests;
- Chromium smoke tests for the learning loop, the real
  Browser-to-Web-to-Agent Tutor path, full onboarding with the real lesson
  worker, widget rendering, and
  owner-to-anonymous-to-receiver course sharing;
- immutable course-share versions and migration coverage;
- guarded KG embedding snapshot export/verify/import tooling with fixed-vector
  pgvector retrieval assertions;
- a nightly deterministic suite using Chromium, Firefox, and WebKit;
- a nightly production-image Compose topology smoke through Caddy, using only
  isolated synthetic data and CI-namespaced health-check embeddings.

Closeout hardening on 2026-08-28:

- upgraded Next.js to 16.2.11 and pinned vulnerable transitive dependencies;
  the production audit now has zero high/critical advisories (14 moderate and
  6 low advisories remain outside the current blocking threshold);
- held the database-template advisory lock through cloning and preserved each
  run's unique suffix even with a long source database name;
- serialized share publication and revocation on the same parent row lock,
  with a concurrent publication/revocation database regression;
- added ten native Vitest checks for snapshot authorization and payload
  integrity, using only temporary synthetic data;
- added the aggregate `Regression gate` CI check, which requires all four PR
  layers to succeed, including when an upstream job fails or is skipped;
- aligned the local fast gate with CI's Agent type-check, KG validation, and
  migration-drift checks;
- restricted Tutor failure traces to post-login actions/screenshots, with
  network/DOM snapshots and source capture disabled to exclude auth cookies,
  headers, and password-entry actions;
- replaced the learning-loop smoke's single 20-second full-load wait with
  explicit confirmation-API, DOM navigation, visible-home, and persisted-decision
  assertions after a cold-build navigation timeout exposed that ambiguity;
- made Widget copy assertions portable: Chromium exercises the real clipboard,
  while Firefox/WebKit capture the application's `clipboard.writeText` argument
  because Chromium's clipboard permission names are unsupported there. Both
  paths assert the same standalone HTML and title; downloads stay native.

Cross-browser closeout also starts an isolated Agent for onboarding and waits
for the workspace's initial `agent/connect` response to finish before full-page
navigation. This prevents WebKit from reporting aborted initialization fetches
as page errors; the zero-page-error assertion remains intact. Scripted-model
teardown now closes its owned sockets before awaiting server shutdown, guarded
by an unfinished-connection lifecycle test.

Not yet active because of explicit blockers:

- the formal embedding snapshot, reviewed fixed query vectors, real-model
  nightly/release evaluations, and snapshot publication remain blocked on the
  authorization evidence reference described below;
- onboarding through explicit graph selection, curriculum confirmation, course
  generation, real-worker lesson materialization, and readable first lesson is
  covered. Free-text vector positioning remains blocked on the reviewed
  embedding fixture and must not be reported as covered yet;
- the Compose-through-Caddy gate is implemented and scheduled, but could not be
  executed on the current workstation because its Colima Docker socket returns
  EOF. It is not a confirmed passing gate until its GitHub run succeeds;
- external `main` branch protection remains a release-readiness follow-up until
  the final GitHub check names have passed.

The formal snapshot download/publication workflows and the 100-case nightly /
1,718-case release real-model gates below remain planned, not implemented or
validated. They require the approved authorization record, reviewed query
vectors, immutable release-asset identity, and an approved scored baseline.
The current nightly workflow runs deterministic tests only. Local passing
results therefore close the deterministic implementation, not the full external
release-readiness contract.

### Verification record: 2026-08-27

- TypeScript passed.
- ESLint completed with zero errors and zero warnings after memoizing the
  onboarding tutor-style list.
- Web unit suite passed: 102 files and 545 tests; 5 files and 15 tests were
  intentionally skipped by their existing guards.
- Agent unit and graph integration suites passed.
- The 1,718-case learning-goal fixture and 28-case interactive-routing fixture
  validated; the 19-component visualization catalog validated.
- Production Next.js build passed.
- Database regression passed against a fingerprinted template clone, including
  Web job/race/idempotency suites, seven immutable-share cases, and Agent
  runtime HTTP/recovery behavior.
- Chromium browser regression passed for the learning loop, Tutor runtime,
  onboarding/lesson generation, anonymous share/import, and widget renderer.
- Production build and all raw/gzip route bundle budgets passed after the client
  i18n provider stopped bundling both complete dictionaries.
- KG snapshot publication correctly failed closed without creating an artifact
  because the required authorization decision record is not present.
- Production Compose configuration validates with the regression overlay. A
  runtime execution is still unverified locally because the Docker daemon is
  unavailable (`.colima/default/docker.sock` returned EOF).

### Verification record: 2026-08-28 (final working tree)

- `pnpm test:regression` completed successfully after the navigation,
  cross-browser, template-locking, share-locking, and dependency fixes.
- TypeScript, ESLint, Agent type-check/syntax, migration drift, all 31 KG source
  graphs/governance, 1,718 learning-goal cases, 28 interactive-routing cases,
  and the 19-component catalog passed.
- Web unit tests: 103 passing files / 555 passing tests. Four DB-guarded files /
  16 tests were exercised separately by the database gate. One existing live KG
  golden-routing test remained guarded pending the reviewed embedding fixture,
  giving five skipped files / 17 skipped tests in the unit-stage summary. No
  critical failure was quarantined or automatically retried.
- Agent unit/graph integration and the scripted-server unfinished-connection
  lifecycle test passed.
- All database suites passed, including nine share cases covering immutable
  versions, ownership, idempotent/concurrent imports, concurrent revoke/publish,
  and migration of a legacy token/snapshot/revocation record.
- All five browser scenarios passed in Chromium, Firefox, and WebKit. After
  the final onboarding connection change, Firefox onboarding was rechecked
  separately; WebKit's complete suite and Chromium's final combined gate also
  passed with that change.
- Production build and all five route raw/gzip budgets passed on Next.js
  16.2.11. The largest budgeted route, `/course/[id]`, was 994.4 KiB raw /
  288.8 KiB gzip.
- `pnpm audit:prod` passed: zero high/critical advisories; 14 moderate and six
  low advisories remain. Workflow/Compose YAML parsed and `git diff --check`
  passed.
- Per-run database clones were removed; only the fingerprinted synthetic
  template remains cached. No production migration, publication, commit, push,
  deployment, or branch-protection mutation was performed.
- This is local evidence only. The formal snapshot and real-model release
  gates remain planned; Compose runtime verification and GitHub activation
  remain blocked as listed below.

## Purpose

Primoria already has unit, database, Agent-runtime, browser, routing-fixture,
and widget tests. This plan closes the remaining production-path gaps and turns
the combined suite into a required regression gate for changes to critical
learner journeys.

The primary missing path is:

```text
Browser -> POST /api/copilotkit -> PrimoriaHttpAgent -> Agent POST /agent
        -> tool -> Web/DB/worker -> user-visible UI
```

This is a regression system, not a claim that every possible behavior can be
proven correct. Its contract is to protect the critical journeys and side-effect
boundaries listed below.

## Required regression scenarios

1. A pre-created synthetic user signs in through the real auth/session path.
2. An unambiguous curriculum choice reaches KG positioning, course creation,
   lesson generation, and a readable first lesson.
3. An ambiguous curriculum cannot create a course before explicit learner
   confirmation and continues after confirmation.
4. Tutor text streams through the real Web-to-Agent AG-UI/HTTP path.
5. A representative Tutor tool call crosses the same path and produces the
   expected user-visible result.
6. A transient failure before visible output is retryable; a failure after text
   or tool output is persisted as failed and never replays side effects.
7. A course owner creates a share, an anonymous visitor previews it, and a
   second authenticated user imports it.
8. Share snapshots are sanitized and owner-isolated; revoke, repeated import,
   duplicate-subject, and concurrent-import behavior remain deterministic.

Onboarding, Tutor, and share/import each retain one thin Chromium browser smoke
test. Branches and failure modes use HTTP/API plus database assertions.

## Deterministic PR environment

- Use real PostgreSQL with pgvector and the production migrations.
- Build one seeded template database and clone a uniquely named test database
  for each suite or shard. Never share a truncate-based database between
  parallel suites.
- Run real Web, Agent, and required worker processes.
- Use a local scripted OpenAI-compatible server for PR tests. It must support
  text streaming, tool-call streaming, structured JSON responses, transient
  pre-output failure, and post-output disconnect scenarios.
- Run the real lesson-generation worker with deterministic planner/writer model
  responses.
- Use synthetic accounts and content only. Never copy production user data into
  regression fixtures.

## Knowledge-graph fixture contract

Every PR imports all 31 runtime graphs and a reviewed formal embedding snapshot.
The snapshot contains only stable node keys, vectors, model-version metadata,
and a manifest; it must not contain `embed_text` or duplicated source text.

The snapshot is a versioned GitHub Release asset. CI must use an immutable asset
identifier and verify SHA-256; it must never resolve `latest` or silently fall
back to an older snapshot. The manifest binds:

- provider, actual model, declared model version, and vector dimension;
- graph/topic/concept/edge/embedding counts;
- KG source, label, alias, generator-script, and governance-decision hashes;
- the expected stable node-key set.

Fixed, reviewed query vectors exercise real pgvector retrieval without exposing
PR jobs to provider secrets or model drift.

Snapshot publication is blocked until the repository contains a minimal
governance decision record referencing the external authorization evidence for
the 10 runtime graphs whose current source review status is `needs_review`.
Sensitive authorization material stays outside the repository. The decision
record contains only the approver or approving role, date, covered graph IDs,
allowed artifact contents, and external evidence reference.

Snapshot regeneration is a protected manual workflow. It runs only when source,
alias, generator, governance, or embedding-model inputs change and requires
review before publication.

The guarded tool is:

```bash
pnpm --filter @primoria/web kg:snapshot export <new-directory>
pnpm --filter @primoria/web kg:snapshot verify <directory>
pnpm --filter @primoria/web kg:snapshot import <directory>
```

Export requires explicit `KG_EMBEDDING_PROVIDER`, `KG_EMBEDDING_MODEL`,
`KG_EMBEDDING_MODEL_VERSION`, `KG_EMBEDDING_SNAPSHOT_ID`, and
`KG_FIXED_QUERY_VECTORS_FILE`. It refuses to write until
`data/knowledge-graphs/governance/embedding-snapshot-authorization.json`
contains an approved decision with these fields:

```json
{
  "decision_id": "external decision identifier",
  "status": "approved",
  "approved_by_role": "approving role",
  "approved_at": "ISO-8601 date or timestamp",
  "covered_graph_ids": ["the exact 10 needs_review graph IDs"],
  "allowed_artifact_contents": [
    "fixed_query_vectors",
    "manifest",
    "model_metadata",
    "stable_node_keys",
    "vectors"
  ],
  "external_evidence_reference": "external URI; no secret material"
}
```

The snapshot JSONL permits only node keys and vectors. Import reconstructs
`embed_text` from the checked-in source/alias inputs, replaces only the declared
model version in one transaction, and runs every fixed query assertion before
commit.

## Immutable course-share contract

`course_share_links` represents the share series. Each explicit publication or
refresh creates a new immutable snapshot version and token. Activating a new
version atomically revokes the prior token. Public preview and import read only
the selected stored snapshot, never the owner's live course rows.

Already imported courses remain independent and unchanged when a new version is
published or an old token is revoked. This implementation covers one-time
import and same-version idempotency. Updating an existing imported course to a
new share version, including progress reconciliation, is explicitly out of
scope and requires a separate product decision and migration plan.

### Migration and recovery boundary

Migration `0051_fantastic_angel.sql` backfills each existing share into version 1
with its original token, snapshot, and revocation state before dropping the old
series-level columns. Deployment must back up the database and apply migrations
before starting the new Web image. This is not a rolling-compatible change for
the previous Web image: that image still expects the removed columns. Prefer a
forward fix; restoring a pre-migration backup also requires the corresponding
old application version and a plan for writes made after the backup. Do not
blindly roll back only the container or delete version rows. No production
migration or deployment is performed as part of this regression implementation.

## Execution layers

### Local prerequisites and commands

Run `pnpm install --frozen-lockfile` and `pnpm exec playwright install chromium`.
The configured local PostgreSQL server must have pgvector and a role allowed to
create/drop databases. `DATABASE_URL` is used to derive a template and unique
test databases; the app database is never truncated or migrated by the wrapper.
The fingerprinted template remains cached, while each run's clone is removed.

```bash
pnpm test:regression                # fast + production build/budgets + DB/browser
pnpm audit:prod                     # network-backed production security gate
pnpm test:regression:fast           # checks without a running app/test database
pnpm test:regression:db             # real migrations, jobs, sharing, Agent runtime
pnpm test:regression:browser        # five Chromium critical-journey scenarios
REGRESSION_BROWSER=firefox pnpm test:regression:browser
REGRESSION_BROWSER=webkit pnpm test:regression:browser
pnpm test:regression:compose        # requires a healthy Docker daemon
```

Install Firefox/WebKit with `pnpm exec playwright install firefox webkit` before
running those variants. Run browser variants sequentially within one checkout
because they share Next.js build output; nightly matrix jobs use separate
checkouts. The complete gate does not call a paid model provider or publish data.

### Development loop

- Run affected fast tests during development; target 2-5 minutes.
- Before declaring a feature complete, run `pnpm test:regression`.
- Do not install a mandatory Git commit or push hook.

### Pull requests

- Maximum target duration: 20 minutes.
- Chromium only for browser tests.
- Real DB/services/workers; deterministic model and embedding inputs.
- No silent retries and no quarantined critical tests.

### Nightly

- Run daily at 02:00 Asia/Singapore (18:00 UTC).
- Run Chromium, Firefox, and WebKit.
- Smoke-test the production Compose topology through Caddy.
- Run 100 fixed, versioned, stratified real-model routing cases.

### Release

- Trigger on release tags and manual `workflow_dispatch`.
- Run the production-topology gate and all 1,718 real-model routing cases.
- Critical policy cases require 100% pass.
- Overall metrics may not fall more than 1 percentage point below the approved
  versioned baseline.
- No language, curriculum-system, or routing category may fall more than
  2 percentage points below its approved baseline.

## CI and failure policy

`main` requires the fast, bundle, database, browser, and regression jobs. The
rule applies to administrators and has no bypass. The author of the introducing
change owns every failure until the suite is stable; a failed or flaky critical
test cannot be skipped, quarantined, or accepted after an automatic retry.

Test-infrastructure failures and product assertion failures are labelled
separately but both block merging. On failure, retain sanitized Web, Agent, and
worker logs, AG-UI events, Playwright traces, screenshots, and focused database
assertion output for 14 days. Artifacts must exclude cookies, internal secrets,
API keys, authorization headers, and raw sensitive learner text.

The first implementation does not add a repository-wide coverage percentage
gate. Coverage can be reported as a trend, while merge decisions use the
behavioral contracts above.

## Definition of done for future changes

A change must add or update regression coverage when it changes any of:

- a critical learner journey;
- persisted side effects, idempotency, or recovery behavior;
- a Web/Agent/worker protocol;
- authentication, authorization, public-route, or owner-isolation boundaries;
- KG positioning or curriculum confirmation policy;
- the immutable course-share contract.

## Implementation sequence

1. Test orchestration, scripted model service, database-template cloning, and
   sanitized failure artifacts.
2. KG snapshot manifest/export/import tooling and guarded authorization gate.
3. Immutable share versions, safe migration, and DB/API tests.
4. Onboarding, Tutor, and share/import HTTP plus browser scenarios.
5. PR, nightly, release, production-Compose, and branch-protection gates.

Each step must keep existing CI green. Migrations must be idempotent through the
normal bootstrap path and have a forward-compatible rollback or recovery note.

## Current blockers and deferred work

- **Release blocker:** external authorization evidence reference has not yet
  been recorded in the repository. Do not publish the formal 31-graph snapshot
  until it is supplied and the governance record is approved.
- **Local infrastructure:** the current Colima Docker daemon is unavailable, so
  the production Compose smoke must obtain its first passing evidence in GitHub
  or after the local daemon is repaired. Read-only diagnosis on 2026-08-28 found
  `docker.service` failed with `mkdir /var/lib/docker/tmp: no space left on device`.
  Docker Desktop's alternative socket is also absent. Existing VM/container data
  was not deleted, pruned, reset, or resized for this task.
- **External configuration:** `main` currently has no branch protection. Enable
  required checks only after their final job names exist and pass.
- **Deferred product work:** synchronizing an already imported course to a new
  share version, including lesson lineage and progress reconciliation.

## Owner handoff: 2026-08-28

Readiness decision: the verified local deterministic suite is ready for daily
development. The complete external release gate is not ready to sign off.
The production-readiness review keeps missing evidence and unfinished workflow
implementation separate; neither is an accepted or passing gate.

Read-only closeout checks confirmed:

- The existing GitHub login has `ADMIN` access to
  `ZhangJunQiu-Alan/Primoria`; no new token needs to be sent in chat.
- `main` has no classic branch protection and the repository has no rulesets.
  GitHub currently lists only `CI` and `Dependency Graph`; the new nightly
  workflow is still local. The new checks have not run remotely.
- Colima's actual data disk and partition are both 30 GiB, and the filesystem
  is full. The host has approximately 31 GiB free. A larger configured VM disk
  value is not evidence that the running disk has expanded. No storage was
  deleted, resized, or reset.
- The snapshot authorization record is still absent. Model configuration was
  checked for presence only; no credentials were displayed and no paid model
  calls were made during this closeout check.

### Owner response: publication authorized, KG evidence left unprovided

On 2026-08-28 the owner explicitly authorized committing and pushing all current
project changes, including earlier uncommitted work, and requested that all KG
authorization material remain blank/unprovided. No approved authorization JSON
will be fabricated: the absent record continues to block formal snapshot
export/publication and the dependent real-model gates. This is a deferral of
evidence, not a waiver or a source approval.

The publication includes the project changes but excludes ignored environment
files, build/test outputs, and the 26 empty package-manager cache files under
`scratch/.pnpm/`; those local cache files are preserved and the exact cache path
is now ignored. The explicit response authorizes commit/push only, not
deployment, production migration, Docker storage changes, or branch-protection
mutation. The original checklist below is retained for traceability; its
commit/push permission requirement is now satisfied.

### Original owner handoff checklist

1. **Publication scope and permission.** Authorize commit/push explicitly and
   confirm whether the scope includes the earlier uncommitted project changes
   as well as this regression implementation. Authorize `main` branch
   protection separately, or explicitly include it in the same instruction.
   Protection will be enabled only after the exact required check names have
   passed. Neither authorization includes deployment or production migration.
2. **Local Docker repair permission, if local Compose evidence is required.**
   Authorize a repair that preserves existing container volumes and databases;
   it may require a Colima restart and disk expansion. The concrete storage
   change must be confirmed before it is applied. Deleting volumes, resetting
   the VM, or pruning user data is not included. Alternatively, after authorized
   publication, the existing nightly/manual Compose job can obtain the first
   runtime evidence on GitHub without modifying the local VM.
3. **KG artifact authorization evidence.** Supply the decision identifier,
   approving person/role, approval date, and an external evidence reference
   permitting the snapshot contents listed in the contract above for the ten
   graphs below. Keep sensitive documents and provider keys out of chat and the
   repository. Approval to run tests alone is not a source-authorization record.

The exact current `needs_review` graph IDs are:

```text
senior_secondary_biology
senior_secondary_chemistry
senior_secondary_mathematics
senior_secondary_physics
singapore_h2_biology
singapore_h2_chemistry
singapore_h2_mathematics
singapore_h2_physics
singapore_lower_secondary_science
singapore_secondary_mathematics
```

### Remaining implementation and verification owned by the agent

- After publication permission: inspect the complete publication diff for
  secrets and unintended files, publish only the approved scope, and verify
  remote CI and all required check names before applying authorized protection.
- Obtain a passing production Compose-through-Caddy run either on GitHub or
  after an explicitly approved local repair. A parsed Compose file is not
  runtime evidence.
- After the KG evidence is supplied: record only its approved metadata, prepare
  fixed query vectors and the versioned 100-case stratified selection for
  review, implement the guarded snapshot publication/download and real-model
  nightly/release workflows, and run the approved evaluation scope. These
  workflows are still implementation work, not merely disabled configuration.
- Present the scored baseline for explicit approval before promoting it. Never
  turn the first observed result into an approved baseline automatically or
  weaken the existing 1,718-case corpus and critical-policy requirements.
- Record snapshot identity/checksum, reviewed baseline identity, actual GitHub
  run links, and final protection settings before signing off the full gate.

This handoff update changes documentation only. It does not replace the full
local test evidence recorded above or claim a new test run.
