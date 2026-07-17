import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb, type DbOrTx } from "@/lib/db/client";

const DEFAULT_WINDOW_SECONDS = 60;
const DEFAULT_REQUESTS_PER_WINDOW = 20;
const DEFAULT_MAX_CONCURRENCY = 2;
const DEFAULT_REQUEST_TIMEOUT_SECONDS = 45;
const DEFAULT_CACHE_TTL_SECONDS = 600;

type StoredResponse = Record<string, unknown>;

export type InteractiveRequestReservation =
  | { kind: "execute"; requestId: string }
  | { kind: "cached"; status: number; response: StoredResponse }
  | { kind: "in_progress"; retryAfterSeconds: number }
  | { kind: "conflict" }
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "concurrency_limited"; retryAfterSeconds: number };

type BudgetConfig = {
  windowSeconds: number;
  requestsPerWindow: number;
  maxConcurrency: number;
  requestTimeoutSeconds: number;
  cacheTtlSeconds: number;
};

export function getInteractiveRequestBudgetConfig(): BudgetConfig {
  return {
    windowSeconds: positiveInt("INTERACTIVE_COMPONENT_RATE_LIMIT_WINDOW_SECONDS", DEFAULT_WINDOW_SECONDS, 1, 3600),
    requestsPerWindow: positiveInt("INTERACTIVE_COMPONENT_RATE_LIMIT_MAX", DEFAULT_REQUESTS_PER_WINDOW, 1, 1000),
    maxConcurrency: positiveInt("INTERACTIVE_COMPONENT_CONCURRENCY_MAX", DEFAULT_MAX_CONCURRENCY, 1, 20),
    requestTimeoutSeconds: positiveInt("INTERACTIVE_COMPONENT_REQUEST_TIMEOUT_SECONDS", DEFAULT_REQUEST_TIMEOUT_SECONDS, 10, 300),
    cacheTtlSeconds: positiveInt("INTERACTIVE_COMPONENT_IDEMPOTENCY_TTL_SECONDS", DEFAULT_CACHE_TTL_SECONDS, 60, 86_400),
  };
}

export function hashInteractiveRequest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function reserveInteractiveRequest(input: {
  ownerId: string;
  idempotencyKey: string;
  requestHash: string;
}): Promise<InteractiveRequestReservation> {
  const config = getInteractiveRequestBudgetConfig();
  const requestId = createHash("sha256").update(`${input.ownerId}\0${input.idempotencyKey}`).digest("hex");
  const windowSeconds = sql.raw(String(config.windowSeconds));
  const timeoutSeconds = sql.raw(String(config.requestTimeoutSeconds));
  const cacheTtlSeconds = sql.raw(String(config.cacheTtlSeconds));

  return getDb().transaction(async (tx) => {
    await tx.execute(sql`
      insert into interactive_component_quotas (owner_id, window_started_at, request_count, in_flight, updated_at)
      values (${input.ownerId}, now(), 0, 0, now())
      on conflict (owner_id) do nothing
    `);
    await tx.execute(sql`
      select owner_id from interactive_component_quotas
      where owner_id = ${input.ownerId}
      for update
    `);
    await tx.execute(sql`
      delete from interactive_component_requests
      where owner_id = ${input.ownerId} and status <> 'running' and expires_at <= now()
    `);

    const existing = firstRow(await tx.execute(sql`
      select id, request_hash, status, response_status, response, started_at, expires_at
      from interactive_component_requests
      where owner_id = ${input.ownerId} and idempotency_key = ${input.idempotencyKey}
      for update
    `));

    if (existing) {
      if (existing.request_hash !== input.requestHash) return { kind: "conflict" };
      if (existing.status === "completed" && new Date(String(existing.expires_at)).getTime() > Date.now()) {
        return {
          kind: "cached",
          status: Number(existing.response_status ?? 200),
          response: (existing.response ?? {}) as StoredResponse,
        };
      }
      if (
        existing.status === "running"
        && new Date(String(existing.started_at)).getTime() > Date.now() - config.requestTimeoutSeconds * 1000
      ) {
        return { kind: "in_progress", retryAfterSeconds: 1 };
      }
      await tx.execute(sql`
        update interactive_component_requests
        set status = 'failed', updated_at = now(), expires_at = now()
        where id = ${requestId}
      `);
    }

    await tx.execute(sql`
      update interactive_component_requests
      set status = 'failed', updated_at = now(), expires_at = now()
      where owner_id = ${input.ownerId}
        and status = 'running'
        and started_at <= now() - interval '${timeoutSeconds} seconds'
    `);

    const quota = firstRow(await tx.execute(sql`
      select
        case when window_started_at <= now() - interval '${windowSeconds} seconds' then 0 else request_count end as request_count,
        case when window_started_at <= now() - interval '${windowSeconds} seconds'
          then ${config.windowSeconds}
          else greatest(1, ceil(extract(epoch from (window_started_at + interval '${windowSeconds} seconds' - now())))::int)
        end as retry_after_seconds,
        (select count(*)::int from interactive_component_requests
          where owner_id = ${input.ownerId} and status = 'running'
            and started_at > now() - interval '${timeoutSeconds} seconds') as in_flight
      from interactive_component_quotas
      where owner_id = ${input.ownerId}
    `));
    const requestCount = Number(quota?.request_count ?? 0);
    const inFlight = Number(quota?.in_flight ?? 0);
    if (requestCount >= config.requestsPerWindow) {
      return { kind: "rate_limited", retryAfterSeconds: Number(quota?.retry_after_seconds ?? config.windowSeconds) };
    }
    if (inFlight >= config.maxConcurrency) {
      return { kind: "concurrency_limited", retryAfterSeconds: 1 };
    }

    await tx.execute(sql`
      insert into interactive_component_requests (
        id, owner_id, idempotency_key, request_hash, status, started_at, expires_at, updated_at
      ) values (
        ${requestId}, ${input.ownerId}, ${input.idempotencyKey}, ${input.requestHash}, 'running', now(),
        now() + interval '${cacheTtlSeconds} seconds', now()
      )
      on conflict (owner_id, idempotency_key) do update set
        request_hash = excluded.request_hash,
        status = 'running',
        response_status = null,
        response = null,
        started_at = now(),
        completed_at = null,
        expires_at = excluded.expires_at,
        updated_at = now()
    `);
    await tx.execute(sql`
      update interactive_component_quotas
      set window_started_at = case
            when window_started_at <= now() - interval '${windowSeconds} seconds' then now()
            else window_started_at
          end,
          request_count = case
            when window_started_at <= now() - interval '${windowSeconds} seconds' then 1
            else request_count + 1
          end,
          in_flight = ${inFlight + 1},
          updated_at = now()
      where owner_id = ${input.ownerId}
    `);
    return { kind: "execute", requestId };
  });
}

export async function completeInteractiveRequest(input: {
  requestId: string;
  ownerId: string;
  status: number;
  response: StoredResponse;
}) {
  const ttlSeconds = sql.raw(String(getInteractiveRequestBudgetConfig().cacheTtlSeconds));
  await getDb().transaction(async (tx) => {
    const updated = await tx.execute(sql`
      update interactive_component_requests
      set status = 'completed', response_status = ${input.status}, response = ${JSON.stringify(input.response)}::jsonb,
          completed_at = now(), expires_at = now() + interval '${ttlSeconds} seconds', updated_at = now()
      where id = ${input.requestId} and owner_id = ${input.ownerId} and status = 'running'
      returning id
    `);
    if (firstRow(updated)) await releaseSlot(tx, input.ownerId);
  });
}

export async function failInteractiveRequest(requestId: string, ownerId: string) {
  await getDb().transaction(async (tx) => {
    const updated = await tx.execute(sql`
      update interactive_component_requests
      set status = 'failed', completed_at = now(), expires_at = now(), updated_at = now()
      where id = ${requestId} and owner_id = ${ownerId} and status = 'running'
      returning id
    `);
    if (firstRow(updated)) await releaseSlot(tx, ownerId);
  });
}

async function releaseSlot(tx: DbOrTx, ownerId: string) {
  await tx.execute(sql`
    update interactive_component_quotas
    set in_flight = greatest(0, in_flight - 1), updated_at = now()
    where owner_id = ${ownerId}
  `);
}

function firstRow(result: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(result)) return result[0] as Record<string, unknown> | undefined;
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    return Array.isArray(rows) ? rows[0] as Record<string, unknown> | undefined : undefined;
  }
  return undefined;
}

function positiveInt(name: string, fallback: number, min: number, max: number) {
  const parsed = Number(process.env[name] ?? "");
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}
