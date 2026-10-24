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
model version against current sources. Ten registered China/Singapore graphs
still have source status `needs_review`; import does not approve them.

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
a managed-database backup. Before public launch, configure and verify Supabase
backup coverage or a remote pg_dump/restore workflow, application hosting,
DNS/TLS, mail and monitoring. Free capacity does not guarantee backups or
production availability.

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

The local runtime URL uses Transaction pooling on 6543. There is no application
server or domain yet; configuring and verifying a production runtime URL stays
a future deployment step, explicitly deferred by the owner.
