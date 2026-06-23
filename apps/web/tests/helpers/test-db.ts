import { loadLocalEnv } from "../../scripts/load-local-env";
import { closeDb } from "../../src/lib/db/client";

// Isolated test-database harness. Tests run against TEST_DATABASE_URL — a
// SEPARATE database from the app's DATABASE_URL — so they never touch dev/prod
// data. When TEST_DATABASE_URL is unset, db-backed tests skip with a clear note
// (CI/dev opt in explicitly). The app's db client reads process.env.DATABASE_URL
// lazily inside getDb(), so pointing it at the test URL here (before any getDb()
// call) is sufficient.

loadLocalEnv();

// SAFETY: capture the app DB url BEFORE any override, so we can refuse to run
// destructive tests against it. A prior misconfiguration truncated the live DB;
// these guards make that impossible.
const APP_DATABASE_URL = process.env.DATABASE_URL;
const testUrl = process.env.TEST_DATABASE_URL;

function testDbName(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

// A usable test DB must (1) exist, (2) differ from the app DB, and (3) have a
// database name that clearly marks it as a test database.
export const TEST_DB_AVAILABLE = Boolean(
  testUrl && testUrl !== APP_DATABASE_URL && /test/i.test(testDbName(testUrl)),
);

if (TEST_DB_AVAILABLE) {
  process.env.DATABASE_URL = testUrl as string;
}

export function skipWithoutTestDb(name: string): boolean {
  if (TEST_DB_AVAILABLE) return false;
  if (testUrl && !/test/i.test(testDbName(testUrl))) {
    process.stdout.write(`[${name}] SKIPPED — TEST_DATABASE_URL database name must contain "test" (got "${testDbName(testUrl)}"); refusing to run destructive tests against a non-test database\n`);
  } else if (testUrl && testUrl === APP_DATABASE_URL) {
    process.stdout.write(`[${name}] SKIPPED — TEST_DATABASE_URL must differ from DATABASE_URL; refusing to truncate the app database\n`);
  } else {
    process.stdout.write(`[${name}] SKIPPED — set TEST_DATABASE_URL to an isolated test database (name must contain "test") to run db tests\n`);
  }
  return true;
}

type Sql = Awaited<ReturnType<typeof openTestSql>>;

async function openTestSql() {
  const { default: postgres } = await import("postgres");
  return postgres(testUrl as string, { prepare: false, onnotice: () => {} });
}

// Migrate the test DB once, then return a raw client for fixtures + assertions.
export async function setupTestDb(): Promise<Sql> {
  const { runMigrations } = await import("../../src/lib/db/migrate");
  await runMigrations();
  return openTestSql();
}

export async function teardownTestDb(sql: Sql): Promise<void> {
  await Promise.all([
    sql.end({ timeout: 5 }),
    closeDb(),
  ]);
}

// Truncate everything the lesson-generation tests touch. users CASCADE removes
// courses/lessons/jobs/checkpoints/learning_events via FKs.
// Defense-in-depth: refuse to truncate unless the live connection's database name
// clearly marks it as a test database.
export async function resetTestDb(sql: Sql): Promise<void> {
  const [{ current_database: dbName }] = await sql`select current_database()`;
  if (!/test/i.test(String(dbName))) {
    throw new Error(`refusing to truncate non-test database "${dbName}"`);
  }
  await sql`truncate table users cascade`;
}

export async function seedUser(sql: Sql, id: string): Promise<void> {
  await sql`insert into users (id, created_at, updated_at) values (${id}, now(), now())
            on conflict (id) do nothing`;
}

export async function seedCourse(sql: Sql, opts: { id: string; ownerId: string; graphId?: string | null }): Promise<void> {
  await sql`insert into courses (id, owner_id, title, topic, summary, estimated_minutes, graph_id, version, created_at, updated_at)
            values (${opts.id}, ${opts.ownerId}, 'T', 'topic', 'sum', 0, ${opts.graphId ?? null}, 1, now(), now())`;
}

export async function seedLesson(
  sql: Sql,
  opts: { id: string; courseId: string; ownerId: string; status?: string; topicId?: string },
): Promise<void> {
  await sql`insert into lessons (id, course_id, owner_id, topic_id, title, role, progress, status, sort_key, version, created_at, updated_at)
            values (${opts.id}, ${opts.courseId}, ${opts.ownerId}, ${opts.topicId ?? "t1"}, 'L', 'new', 'not_started', ${opts.status ?? "planned"}, 1, 1, now(), now())`;
}

let failures = 0;
export function ok(condition: unknown, message: string): void {
  if (!condition) {
    failures += 1;
    process.stderr.write(`  ✗ ${message}\n`);
  } else {
    process.stdout.write(`  ✓ ${message}\n`);
  }
}

export function finish(name: string): void {
  if (failures > 0) {
    process.stderr.write(`[${name}] ${failures} FAILED\n`);
    process.exit(1);
  }
  process.stdout.write(`[${name}] ALL CHECKS PASSED\n`);
}
