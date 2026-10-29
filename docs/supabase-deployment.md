# Supabase database deployment

Current target: Primoria (`rygafvlzzkvqhhenajzi`), Singapore. The separate
English_Primoria project is unrelated. Supabase hosts PostgreSQL/pgvector and
a private Storage bucket for lesson image bytes; Next.js, the AG-UI Agent and
three workers still need an application server. Authentication remains
Primoria's server-owned users/identities/sessions. No Supabase browser SDK or
Auth migration is used; the only Supabase API credential is the server-side
Storage key described below.

## Local connection and commands

Copy `.env.supabase.example` to the ignored `.env.supabase` and provide distinct
`primoria_runtime` and `primoria_migrator` credentials. The runtime URL uses
Transaction pooling on port 6543; the migration URL keeps Session pooling on
port 5432 because the KG migration holds a session advisory lock. Runtime code
uses no session-level features (advisory locks, LISTEN/NOTIFY, session `SET`),
and both Postgres clients send unnamed statements (`prepare: false` /
node-postgres defaults). Both URLs use `sslmode=verify-full`.
`NODE_EXTRA_CA_CERTS` loads the bundled public Supabase CA before Node starts.
Certificate source:
https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

```bash
pnpm db:bootstrap
pnpm dev
# Other commands needing the managed database:
node scripts/with-database-env.mjs runtime pnpm --filter @primoria/web db:check
```

Root commands select cloud connections when `.env.supabase` exists. Explicit
connections take priority, preserving isolated regression databases and CI.
Direct `pnpm --filter` commands do not load the root connection file: use the
wrapper above. Local `.env.local` database values remain for offline testing.
Pool sizes follow the runtime URL unless `DATABASE_POOL_MAX` (or
`AGENT_DATABASE_POOL_MAX` for the Agent) is set explicitly. On the Session
pooler (`*.pooler.supabase.com:5432`, limited to 15 clients for the runtime
role as observed on October 22) every Web/worker process and each Agent client
keeps one connection: seven in total across Web, three workers and the Agent's
run store, checkpointer and course-card reader. On the Transaction pooler
(6543) or a direct/local database the defaults are 5 per Web/worker process
(2 for the extractor) and 4 for each Agent pool, because the pooler multiplexes
client connections. An existing `.env.supabase` that still points at 5432 keeps
the one-connection budget; switch its runtime URL to 6543 and remove
`DATABASE_POOL_MAX` to lift the single-connection serialization. TLS
verification stays enabled.

Agent startup respects inherited environment and does not run DDL; root
`pnpm dev` bootstraps with the migration credential first.

`pnpm db:initialize:kg` imports all 31 graphs and calls the embedding provider.
Do not repeat it just to start the app. The September 29 migration reused 2,035
local MiniMax vectors after verifying every node key, embedding input text and
model version against current sources. On October 25 the ten approved
China/Singapore graphs and the 234 cross-graph edges were re-imported with
`db:seed:kg <graph>` / `db:seed:kg-cross`, and the four graphs whose embedding
inputs changed were re-embedded with `db:seed:kg-embeddings <graph>` (2,043
vectors); a read-only comparison then found no row or `embed_text` drift across
all 31 graphs. Import never changes review status.

## Role and API boundary

Administrators provision two LOGIN roles with independent passwords:
`primoria_migrator` owns public/agent_runtime and has database CREATE;
`primoria_runtime` has CONNECT and application DML/sequence/function privileges.
Neither has SUPERUSER, CREATEDB, CREATEROLE or BYPASSRLS. Administrators install
vector in public before bootstrap. Do not run the app with the project admin.

Before creating tables, revoke schema access and object/default privileges for
PUBLIC, anon, authenticated and service_role in both application schemas.
Grant runtime DML on existing and future application tables, sequence usage and
function execution. Apply default grants to the actual migration owner.
The September 29 setup verified no API-role table grants in public or
agent_runtime and no runtime permission to create schemas or tables.
Keep Supabase-owned auth, storage, realtime and extension schemas intact.
Repository KG SQL, Drizzle and Agent migrations remain the schema authorities;
do not introduce a second supabase/migrations history.

## Lesson image Storage

`media_assets` keeps image metadata and `storage_path`; the bytes live in the
private `lesson-media` bucket (`PRIMORIA_MEDIA_BUCKET`). Web and the lesson
worker read and write it server-side with `SUPABASE_URL` and
`SUPABASE_SECRET_KEY` from `.env.supabase`; browsers only ever fetch
`/api/media/assets/[assetId]`. Use a secret key (`sb_secret_...`, sent on
`apikey`) or the legacy service_role key. It bypasses Storage policies but the
application schemas revoke service_role grants, so it cannot read app tables
through the Data API. Storage-only S3 access keys would narrow it further and
need a SigV4 client. Without these variables, bytes stay in Postgres.

Rows written before Storage keep their in-row `data_base64` and still serve.
Move them once, then reclaim the space:

```bash
pnpm media:migrate-storage             # dry run, lists rows to move
pnpm media:migrate-storage -- --apply  # creates the bucket if missing, uploads, verifies, clears data_base64
```

Then run `VACUUM (FULL) media_assets;` in the SQL editor. Free-plan Storage is
1 GB with 5 GB/month egress shared with the database.

## Application server deployment

Prepare `.env` with AI credentials, internal Agent secret, mail configuration,
public URLs and domain using `.env.production.example`; provide the separate
`.env.supabase` credentials. Self-hosted Postgres password fields are unused by
this topology. Restrict both files to mode 0600.

```bash
docker compose --env-file .env --env-file .env.supabase \
  -f docker-compose.supabase.yml config --quiet
docker compose --env-file .env --env-file .env.supabase \
  -f docker-compose.supabase.yml up -d --build
```

Only Caddy publishes ports. Migration jobs receive the migration URL; Web,
Agent and workers receive only the runtime URL. Supabase does not host these
long-running services. The original docker-compose.prod.yml remains the
explicit self-hosted database alternative.

The existing scripts/pg-backup.sh targets the self-hosted container and is not
a managed-database backup. The selected server now runs the managed-database
backup workflow recorded below. Mail delivery remains a separate launch gate.
Free capacity does not guarantee backups or production availability.

## September 29 test reset and cloud verification

The owner confirmed all old data was disposable. Removed: 39 Supabase Auth
users, the old 40-table application schema, 10 Storage objects, the obsolete
visual-generation cron job and its cron/network history. System schemas were
retained. Database size fell from about 507 MB to 14 MB, then about 37 MB after
current schema, KG import and verification. Old cron/network history occupied about 487 MB.

Imported: 31 graphs, 579 topics, 1,456 concepts, 2,035 vectors and 387
cross-subject edges. Signup, login and session reads passed through the local
Web server against Supabase; the check account was deleted. Web health reported
DB, KG, embeddings, Agent and workers healthy. This is a database migration and
local integration result, not a public website release.

## 2026-10-24 maintenance completion

The selected Singapore database has applied 0053 (synthetic Tutor-style fact
cleanup) and 0054 (`storage_path`). The 12 existing lesson images are now in
the private `lesson-media` bucket; all 12 read-back SHA-256 hashes matched the
originals and no image retains inline bytes. SQL Editor `VACUUM (FULL)
media_assets` succeeded, leaving 104 kB including indexes. New imports verify
complete byte equality before clearing their in-row copy. Operator backups
remain local and are not committed.

At this maintenance checkpoint the local runtime URL used Transaction pooling
on 6543; application hosting was deferred until the October 27 deployment.

## 2026-10-27 application deployment

The owner authorized deployment to Hostinger VPS 2099113 (KVM 2, Kuala Lumpur,
Ubuntu 24.04), using `https://srv2099113.hstgr.cloud`. Caddy terminates public
HTTPS; Web, Agent and all three workers remain on the internal Docker network.
Runtime database traffic uses the Transaction pooler on 6543; migration and
backup jobs use the Session pooler on 5432 with verified TLS. Credentials live
in mode-0600 files under `/srv/primoria/shared`; `/srv/primoria/current` selects
the active source release (`20261027-025639-node22`). All five application
containers run Node 22.23.4; Caddy and both migration jobs passed their startup
checks. Source snapshots include authorized uncommitted
changes; deployment does not imply a Git commit or push.

Web keeps a bounded, UID-1000 tmpfs for Next's image cache while its root
filesystem remains read-only. Caddy's healthcheck uses its loopback-only admin
endpoint; port 2019 is not published. The extractor receives both fast and
content model tiers, and Web receives the forwarded-client-IP auth settings
and optional SES configuration.

Verified live: HTTPS, signup/signin/signout, secure HttpOnly sessions, an
unauthenticated course denial, one SHA-256-verified image from each of the 31
graphs, real course generation, a completed Tutor run, quiz replay deduplication,
and completed learning-progress and fact-extractor jobs. These checks used a
synthetic deployment account. Password-reset email delivery is not configured
or accepted; SES sender/template credentials still need operator setup.

`primoria-backup.timer` runs daily at 20:30 UTC (04:30 Singapore time, with up
to five minutes of jitter). Its private helper takes a PostgreSQL 17 custom
dump of application, migration and Agent schemas, verifies its TOC and hash,
and maintains incremental private Storage byte backups with a SHA-256 manifest
under `/var/backups/primoria`. Dumps have 30-day retention; cached Storage
objects are preserved. The first complete Storage backup contains 1,470
objects (224,120,388 bytes), including all 1,456 prewarmed concept images.
The pre-deploy dump was actually restored into an isolated local database:
58 tables, 1,468 media rows and Agent checkpoint/event data were verified,
then only that temporary database was dropped. A pre-deploy copy and canonical
image bytes also remain on the operator's Mac. The VPS backup is independent
of Supabase, but is not a separately hosted off-site VPS backup service.

Private operational evidence and credentials are excluded from source and
container build contexts. The deployment record is under
`.private/deployment/20261027/`; do not commit it.

## 2026-10-28 custom domain

The owner purchased `primoria.app` at Dynadot for one year; the account lists
expiration on 2027-10-27. Dynadot DNS replaces parking with a root A record
`187.52.122.102` and a `www` CNAME to `primoria.app`, TTL 300 seconds.
The public origin is `https://primoria.app`; Caddy redirects
`https://www.primoria.app` permanently to the apex while preserving path and
query. The original Hostinger hostname remains available.

Both domain certificates have been issued and verified against the VPS with
normal TLS hostname validation. The Web image is rebuilt with
`NEXT_PUBLIC_APP_URL=https://primoria.app`; runtime `APP_BASE_URL` and
`PRIMORIA_DOMAIN` use the same origin/domain. Public DNS, the welcome page,
HTTP-to-HTTPS and www-to-apex redirects, API origin checks and hash-matched
image responses across all 31 graphs passed. The replacement Web container
passed its healthcheck. Detailed checks are recorded privately under
`.private/deployment/20261028/`.

The custom Caddy file is an operator overlay at
`/srv/primoria/current/docker/caddy/Caddyfile`, with a retained copy under
`/srv/primoria/shared/Caddyfile-domain-candidate`. Preserve this overlay when
creating a fresh release. Recreate Caddy after changing the current-release
symlink: reloading alone can keep the bind mount on the previous release's
inode. Prior Caddy/environment files are retained in
`/srv/primoria/shared/domain-cutover-20261028/`; the environment backup is secret.
The previous Web image is tagged `primoria-web:pre-domain-20261028`.

## 2026-10-29 current-work release

The current working tree, including uncommitted image-reuse/text-quality fixes,
the shared brand logo/favicon, deployment configuration and documentation, was
published as source snapshot `20261029-current-work` from branch
`perf/lesson-gen-image-slots` at base commit `7b0d39f7`. This deployment did not
create a Git commit or push. `/srv/primoria/current` now selects
`/srv/primoria/releases/20261029-current-work`; the existing custom-domain Caddy
overlay was preserved. Web, Agent and all three workers run Node 22.23.4 as UID
1000 with read-only root filesystems and no published application ports. Caddy
and all five application services passed healthchecks, and both migration jobs
exited successfully.

The fast, production-build/bundle, isolated database and browser regression
layers passed, including 1,186 Web tests, 1,726 learning-goal routing cases and
49-component replay at three viewport widths. The actual Linux worker image
also passed all 23 image reuse/editor/text-quality tests. A fresh pre-deploy
custom dump passed SHA-256 verification and an actual isolated local restore:
58 tables, 1,470 media rows, 62 Drizzle migration records and Agent
checkpoint/event tables. The incremental Storage backup covers 1,470 objects;
the old release and its exact image IDs remain available for rollback.

Verified against `https://primoria.app`: brand asset hashes, HTTPS/www
redirects, signup/signin/signout, secure HttpOnly sessions, unauthorized and
cross-origin denials, a completed real Tutor stream, image hashes across all
31 graphs, and a real 19-block lesson with three hash-verified reused images.
All three quiz blocks passed submission/replay checks, and lesson-generation,
learning-progress and extractor jobs completed without failures. The synthetic
account and its courses/sessions were removed; all 1,470 global media rows and
the Agent audit trail were preserved. Password-reset email remains unconfigured
pending SES sender/template credentials. Private release manifests, validation,
restore and smoke evidence are under `.private/deployment/20261029/`.
