#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function walk(dir: string): string[] {
  return readdirSync(join(process.cwd(), dir)).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(join(process.cwd(), path));
    if (stat.isDirectory()) return walk(path);
    return /\.(ts|tsx)$/.test(path) ? [path] : [];
  });
}

function main() {
  const session = read("src/lib/auth/session.ts");
  const guard = read("src/lib/auth/guard.ts");
  const profileRoute = read("src/app/api/profile/route.ts");
  const signoutRoute = read("src/app/auth/signout/route.ts");
  const navRail = read("src/components/tutor/nav-rail.tsx");
  const homePage = read("src/app/page.tsx");

  assert(!session.includes("new Map"), "auth session does not use process-local Map cache");
  assert(!session.includes("SESSION_USER_CACHE_TTL_MS"), "auth session has no process-local TTL cache");
  assert(!session.includes("sessionUserCache"), "auth session has no process-local user cache");
  assert(!session.includes("invalidateCurrentSessionUserCache"), "auth session exposes no local-only cache invalidation helper");

  assert(session.includes("cache(getCurrentUser)"), "RSC auth helper uses React cache around getCurrentUser");
  assert(session.includes(".from(sessions)"), "getCurrentUser reads the sessions table");
  assert(session.includes("eq(sessions.tokenHash, tokenHash)"), "getCurrentUser validates the current session token hash");
  assert(session.includes("gt(sessions.expiresAt, now)"), "getCurrentUser rejects expired sessions from the database");
  assert(session.includes("isAuthUnavailableError(error)"), "getCurrentUser recognizes database connectivity failures");
  assert(session.includes('new AuthError("auth_unavailable"'), "database outage throws typed auth_unavailable instead of masquerading as signed out");
  assert(!session.includes("treating the request as signed out"), "database outage no longer degrades to a misleading signed-out state");
  assert(guard.includes("toSafeAuthError(error, context)"), "auth guard maps session lookup failures with route context");
  assert(guard.includes("getOptionalAuthUser"), "auth guard supports anonymous reads without hiding dependency outages");
  assert(guard.includes("requireConfiguredAuthUser"), "auth guard supports writes that require configured auth");
  assert(session.includes("getDb().delete(sessions).where(eq(sessions.tokenHash, tokenHash))"), "sign-out deletes the database session");
  assert(signoutRoute.includes("PUBLIC_LANDING_PATH"), "POST /auth/signout returns to the public welcome page");
  assert(navRail.includes("router.push(PUBLIC_LANDING_PATH)"), "client sign-out returns to the public welcome page");
  assert(homePage.includes("if (authEnabled && !user) return <LandingPage />"), "home renders the landing page for signed-out visitors");
  assert(guard.includes("requireAuthUser"), "auth guard can return the resolved user to route handlers");

  assert(!profileRoute.includes("invalidateCurrentSessionUserCache"), "profile updates do not rely on local-only cache invalidation");
  const duplicateAuthPattern = /requireAuth\(\)[\s\S]{0,240}getCurrentUser\(/;
  const offenders = walk("src/app/api").filter((path) => duplicateAuthPattern.test(read(path)));
  assert(offenders.length === 0, `API routes do not call getCurrentUser right after requireAuth: ${offenders.join(", ")}`);

  process.stdout.write("[auth-session-static.unit] ALL CHECKS PASSED\n");
}

main();
