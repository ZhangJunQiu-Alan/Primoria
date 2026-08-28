import { eq } from "drizzle-orm";
import { hashPassword } from "../src/lib/auth/password";
import { closeDb, getDb } from "../src/lib/db/client";
import { authRateLimits, identities, users } from "../src/lib/db/schema";

const USER_ID = "usr_ci_onboarding";
const EMAIL = "ci-onboarding@example.com";
const PASSWORD = "CiOnboarding123!";

function requireIsolatedTestDatabase() {
  if (process.env.CI_ONBOARDING_SMOKE !== "1") throw new Error("CI_ONBOARDING_SMOKE=1 is required");
  const databaseUrl = process.env.DATABASE_URL;
  const databaseName = databaseUrl ? new URL(databaseUrl).pathname.replace(/^\//, "") : "";
  if (!/test/i.test(databaseName)) throw new Error(`refusing to seed non-test database "${databaseName || "unknown"}"`);
}

async function main() {
  requireIsolatedTestDatabase();
  const db = getDb();
  const now = new Date();
  const passwordHash = await hashPassword(PASSWORD);

  await db.transaction(async (tx) => {
    await tx.delete(authRateLimits);
    await tx.delete(users).where(eq(users.id, USER_ID));
    await tx.insert(users).values({ id: USER_ID, displayName: "Onboarding Regression" });
    await tx.insert(identities).values({
      id: "idn_ci_onboarding",
      userId: USER_ID,
      provider: "email_password",
      providerUserId: EMAIL,
      email: EMAIL,
      passwordHash,
      verifiedAt: now,
    });
  });

  process.stdout.write(`[seed-ci-onboarding] seeded ${EMAIL}\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(closeDb);
