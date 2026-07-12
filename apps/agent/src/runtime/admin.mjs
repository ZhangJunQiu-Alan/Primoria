import { createRunStore } from "./run-store.mjs";

const [command = "status", argument] = process.argv.slice(2);
const store = createRunStore();

try {
  if (command === "status") {
    console.log(JSON.stringify(await store.statusSummary(), null, 2));
  } else if (command === "inspect") {
    if (!argument) throw new Error("run id is required");
    const run = await store.getRun(argument);
    if (!run) throw new Error("run not found");
    const events = await store.listEvents(argument, 0);
    console.log(JSON.stringify({ run, events }, null, 2));
  } else if (command === "cancel") {
    if (!argument) throw new Error("run id is required");
    if (!await store.cancel(argument)) throw new Error("run is not cancellable");
  } else if (command === "retry") {
    if (!argument) throw new Error("run id is required");
    const retryRunId = await store.retry(argument);
    if (!retryRunId) throw new Error("run is not retryable");
    console.log(JSON.stringify({ sourceRunId: argument, retryRunId }));
  } else if (command === "recover") {
    console.log(JSON.stringify({ recovered: await store.recoverStaleRuns() }));
  } else if (command === "prune") {
    const days = Math.max(1, Number(argument ?? process.env.AGENT_RUN_RETENTION_DAYS ?? 30));
    console.log(JSON.stringify({ deleted: await store.prune(days), retentionDays: days }));
  } else {
    throw new Error(`unknown command: ${command}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await store.close();
}
