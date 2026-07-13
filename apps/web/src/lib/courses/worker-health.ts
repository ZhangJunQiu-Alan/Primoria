import { writeFile } from "node:fs/promises";
import { getDb } from "../db/client";
import { workerHeartbeats } from "../db/schema";

const HEARTBEAT_FILE = "/tmp/primoria-worker-ready";
const WRITE_INTERVAL_MS = 10_000;
let lastWriteAt = 0;

export async function recordWorkerHeartbeat(workerType: string, workerId: string): Promise<void> {
  const now = Date.now();
  if (now - lastWriteAt < WRITE_INTERVAL_MS) return;
  const timestamp = new Date(now);
  await getDb()
    .insert(workerHeartbeats)
    .values({ workerType, workerId, heartbeatAt: timestamp, updatedAt: timestamp })
    .onConflictDoUpdate({
      target: workerHeartbeats.workerType,
      set: { workerId, heartbeatAt: timestamp, updatedAt: timestamp },
    });
  await writeFile(HEARTBEAT_FILE, timestamp.toISOString(), { mode: 0o600 });
  lastWriteAt = now;
}
