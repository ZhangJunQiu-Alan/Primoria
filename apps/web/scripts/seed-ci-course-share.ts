import { inArray } from "drizzle-orm";
import { hashPassword } from "../src/lib/auth/password";
import { saveCourse } from "../src/lib/courses/store";
import type { Course } from "../src/lib/courses/types";
import { closeDb, getDb } from "../src/lib/db/client";
import { identities, users } from "../src/lib/db/schema";

const OWNER_ID = "usr_ci_share_owner";
const RECEIVER_ID = "usr_ci_share_receiver";
const COURSE_ID = "crs_ci_share_smoke";
const PASSWORD = "CiShareSmoke123!";

function requireIsolatedTestDatabase() {
  if (process.env.CI_SHARE_SMOKE !== "1") throw new Error("CI_SHARE_SMOKE=1 is required");
  const databaseName = process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).pathname.replace(/^\//, "")
    : "";
  if (!/test/i.test(databaseName)) throw new Error(`refusing to seed non-test database "${databaseName || "unknown"}"`);
}

async function main() {
  requireIsolatedTestDatabase();
  const db = getDb();
  const passwordHash = await hashPassword(PASSWORD);
  const now = Date.now();

  await db.transaction(async (tx) => {
    await tx.delete(users).where(inArray(users.id, [OWNER_ID, RECEIVER_ID]));
    await tx.insert(users).values([
      { id: OWNER_ID, displayName: "CI Share Owner" },
      { id: RECEIVER_ID, displayName: "CI Share Receiver" },
    ]);
    await tx.insert(identities).values([
      {
        id: "idn_ci_share_owner",
        userId: OWNER_ID,
        provider: "email_password",
        providerUserId: "ci-share-owner@example.com",
        email: "ci-share-owner@example.com",
        passwordHash,
        verifiedAt: new Date(),
      },
      {
        id: "idn_ci_share_receiver",
        userId: RECEIVER_ID,
        provider: "email_password",
        providerUserId: "ci-share-receiver@example.com",
        email: "ci-share-receiver@example.com",
        passwordHash,
        verifiedAt: new Date(),
      },
    ]);
  });

  const course: Course = {
    id: COURSE_ID,
    title: "Immutable Share Regression Course",
    topic: "Immutable share regression",
    summary: "A sanitized snapshot used by the anonymous preview and import smoke test.",
    estimatedMinutes: 4,
    anchorConceptId: null,
    graphId: null,
    language: "en",
    archivedAt: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    lessons: [
      {
        id: "lsn_ci_share_smoke",
        title: "Read the immutable snapshot",
        description: "Confirm that a public preview renders stored course content.",
        role: "new",
        progress: "not_started",
        status: "generated",
        sortKey: 1,
        topicId: null,
        conceptIds: [],
        triggeredFrom: null,
        estimatedMinutes: 4,
        version: 1,
        createdAt: now,
        updatedAt: now,
        blocks: [
          {
            id: "blk_ci_share_smoke",
            type: "text",
            title: "Stored snapshot content",
            markdown: "This content must be visible without reading the owner's live course.",
          },
        ],
      },
    ],
  };

  await saveCourse(course, OWNER_ID);
  console.log("[seed-ci-course-share] seeded owner, receiver, and course");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(closeDb);
