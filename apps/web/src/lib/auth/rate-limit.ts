import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "../db/client";

const DEFAULT_AUTH_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_AUTH_RATE_LIMIT_IP_MAX = 5;
const DEFAULT_AUTH_RATE_LIMIT_ACCOUNT_MAX = 5;
const DEFAULT_AUTH_RATE_LIMIT_CLEANUP_SAMPLE_RATE = 0.01;

export type AuthRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number; reason: "ip" | "account" };

export type AuthRateLimitConfig = {
  enabled: boolean;
  windowSeconds: number;
  ipMaxAttempts: number;
  accountMaxAttempts: number;
  cleanupSampleRate: number;
};

type AuthRateLimitKey = {
  id: string;
  scope: `${string}:ip` | `${string}:account`;
  identifierHash: string;
  maxAttempts: number;
  reason: "ip" | "account";
};

type RateLimitRow = {
  attempts?: number | string;
  retry_after_seconds?: number | string;
  retryAfterSeconds?: number | string;
};

export function getAuthRateLimitConfig(): AuthRateLimitConfig {
  const disabled =
    process.env.NODE_ENV !== "production" &&
    (process.env.AUTH_RATE_LIMIT_DISABLED === "1" || process.env.AUTH_RATE_LIMIT_DISABLED === "true");
  return {
    enabled: !disabled,
    windowSeconds: positiveIntEnv("AUTH_RATE_LIMIT_WINDOW_SECONDS", DEFAULT_AUTH_RATE_LIMIT_WINDOW_SECONDS, 1, 3600),
    ipMaxAttempts: positiveIntEnv("AUTH_RATE_LIMIT_IP_MAX", DEFAULT_AUTH_RATE_LIMIT_IP_MAX, 1, 1000),
    accountMaxAttempts: positiveIntEnv("AUTH_RATE_LIMIT_ACCOUNT_MAX", DEFAULT_AUTH_RATE_LIMIT_ACCOUNT_MAX, 1, 1000),
    cleanupSampleRate: numberEnv("AUTH_RATE_LIMIT_CLEANUP_SAMPLE_RATE", DEFAULT_AUTH_RATE_LIMIT_CLEANUP_SAMPLE_RATE, 0, 1),
  };
}

export function getClientIp(headers: Headers): string {
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
    headers.get("forwarded")?.match(/for="?([^;,"]+)/i)?.[1],
  ];
  return candidates.map((candidate) => candidate?.trim()).find(Boolean) ?? "unknown";
}

export function getAuthRateLimitKeys(input: {
  headers: Headers;
  email: string;
  config?: AuthRateLimitConfig;
  scope?: string;
}): AuthRateLimitKey[] {
  const config = input.config ?? getAuthRateLimitConfig();
  const scope = input.scope ?? "auth";
  const ip = getClientIp(input.headers);
  const email = input.email.trim().toLowerCase();
  return [
    buildKey(`${scope}:ip`, ip, config.ipMaxAttempts, "ip"),
    buildKey(`${scope}:account`, email, config.accountMaxAttempts, "account"),
  ];
}

export async function checkAuthRateLimit(input: {
  headers: Headers;
  email: string;
  config?: AuthRateLimitConfig;
  scope?: string;
}): Promise<AuthRateLimitResult> {
  const config = input.config ?? getAuthRateLimitConfig();
  if (!config.enabled) return { allowed: true };

  const keys = getAuthRateLimitKeys({ ...input, config });
  await maybePruneExpiredRateLimits(config);

  for (const key of keys) {
    const result = await consumeRateLimitKey(key, config.windowSeconds);
    if (!result.allowed) return result;
  }

  return { allowed: true };
}

export function authRateLimitHeaders(result: Exclude<AuthRateLimitResult, { allowed: true }>) {
  return {
    "Retry-After": String(result.retryAfterSeconds),
    "Cache-Control": "no-store",
  };
}

async function consumeRateLimitKey(key: AuthRateLimitKey, windowSeconds: number): Promise<AuthRateLimitResult> {
  const intervalSeconds = sql.raw(String(windowSeconds));
  const result = await getDb().execute(sql`
    insert into auth_rate_limits (
      id, scope, identifier_hash, window_start, attempts, expires_at, updated_at
    ) values (
      ${key.id}, ${key.scope}, ${key.identifierHash}, now(), 1,
      now() + interval '${intervalSeconds} seconds',
      now()
    )
    on conflict (id) do update set
      window_start = case
        when auth_rate_limits.window_start <= now() - interval '${intervalSeconds} seconds'
          then now()
        else auth_rate_limits.window_start
      end,
      attempts = case
        when auth_rate_limits.window_start <= now() - interval '${intervalSeconds} seconds'
          then 1
        else auth_rate_limits.attempts + 1
      end,
      expires_at = now() + interval '${intervalSeconds} seconds',
      updated_at = now()
    returning
      attempts,
      greatest(
        1,
        ceil(extract(epoch from (window_start + interval '${intervalSeconds} seconds' - now())))::int
      ) as retry_after_seconds
  `);

  const row = rowsFromResult(result)[0] as RateLimitRow | undefined;
  const attempts = Number(row?.attempts ?? 1);
  if (attempts <= key.maxAttempts) return { allowed: true };

  return {
    allowed: false,
    retryAfterSeconds: Number(row?.retry_after_seconds ?? row?.retryAfterSeconds ?? windowSeconds),
    reason: key.reason,
  };
}

async function maybePruneExpiredRateLimits(config: AuthRateLimitConfig) {
  if (config.cleanupSampleRate <= 0 || Math.random() > config.cleanupSampleRate) return;
  await getDb().execute(sql`delete from auth_rate_limits where expires_at < now()`);
}

function buildKey(
  scope: AuthRateLimitKey["scope"],
  identifier: string,
  maxAttempts: number,
  reason: AuthRateLimitKey["reason"],
): AuthRateLimitKey {
  const identifierHash = sha256(identifier);
  return {
    id: `${scope}:${identifierHash}`,
    scope,
    identifierHash,
    maxAttempts,
    reason,
  };
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function positiveIntEnv(name: string, fallback: number, min: number, max: number) {
  const configured = Number(process.env[name] ?? "");
  if (!Number.isFinite(configured) || configured <= 0) return fallback;
  return Math.min(Math.max(Math.floor(configured), min), max);
}

function numberEnv(name: string, fallback: number, min: number, max: number) {
  const configured = Number(process.env[name] ?? "");
  if (!Number.isFinite(configured)) return fallback;
  return Math.min(Math.max(configured, min), max);
}

function rowsFromResult(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result as Array<Record<string, unknown>>;
  const rows = (result as { rows?: unknown })?.rows;
  return Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
}
