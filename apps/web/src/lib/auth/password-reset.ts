import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "../db/client";
import { identities, otpCodes, sessions } from "../db/schema";
import { buildPasswordResetUrl, sendPasswordResetEmail } from "../email/password-reset";
import { normalizeEmail, validatePassword } from "./accounts";
import { AuthError } from "./errors";
import { hashPassword } from "./password";

const PASSWORD_RESET_TARGET_TYPE = "password_reset";
const DEFAULT_PASSWORD_RESET_EXPIRES_MINUTES = 30;

export const PASSWORD_RESET_GENERIC_MESSAGE =
  "If an account exists for that email, password reset instructions will be sent shortly.";

export function getPasswordResetExpiresMinutes() {
  const configured = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES ?? "");
  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_PASSWORD_RESET_EXPIRES_MINUTES;
  return Math.min(Math.floor(configured), 120);
}

export async function requestPasswordReset(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const identity = await getEmailIdentity(email);
  if (!identity) return { attemptedEmail: false };

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashPasswordResetToken(token);
  const expiresMinutes = getPasswordResetExpiresMinutes();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresMinutes * 60 * 1000);

  await getDb().transaction(async (tx) => {
    await tx
      .update(otpCodes)
      .set({ consumedAt: now })
      .where(
        and(
          eq(otpCodes.targetType, PASSWORD_RESET_TARGET_TYPE),
          eq(otpCodes.target, email),
          isNull(otpCodes.consumedAt),
        ),
      );
    await tx.insert(otpCodes).values({
      id: `rst_${randomBytes(12).toString("base64url")}`,
      targetType: PASSWORD_RESET_TARGET_TYPE,
      target: email,
      codeHash: tokenHash,
      expiresAt,
      attempts: 0,
      createdAt: now,
    });
  });

  try {
    await sendPasswordResetEmail({
      email,
      expiresMinutes,
      resetUrl: buildPasswordResetUrl(token),
    });
  } catch (error) {
    await consumePasswordResetToken(tokenHash);
    throw error;
  }

  return { attemptedEmail: true };
}

export async function confirmPasswordReset(input: { token: string; password: string }) {
  validatePassword(input.password);
  const tokenHash = hashPasswordResetToken(input.token);
  const now = new Date();

  const rows = await getDb()
    .select({
      otpId: otpCodes.id,
      email: otpCodes.target,
      attempts: otpCodes.attempts,
      identityId: identities.id,
      userId: identities.userId,
    })
    .from(otpCodes)
    .innerJoin(
      identities,
      and(eq(identities.provider, "email_password"), eq(identities.providerUserId, otpCodes.target)),
    )
    .where(
      and(
        eq(otpCodes.targetType, PASSWORD_RESET_TARGET_TYPE),
        eq(otpCodes.codeHash, tokenHash),
        isNull(otpCodes.consumedAt),
        gt(otpCodes.expiresAt, now),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) throw new AuthError("invalid_reset_token", "Password reset link is invalid or expired.", 400);
  const passwordHash = await hashPassword(input.password);

  await getDb().transaction(async (tx) => {
    await tx
      .update(identities)
      .set({ passwordHash, updatedAt: now })
      .where(eq(identities.id, row.identityId));
    await tx.delete(sessions).where(eq(sessions.userId, row.userId));
    await tx.update(otpCodes).set({ consumedAt: now }).where(eq(otpCodes.id, row.otpId));
  });

  return { email: row.email };
}

function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function consumePasswordResetToken(tokenHash: string) {
  await getDb()
    .update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(otpCodes.targetType, PASSWORD_RESET_TARGET_TYPE),
        eq(otpCodes.codeHash, tokenHash),
        isNull(otpCodes.consumedAt),
      ),
    );
}

async function getEmailIdentity(email: string) {
  const rows = await getDb()
    .select({ id: identities.id })
    .from(identities)
    .where(and(eq(identities.provider, "email_password"), eq(identities.providerUserId, email)))
    .limit(1);
  return rows[0] ?? null;
}
