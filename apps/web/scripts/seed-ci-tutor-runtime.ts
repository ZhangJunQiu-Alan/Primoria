import { eq } from "drizzle-orm";
import { hashPassword } from "../src/lib/auth/password";
import { closeDb, getDb } from "../src/lib/db/client";
import { authRateLimits, identities, learnerProfiles, users } from "../src/lib/db/schema";

const USER_ID = "usr_ci_tutor_runtime";
const EMAIL = "ci-tutor-runtime@example.com";
const PASSWORD = "CiTutorRuntime123!";

function requireIsolatedTestDatabase() {
  if (process.env.CI_TUTOR_RUNTIME_SMOKE !== "1") throw new Error("CI_TUTOR_RUNTIME_SMOKE=1 is required");
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
    await tx.insert(users).values({ id: USER_ID, displayName: "Tutor Runtime Test" });
    await tx.insert(identities).values({
      id: "idn_ci_tutor_runtime",
      userId: USER_ID,
      provider: "email_password",
      providerUserId: EMAIL,
      email: EMAIL,
      passwordHash,
      verifiedAt: now,
    });
    await tx.insert(learnerProfiles).values({
      ownerId: USER_ID,
      goalSkippedAt: now,
      factsIntakeStatus: "skipped",
      factsIntakeUpdatedAt: now,
      tutorStyleSkippedAt: now,
      onboardingCompletedAt: now,
    });
  });
  process.stdout.write(`[seed-ci-tutor-runtime] seeded ${EMAIL}\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(closeDb);
