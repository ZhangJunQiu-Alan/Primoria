import { eq } from "drizzle-orm";
import { hashPassword } from "../src/lib/auth/password";
import { saveCourse } from "../src/lib/courses/store";
import type { Course } from "../src/lib/courses/types";
import { closeDb, getDb } from "../src/lib/db/client";
import { authRateLimits, identities, users } from "../src/lib/db/schema";

const USER_ID = "usr_ci_learning_smoke";
const COURSE_ID = "crs_ci_learning_smoke";
const EMAIL = "ci-learning-smoke@example.com";
const PASSWORD = "CiLearningSmoke123!";

function requireIsolatedTestDatabase() {
  if (process.env.CI_LEARNING_SMOKE !== "1") {
    throw new Error("CI_LEARNING_SMOKE=1 is required");
  }
  const databaseUrl = process.env.DATABASE_URL;
  const databaseName = databaseUrl ? new URL(databaseUrl).pathname.replace(/^\//, "") : "";
  if (!/test/i.test(databaseName)) {
    throw new Error(`refusing to seed non-test database \"${databaseName || "unknown"}\"`);
  }
}

async function main() {
  requireIsolatedTestDatabase();
  const now = Date.now();
  const db = getDb();
  const passwordHash = await hashPassword(PASSWORD);

  await db.transaction(async (tx) => {
    await tx.delete(authRateLimits);
    await tx.delete(users).where(eq(users.id, USER_ID));
    await tx.insert(users).values({ id: USER_ID, displayName: "CI Learner" });
    await tx.insert(identities).values({
      id: "idn_ci_learning_smoke",
      userId: USER_ID,
      provider: "email_password",
      providerUserId: EMAIL,
      email: EMAIL,
      passwordHash,
      verifiedAt: new Date(),
    });
  });

  const course: Course = {
    id: COURSE_ID,
    title: "CI Learning Path",
    topic: "Reliable learning workflows",
    summary: "A deterministic course used to verify authentication, reading, assessment, and persistence.",
    estimatedMinutes: 5,
    anchorConceptId: null,
    graphId: null,
    language: "en",
    archivedAt: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    lessons: [{
      id: "lsn_ci_learning_smoke",
      title: "Complete the learning loop",
      description: "Read and answer one deterministic assessment.",
      role: "new",
      progress: "not_started",
      status: "generated",
      sortKey: 1,
      topicId: null,
      triggeredFrom: null,
      estimatedMinutes: 5,
      version: 1,
      createdAt: now,
      updatedAt: now,
      blocks: [{
        id: "blk_ci_learning_smoke_quiz",
        type: "quiz",
        title: "Completion check",
        questions: [{
          kind: "single",
          id: "q_ci_learning_smoke",
          question: "Which result proves the learning loop persisted?",
          choices: [
            { id: "persisted", text: "The attempt and lesson progress are stored" },
            { id: "rendered", text: "Only the page rendered" }
          ],
          correctId: "persisted",
          explanation: "The server must grade and persist the attempt before the loop is complete."
        }]
      }]
    }]
  };

  await saveCourse(course, USER_ID);
  console.log(`Seeded ${EMAIL} and ${COURSE_ID}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(closeDb);
