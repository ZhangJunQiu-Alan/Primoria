import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "../db/client";
import { identities, sessions, users } from "../db/schema";
import type { AuthUser } from "./types";

export const SESSION_COOKIE = "primoria_session";
const SESSION_DAYS = 30;
const SESSION_USER_CACHE_TTL_MS = 30_000;

const sessionUserCache = new Map<string, { expiresAt: number; user: AuthUser | null }>();

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

export async function createSession(userId: string) {
  const token = createSessionToken();
  const expires = sessionExpiryDate();
  await getDb().insert(sessions).values({
    id: `ses_${randomBytes(12).toString("base64url")}`,
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt: expires,
  });
  await setSessionCookie(token, expires);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isAuthEnabled()) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const cached = sessionUserCache.get(tokenHash);
  if (cached && cached.expiresAt > Date.now()) return cached.user;
  const now = new Date();

  const rows = await getDb()
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

  const row = rows[0];
  const user = row
    ? {
    id: row.userId,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    email: row.email,
      }
    : null;
  sessionUserCache.set(tokenHash, { expiresAt: Date.now() + SESSION_USER_CACHE_TTL_MS, user });
  return user;
}

export async function signOutCurrentSession() {
  if (!isAuthEnabled()) {
    await clearSessionCookie();
    return;
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashSessionToken(token);
    sessionUserCache.delete(tokenHash);
    await getDb().delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }
  await clearSessionCookie();
}
