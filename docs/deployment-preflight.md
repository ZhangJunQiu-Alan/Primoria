# Production Deployment Preflight

This is the release handoff for the single-server production stack. Do not put
real credentials in this repository, commit messages, issue text, or logs.
It reflects the modular-monolith-plus stack as of July 2026.

## Deployment trigger

Do not deploy or request credentials during normal code work. When the owner
explicitly asks to deploy:

1. Re-read this file and inspect the current branch and dirty tree.
2. Ask only for the credentials and external-console access still required.
3. Validate locally before changing the server.
4. Confirm the target host, domain, branch, maintenance window, and rollback
   point before the first remote mutation.

## Information to request at deployment time

- Target server SSH host, port, user, and authentication method.
- Production domain and confirmation that its DNS A/AAAA records may be changed.
- Production `APP_BASE_URL` / `NEXT_PUBLIC_APP_URL`.
- Chat model provider, base URL, server-side API key, default `OPENAI_MODEL`,
  fast routing model `AI_MODEL_FAST`, and optional content model
  `AI_MODEL_CONTENT`.
- Embedding provider credentials. For MiniMax this includes API key and group ID
  when the account requires one.
- Tencent SES secret ID/key, region, verified sender, approved password-reset
  template ID, and subject.
- Optional Cloudflare Turnstile site key and corresponding server-side secret if
  Turnstile is enabled by the deployed auth flow.
- If internal analytics is enabled, the exact operator email allowlist for
  `PRIMORIA_INTERNAL_EMAILS`; do not enable the page without an allowlist.
- Git remote authentication only if the existing environment cannot push.

Generate the migration and runtime database passwords at deployment time. They
must be different high-entropy, URL-safe values:

```env
POSTGRES_MIGRATOR_PASSWORD=...
POSTGRES_RUNTIME_PASSWORD=...
PRIMORIA_AGENT_INTERNAL_SECRET=...
```

The Agent secret must be a third independent high-entropy value shared only by
the Web and Agent containers. Production startup fails closed when it is absent.

The owner should not be asked for credentials already present and verifiable in
the authorized deployment environment. Never print secret values during checks.

## External prerequisites

- Linux host with Docker Engine and Docker Compose plugin.
- At least 4 GB RAM, or verified swap capacity for the Next.js image build.
- Ports 80 and 443 open; port 2024, port 3000, and Postgres must not be public.
- DNS points to the target host before requesting the production TLS cutover.
- Tencent SES sender domain/address and template are approved before testing
  password-reset delivery.
- Backup destination exists with mode `0700`, plus enough free disk space.
- A private Tencent COS bucket exists with versioning enabled, a retention
  lifecycle of at least 30 days, server-side encryption, and credentials scoped
  only to the configured backup prefix.

## Required pre-deploy gates

Run from a clean, reviewable branch:

```bash
pnpm install --frozen-lockfile
pnpm --filter @primoria/web typecheck
pnpm lint
pnpm --filter @primoria/web test
pnpm --filter @primoria/agent test
pnpm catalog:validate
pnpm --filter @primoria/web test:interactive-routing
pnpm test:learning-goal-routing
bash -n scripts/pg-restore-drill.sh
pnpm build
pnpm audit:prod
docker compose -f docker-compose.prod.yml config --quiet
docker compose -f docker-compose.prod.yml build
```

`pnpm test:learning-goal-routing` must verify and validate at least 1,718 cases
across all 31 runtime graphs. Do not lower the corpus floor, remove the bilingual
China/Singapore boundary requirements, or weaken existing gold policies to make
this gate pass.

The container build gate is mandatory. It must confirm that Web, Agent, and all
Workers start as the non-root `node` user with the read-only filesystem and
capability restrictions in `docker-compose.prod.yml`.

## Deployment sequence

1. Create `/srv/primoria/.env` from `.env.production.example`; set mode `0600`.
2. Take and verify a pre-deploy database backup.
3. Record the currently deployed Git SHA and image IDs for rollback.
4. Build images, then start the Compose stack.
5. Allow `migrate`, `agent-migrate`, and `grant-runtime` to finish in order.
   `agent-migrate` owns both the `agent_runtime` tables and LangGraph checkpoint
   schema setup; the long-running Agent must not create schema at startup.
6. Confirm that long-running services use `primoria_runtime`, never
   `primoria_migrator`.
7. On the first deployment only, initialize KG data and embeddings.
   `db:initialize:kg` currently includes all 31 source graphs, including 10
   China/Singapore graphs whose source status remains `needs_review`. Record the
   production review-state decision before running the all-graph command; the
   importer does not enforce it automatically.
8. Verify health, authentication, course access, one quiz submission/replay,
   Tutor streaming, Worker queue consumption, email delivery, and public TLS.
   Include one onboarding or Settings Facts intake: the request should return
   before model extraction, `worker-extractor` should complete the queued job,
   and `/api/health` should report no stalled profile-intake work.
9. In the main Tutor, open two instances of the same catalog component. Confirm
   their configs remain independent, then reference one instance explicitly in
   a spoken adjustment and confirm only that instance receives a patch.
10. If internal analytics is enabled, confirm an allowlisted operator can open
    the analysis page and a normal authenticated user receives a denial.
11. Run `scripts/pg-restore-drill.sh` and retain its JSON success record. The
    result must report all public and `agent_runtime` run/event/checkpoint tables.

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=200 migrate agent-migrate grant-runtime web agent
curl --fail --silent https://<domain>/api/health
```

## Database privilege checks

`primoria_migrator` owns schema changes. `primoria_runtime` has connect, schema
usage, table DML, and sequence access only. Verify the runtime role cannot create
roles, databases, schemas, or tables before accepting the deployment.

Existing database volumes are supported: `grant-runtime` creates or updates the
runtime role after both migration jobs and reapplies grants/default privileges.

## Rollback and recovery

The initial recovery objectives are **RPO 24 hours** and **RTO 4 hours**. Daily
`scripts/pg-backup.sh` runs are successful only after encrypted COS upload and
checksum verification. Run the isolated restore drill weekly. PITR is not part
of this first release; an RPO below 24 hours requires PostgreSQL WAL archival.

- Application rollback: restore the recorded image tags or Git SHA and restart
  Compose without reversing migrations blindly.
- Database rollback: use the verified pre-deploy backup only when a forward fix
  is unsafe; preserve the failed database for diagnosis.
- Never run destructive Git or database reset commands as a rollback shortcut.
- Database changes must use expand/contract: deploy additive schema first, keep
  the old application compatible through the rollout window, migrate data, then
  remove old schema only in a later release. Prefer a forward fix after a
  migration; restore only when forward recovery is unsafe.
- After rollback, verify `/api/health`, Agent readiness, queues, login, and one
  read-only course request.

## Commit and push handoff

Do not commit or push merely because this checklist was updated. Wait for the
owner's explicit instruction. At that time:

1. Inspect the complete dirty tree and remote/branch status.
2. Preserve unrelated user changes and split work by functional boundary.
3. Use concise imperative subjects, explanatory bodies, and a `Test:` section.
4. Run validation appropriate to every batch and the final combined tree.
5. Push only after all commits succeed; report commit SHAs and pushed branch.

Derive commit boundaries from the actual diff at hand; this runbook does not
predefine release batches.
