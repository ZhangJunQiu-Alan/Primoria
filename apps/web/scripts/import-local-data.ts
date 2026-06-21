import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "../src/lib/db/client";
import { identities } from "../src/lib/db/schema";
import { saveCourse } from "../src/lib/courses/store";
import type { Course } from "../src/lib/courses/types";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Usage: pnpm --filter @primoria/web import:local-data user@example.com");

  const identityRows = await getDb().select().from(identities).where(eq(identities.providerUserId, email)).limit(1);
  const ownerId = identityRows[0]?.userId;
  if (!ownerId) throw new Error(`No Primoria user found for ${email}. Create the account first.`);

  const root = findWorkspaceRoot();
  const coursesFile = path.join(root, ".primoria-courses.json");

  let courseCount = 0;
  if (fs.existsSync(coursesFile)) {
    const parsed = JSON.parse(fs.readFileSync(coursesFile, "utf8")) as { courses?: Course[] };
    for (const course of parsed.courses ?? []) {
      await saveCourse(course, ownerId);
      courseCount += 1;
    }
  }

  console.log(`Imported ${courseCount} courses for ${email}.`);
}

function findWorkspaceRoot() {
  let dir = process.cwd();
  while (true) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
