import { cookies } from "next/headers";
import { cache } from "react";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { getDb, hasDatabaseUrl, type DbOrTx } from "../db/client";
import { identities, sessions, users } from "../db/schema";
import { SESSION_COOKIE } from "./constants";
import { AuthError, isAuthUnavailableError } from "./errors";
import type { AuthUser } from "./types";

const SESSION_DAYS = 30;

export function isAuthEnabled() {
  return hasDatabaseUrl();
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function sessionExpiryDate() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export type CreatedSession = {
  token: string;
  expires: Date;
};

export async function setSessionCookie(token: string, expires: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function createSessionRecord(userId: string, db: DbOrTx = getDb()): Promise<CreatedSession> {
  const token = createSessionToken();
  const expires = sessionExpiryDate();
  await db.insert(sessions).values({
    id: `ses_${randomBytes(12).toString("base64url")}`,
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt: expires,
  });
  return { token, expires };
}

export async function setCreatedSessionCookie(session: CreatedSession) {
  await setSessionCookie(session.token, session.expires);
}

export async function createSession(userId: string) {
  const session = await createSessionRecord(userId);
  await setCreatedSessionCookie(session);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isAuthEnabled()) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const now = new Date();

  let rows: Array<{ userId: string; displayName: string | null; avatarUrl: string | null; email: string | null }>;
  try {
    rows = await getDb()
      .select({
        userId: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        email: identities.email,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .leftJoin(identities, and(eq(identities.userId, users.id), eq(identities.provider, "email_password")))
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
      .limit(1);
  } catch (error) {
    // A database outage must not masquerade as "signed out": that turns a
    // service problem into a misleading 401/login redirect for a user who
    // holds a valid session cookie. Throw typed so callers map it to 503.
    if (isAuthUnavailableError(error)) {
      throw new AuthError("auth_unavailable", "Authentication is temporarily unavailable.", 503, error);
    }
    throw error;
  }

  const row = rows[0];
  return row
    ? {
        id: row.userId,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        email: row.email,
      }
    : null;
}

export const getCurrentUserForRsc = cache(getCurrentUser);

export async function signOutCurrentSession() {
  if (!isAuthEnabled()) {
    await clearSessionCookie();
    return;
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashSessionToken(token);
    try {
      await getDb().delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    } catch (error) {
      // Still clear the cookie so the browser signs out; the orphaned session
      // row expires on its own. Anything else is a real failure.
      if (!isAuthUnavailableError(error)) throw error;
      console.error("[auth] sign-out could not reach the database; clearing the cookie only", error);
    }
  }
  await clearSessionCookie();
}
