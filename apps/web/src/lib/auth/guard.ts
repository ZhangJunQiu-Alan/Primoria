import { NextResponse } from "next/server";

import { AUTH_UNAVAILABLE_ERROR, toSafeAuthError } from "@/lib/auth/errors";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import type { AuthUser } from "@/lib/auth/types";

// Returns a 401/503 response when the request must be denied, otherwise null.
// Local development can run without DATABASE_URL; production must fail closed.
// Usage:
//   const denied = await requireAuth();
//   if (denied) return denied;
export async function requireAuth(): Promise<NextResponse | null> {
  const { denied } = await requireAuthUser();
  return denied;
}

type AuthGuardResult = { denied: NextResponse | null; user: AuthUser | null };

async function resolveAuthUser(context: string): Promise<AuthGuardResult> {
  try {
    return { denied: null, user: await getCurrentUser() };
  } catch (error) {
    const safe = toSafeAuthError(error, context);
    return { denied: NextResponse.json(safe.body, { status: safe.status }), user: null };
  }
}

export async function requireAuthUser(context = "session"): Promise<AuthGuardResult> {
  if (!isAuthEnabled()) {
    if (process.env.NODE_ENV !== "production") return { denied: null, user: null };
    return {
      denied: NextResponse.json({ error: "Auth is not configured" }, { status: 503 }),
      user: null,
    };
  }
  const { denied, user } = await resolveAuthUser(context);
  if (denied) return { denied, user: null };
  if (!user) {
    return {
      denied: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
    };
  }
  return { denied: null, user };
}

// API writes that require a persisted identity must not use the local
// development fail-open behavior of requireAuthUser().
export async function requireConfiguredAuthUser(context: string): Promise<AuthGuardResult> {
  if (!isAuthEnabled()) {
    return {
      denied: NextResponse.json(AUTH_UNAVAILABLE_ERROR.body, { status: AUTH_UNAVAILABLE_ERROR.status }),
      user: null,
    };
  }
  return requireAuthUser(context);
}

// Optional reads retain their anonymous result when no valid session exists.
// A request that carries a session while the auth dependency is down receives
// the same safe 503 contract as required-auth routes.
export async function getOptionalAuthUser(context: string): Promise<AuthGuardResult> {
  if (!isAuthEnabled()) return { denied: null, user: null };
  return resolveAuthUser(context);
}
