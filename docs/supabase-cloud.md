# Supabase Cloud Database Runbook (Historical)

This runbook is retained only as historical context. Primoria no longer uses
Supabase as its default database host or auth provider.

Current runtime direction:

- Local development database: Docker Compose Postgres using
  `pgvector/pgvector:pg16`, bound to `127.0.0.1:5432`.
- Historical/shared remote database: private Tencent Cloud PostgreSQL through
  an SSH tunnel to `127.0.0.1:15432` only when intentionally targeting that
  remote environment.
- Same-server deployment: connect to PostgreSQL on `127.0.0.1:5432`.
- Remote managed PostgreSQL with SSL: set `DATABASE_SSL=require`.
- Auth: app-owned `users`, `identities`, `sessions`, and `auth_rate_limits`
  tables.
- Supabase URL, anon key, service-role key, and Supabase runtime helpers are not
  part of the active Primoria path.

Use the database section in [README.md](../README.md) as the source of truth for
new setup.

## When This Document Is Relevant

Refer to this file only if the team intentionally decides to evaluate Supabase
again as a generic hosted PostgreSQL provider. In that case, treat Supabase as a
Postgres host only unless a separate architecture decision reintroduces Supabase
Auth.

Do not copy old `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or
`SUPABASE_SERVICE_ROLE_KEY` setup into the active app environment.

## Historical Setup Shape

The old plan was:

1. Create a Supabase project.
2. Copy the dashboard Postgres connection string.
3. Put that connection string in `DATABASE_URL`.
4. Run `pnpm --filter @primoria/web db:migrate`.

That still describes a generic hosted-Postgres migration flow, but it is not the
current Primoria runbook.

## Current Replacement

```bash
# Local Docker development database
docker compose up -d postgres
DATABASE_URL="postgresql://primoria_app:primoria_dev@127.0.0.1:5432/primoria"
DATABASE_SSL=disable

# Optional historical Tencent Cloud tunnel, only when intentionally needed
# ssh -N -L 15432:127.0.0.1:5432 ubuntu@<server>
# DATABASE_URL="postgresql://primoria_app:[db-password]@127.0.0.1:15432/primoria"
# DATABASE_SSL=false

# Remote direct SSL-required managed Postgres, if ever used
DATABASE_SSL=require
```

Validate with:

```bash
pnpm --filter @primoria/web db:check
pnpm --filter @primoria/web db:migrate
```
