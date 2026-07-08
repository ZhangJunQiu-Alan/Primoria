#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

async function main() {
  const requestRoute = read("src/app/api/auth/password-reset/request/route.ts");
  const confirmRoute = read("src/app/api/auth/password-reset/confirm/route.ts");
  const resetStore = read("src/lib/auth/password-reset.ts");
  const emailStore = read("src/lib/email/password-reset.ts");
  const tencentSes = read("src/lib/email/tencent-ses.ts");
  const schema = read("src/lib/db/schema.ts");

  assert(schema.includes('export const otpCodes = pgTable('), "password reset reuses otp_codes table");
  assert(requestRoute.includes("PASSWORD_RESET_GENERIC_MESSAGE"), "request endpoint returns generic message");
  assert(requestRoute.includes('scope: "password-reset-request"'), "request endpoint uses isolated rate-limit scope");
  assert(confirmRoute.includes('scope: "password-reset-confirm"'), "confirm endpoint uses isolated rate-limit scope");
  assert(resetStore.includes("hashPasswordResetToken"), "password reset stores hashed reset tokens");
  assert(resetStore.includes("randomBytes(32)"), "password reset token has high entropy");
  assert(resetStore.includes("codeHash: tokenHash"), "only token hash is persisted");
  assert(resetStore.includes(".delete(sessions)"), "password reset invalidates existing sessions");
  assert(resetStore.includes("PASSWORD_RESET_GENERIC_MESSAGE"), "generic message lives with reset logic");
  assert(emailStore.includes("buildPasswordResetUrl"), "password reset email builds a reset URL");
  assert(emailStore.includes("resetUrl") && emailStore.includes("reset_url"), "email template supports camel and snake case reset URL variables");
  assert(tencentSes.includes("TC3-HMAC-SHA256"), "Tencent SES client signs requests with TC3");
  assert(tencentSes.includes("TemplateID"), "Tencent SES client sends approved templates");
  assert(!requestRoute.includes("account exists"), "request route does not reveal account existence");

  process.stdout.write("[auth-password-reset-static.unit] ALL CHECKS PASSED\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
