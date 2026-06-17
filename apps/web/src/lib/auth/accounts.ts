import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { identities, users } from "../db/schema";
import { hashPassword, verifyPassword } from "./password";
import { createSession } from "./session";
import type { AuthUser } from "./types";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validatePassword(password: string) {
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
}

export async function signUpWithEmail(input: { email: string; password: string; displayName?: string | null }): Promise<AuthUser> {
  const email = normalizeEmail(input.email);
  validatePassword(input.password);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email address.");

  const db = getDb();
  const existing = await db.select({ id: identities.id }).from(identities).where(eq(identities.providerUserId, email)).limit(1);
  if (existing.length > 0) throw new Error("An account with this email already exists.");

  const userId = `usr_${randomBytes(12).toString("base64url")}`;
  const now = new Date();
  await db.insert(users).values({
    id: userId,
    displayName: input.displayName?.trim() || email.split("@")[0],
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(identities).values({
    id: `idn_${randomBytes(12).toString("base64url")}`,
    userId,
    provider: "email_password",
    providerUserId: email,
    email,
    passwordHash: hashPassword(input.password),
    verifiedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await createSession(userId);

  return { id: userId, displayName: input.displayName?.trim() || email.split("@")[0], avatarUrl: null, email };
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
    .where(eq(identities.providerUserId, email))
    .limit(1);

  const row = rows[0];
  if (!row || !verifyPassword(input.password, row.passwordHash)) {
    throw new Error("Invalid email or password.");
  }

  await createSession(row.userId);
  return { id: row.userId, displayName: row.displayName, avatarUrl: row.avatarUrl, email: row.email };
}
