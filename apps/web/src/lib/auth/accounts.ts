import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { identities, users } from "../db/schema";
import { AuthError } from "./errors";
import { hashPassword, verifyPassword } from "./password";
import { createSession, createSessionRecord, setCreatedSessionCookie } from "./session";
import type { AuthUser } from "./types";

const EMAIL_PASSWORD_PROVIDER = "email_password";
const ACCOUNT_EXISTS_MESSAGE = "An account with this email already exists.";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validatePassword(password: string) {
  if (password.length < 8) throw new AuthError("weak_password", "Password must be at least 8 characters.", 400);
}

export async function signUpWithEmail(input: { email: string; password: string; displayName?: string | null }): Promise<AuthUser> {
  const email = normalizeEmail(input.email);
  validatePassword(input.password);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new AuthError("invalid_email", "Enter a valid email address.", 400);
  }

  const db = getDb();
  const userId = `usr_${randomBytes(12).toString("base64url")}`;
  const now = new Date();
  const displayName = input.displayName?.trim() || email.split("@")[0];
  const passwordHash = await hashPassword(input.password);

  try {
    const session = await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: identities.id })
        .from(identities)
        .where(and(eq(identities.provider, EMAIL_PASSWORD_PROVIDER), eq(identities.providerUserId, email)))
        .limit(1);
      if (existing.length > 0) throw new AuthError("account_exists", ACCOUNT_EXISTS_MESSAGE, 400);

      await tx.insert(users).values({
        id: userId,
        displayName,
        createdAt: now,
        updatedAt: now,
      });
      await tx.insert(identities).values({
        id: `idn_${randomBytes(12).toString("base64url")}`,
        userId,
        provider: EMAIL_PASSWORD_PROVIDER,
        providerUserId: email,
        email,
        passwordHash,
        verifiedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      return createSessionRecord(userId, tx);
    });
    await setCreatedSessionCookie(session);
  } catch (error) {
    if (isEmailIdentityUniqueViolation(error)) throw new AuthError("account_exists", ACCOUNT_EXISTS_MESSAGE, 400);
    throw error;
  }

  return { id: userId, displayName, avatarUrl: null, email };
}

export async function signInWithEmail(input: { email: string; password: string }): Promise<AuthUser> {
  const email = normalizeEmail(input.email);
  const rows = await getDb()
    .select({
      identityId: identities.id,
      userId: identities.userId,
      email: identities.email,
      passwordHash: identities.passwordHash,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(identities)
    .innerJoin(users, eq(users.id, identities.userId))
    .where(and(eq(identities.provider, EMAIL_PASSWORD_PROVIDER), eq(identities.providerUserId, email)))
    .limit(1);

  const row = rows[0];
  if (!row || !(await verifyPassword(input.password, row.passwordHash))) {
    throw new AuthError("invalid_credentials", "Invalid email or password.", 401);
  }

  await createSession(row.userId);
  return { id: row.userId, displayName: row.displayName, avatarUrl: row.avatarUrl, email: row.email };
}

function isEmailIdentityUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  const message = error instanceof Error ? error.message : "";
  const detail = typeof record.detail === "string" ? record.detail : "";
  const constraint = typeof record.constraint === "string" ? record.constraint : "";
  return (
    record.code === "23505" &&
    (constraint === "identities_provider_user_uidx" ||
      message.includes("identities_provider_user_uidx") ||
      detail.includes("identities_provider_user_uidx"))
  );
}
