import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "../db/client";
import { identities, sessions, users } from "../db/schema";
import { SESSION_COOKIE } from "./constants";
import type { AuthUser } from "./types";

const SESSION_DAYS = 30;
const LOCAL_DATABASE_UNAVAILABLE_CODES = ["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "ECONNRESET", "EHOSTUNREACH"];

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

function errorText(error: unknown): string {
  if (!error) return "";
  if (error instanceof Error) {
    const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
    const cause = "cause" in error ? errorText((error as { cause?: unknown }).cause) : "";
    return `${error.name} ${code} ${error.message} ${cause}`;
  }
  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    return `${String(record.code ?? "")} ${String(record.message ?? "")} ${errorText(record.cause)}`;
  }
  return String(error);
}

function shouldTreatSessionLookupAsSignedOut(error: unknown) {
  if (process.env.NODE_ENV === "production") return false;
  const text = errorText(error);
  return LOCAL_DATABASE_UNAVAILABLE_CODES.some((code) => text.includes(code));
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
    if (shouldTreatSessionLookupAsSignedOut(error)) {
      console.warn("[auth] Session lookup could not reach the local database; treating the request as signed out.");
      return null;
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

export async function signOutCurrentSession() {
  if (!isAuthEnabled()) {
    await clearSessionCookie();
    return;
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashSessionToken(token);
    await getDb().delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }
  await clearSessionCookie();
}
