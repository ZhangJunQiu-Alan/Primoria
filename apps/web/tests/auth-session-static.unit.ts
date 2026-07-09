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
  assert(session.includes("LOCAL_DATABASE_UNAVAILABLE_CODES"), "getCurrentUser recognizes local database tunnel/connectivity failures");
  assert(session.includes('process.env.NODE_ENV === "production"'), "session lookup still fails closed in production");
  assert(session.includes("treating the request as signed out"), "local database outage degrades to signed-out state instead of a dev overlay");
  assert(session.includes("getDb().delete(sessions).where(eq(sessions.tokenHash, tokenHash))"), "sign-out deletes the database session");
  assert(signoutRoute.includes('NextResponse.redirect(new URL("/", request.url), { status: 303 })'), "POST /auth/signout returns to the signed-out landing page");
  assert(navRail.includes('router.push("/")'), "client sign-out returns to the signed-out landing page");
  assert(homePage.includes("if (authEnabled && !user) return <LandingPage />;"), "home renders the landing page when signed out");
  assert(guard.includes("requireAuthUser"), "auth guard can return the resolved user to route handlers");

  assert(!profileRoute.includes("invalidateCurrentSessionUserCache"), "profile updates do not rely on local-only cache invalidation");
  const duplicateAuthPattern = /requireAuth\(\)[\s\S]{0,240}getCurrentUser\(/;
  const offenders = walk("src/app/api").filter((path) => duplicateAuthPattern.test(read(path)));
  assert(offenders.length === 0, `API routes do not call getCurrentUser right after requireAuth: ${offenders.join(", ")}`);

  process.stdout.write("[auth-session-static.unit] ALL CHECKS PASSED\n");
}

main();
