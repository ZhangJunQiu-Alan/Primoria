# Supabase Cloud Database

Primoria already talks to Postgres through Drizzle, so the cloud deployment path is to use Supabase as the shared hosted Postgres provider. We do not need to introduce Supabase client-side APIs for this first step.

## 1. Create the cloud project

Create a Supabase project at `https://database.new`.

Save the database password in the team secret manager. Do not commit it to the repo.

## 2. Copy the cloud connection string

In the Supabase project dashboard, open **Connect** and copy the **Session Pooler** connection string.

Use it as `DATABASE_URL`:

```bash
DATABASE_URL="postgresql://postgres.[project-ref]:[db-password]@[pooler-host].pooler.supabase.com:5432/postgres"
```

The Session Pooler URL is the default choice for this app because the Next.js server and Drizzle migrations need normal Postgres session behavior. Supabase's Transaction Pooler can be useful for highly constrained serverless runtimes, but it can break migration/session assumptions.

Copy the full host from the Supabase dashboard instead of guessing it from the region. For example, the pooler host may be `aws-0-[region]` or `aws-1-[region]`.

## 3. Configure local development

Create `apps/web/.env.local`:

```bash
OPENAI_BASE_URL=https://ai.orbitlink.me/v1
OPENAI_API_KEY=replace-with-your-key
OPENAI_MODEL=gpt-5.4

DATABASE_URL="postgresql://postgres.[project-ref]:[db-password]@[pooler-host].pooler.supabase.com:5432/postgres"
```

Then verify the cloud connection:

```bash
pnpm --filter @primoria/web db:check
```

## 4. Run migrations against Supabase

Apply the existing Drizzle migrations to the cloud database:

```bash
pnpm --filter @primoria/web db:migrate
pnpm --filter @primoria/web db:check
```

After this, everyone who uses the same `DATABASE_URL` is sharing the same cloud database.

## 5. Configure hosted app environments

Set the same `DATABASE_URL` in the deployment platform environment variables for the web app.

For production DeepAgent mode, also set:

```bash
PRIMORIA_WORKSPACE_DEEPAGENT=1
PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE=postgres
PRIMORIA_WORKSPACE_OPERATOR_TOKEN=replace-with-a-long-random-token
```

## 6. Current blocker for fully automatic setup

The local Supabase CLI is installed, but this machine is not logged in:

```bash
supabase login
```

or

```bash
export SUPABASE_ACCESS_TOKEN=...
```

Once authenticated, the project can be linked with:

```bash
supabase link --project-ref <project-ref>
```

Primoria should still use `pnpm --filter @primoria/web db:migrate` as the source of truth for schema migrations because the app already stores migrations under `apps/web/drizzle`.
