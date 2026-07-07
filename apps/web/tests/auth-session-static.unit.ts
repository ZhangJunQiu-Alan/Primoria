#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function main() {
  const session = read("src/lib/auth/session.ts");
  const profileRoute = read("src/app/api/profile/route.ts");

  assert(!session.includes("new Map"), "auth session does not use process-local Map cache");
  assert(!session.includes("SESSION_USER_CACHE_TTL_MS"), "auth session has no process-local TTL cache");
  assert(!session.includes("sessionUserCache"), "auth session has no process-local user cache");
  assert(!session.includes("invalidateCurrentSessionUserCache"), "auth session exposes no local-only cache invalidation helper");

  assert(session.includes(".from(sessions)"), "getCurrentUser reads the sessions table");
  assert(session.includes("eq(sessions.tokenHash, tokenHash)"), "getCurrentUser validates the current session token hash");
  assert(session.includes("gt(sessions.expiresAt, now)"), "getCurrentUser rejects expired sessions from the database");
  assert(session.includes("getDb().delete(sessions).where(eq(sessions.tokenHash, tokenHash))"), "sign-out deletes the database session");

  assert(!profileRoute.includes("invalidateCurrentSessionUserCache"), "profile updates do not rely on local-only cache invalidation");

  process.stdout.write("[auth-session-static.unit] ALL CHECKS PASSED\n");
}

main();
