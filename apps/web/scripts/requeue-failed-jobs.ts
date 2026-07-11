import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

// Operational recovery entry point: puts failed jobs back into the queue so
// the workers pick them up again, without hand-written SQL.
//
// Usage:
//   pnpm --filter @primoria/web jobs:requeue-failed                     # all queues
//   pnpm --filter @primoria/web jobs:requeue-failed lesson-generation   # one queue
//   pnpm --filter @primoria/web jobs:requeue-failed extractor <jobId>   # one job

const QUEUES: Record<string, { table: string; hasStage: boolean }> = {
  "lesson-generation": { table: "lesson_generation_jobs", hasStage: true },
  "learning-progress": { table: "learning_progress_jobs", hasStage: true },
  extractor: { table: "extractor_jobs", hasStage: false },
};

async function main() {
  const [queueArg, jobId] = process.argv.slice(2);
  if (queueArg && !QUEUES[queueArg]) {
    console.error(`Unknown queue "${queueArg}". Expected one of: ${Object.keys(QUEUES).join(", ")}`);
    process.exit(1);
  }
  if (jobId && !queueArg) {
    console.error("A job id requires a queue name.");
    process.exit(1);
  }

  const { getDb, closeDb } = await import("../src/lib/db/client");
  const { sql } = await import("drizzle-orm");
  const db = getDb();

  const selected = queueArg ? [[queueArg, QUEUES[queueArg]] as const] : Object.entries(QUEUES);
  for (const [name, { table, hasStage }] of selected) {
    const rows = await db.execute(sql`
      update ${sql.raw(`public.${table}`)}
      set status = 'queued',
          ${hasStage ? sql.raw("stage = 'queued',") : sql.raw("")}
          attempts = 0,
          last_error = null,
          error_category = null,
          lease_owner = null,
          lease_token = null,
          lease_expires_at = null,
          heartbeat_at = null,
          started_at = null,
          completed_at = null,
          updated_at = now()
      where status = 'failed'${jobId ? sql` and id = ${jobId}` : sql.raw("")}
      returning id
    `);
    console.log(`${name}: requeued ${rows.length} failed job(s)${rows.length ? ` — ${rows.map((r) => r.id).join(", ")}` : ""}`);
  }
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
