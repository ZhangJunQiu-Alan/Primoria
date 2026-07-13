# syntax=docker/dockerfile:1
# One image tree for all Primoria app processes. Targets:
#   web    — Next.js app (next build + next start)
#   agent  — LangGraph tutor graph server (internal only, never publish 2024)
#   worker — background workers + db:migrate + operational scripts
FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# Toolchain for native deps (e.g. better-sqlite3) whose prebuilt binaries may
# be unavailable or unreachable at install time.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

FROM base AS source
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY patches ./patches
COPY apps/web/package.json ./apps/web/package.json
COPY apps/agent/package.json ./apps/agent/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/memory/package.json ./packages/memory/package.json
RUN pnpm install --frozen-lockfile
COPY . .

# Runtime images deliberately start from a clean Node base. Native build tools
# remain in the build stage and are not available to a compromised service.
FROM node:20-bookworm-slim AS runtime
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app
COPY --from=source --chown=node:node /app /app
USER node

# Keep non-web targets directly after source so legacy Docker builders can stop
# without executing the memory-intensive Next.js build stage.
FROM runtime AS worker
ENV NODE_ENV=production
# Default command; docker-compose.prod.yml overrides per worker service.
CMD ["pnpm", "--filter", "@primoria/web", "worker:lesson-generation"]

FROM runtime AS agent
ENV NODE_ENV=production
EXPOSE 2024
CMD ["pnpm", "--filter", "@primoria/agent", "start"]

FROM source AS webbuild
# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so
# they must be provided as build args (docker compose passes them from .env).
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @primoria/web build

FROM runtime AS web
COPY --from=webbuild --chown=node:node /app/apps/web/.next /app/apps/web/.next
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "@primoria/web", "start"]
