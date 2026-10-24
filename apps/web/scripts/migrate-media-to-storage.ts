// One-time move of legacy in-row image bytes (media_assets.data_base64) into the
// private Supabase Storage bucket. Dry run by default; --apply writes. Idempotent:
// rows that already have storage_path are skipped, and each row's bytes are
// uploaded and read back before its in-row copy is cleared.
//   pnpm media:migrate-storage            # dry run
//   pnpm media:migrate-storage -- --apply # writes Storage + Postgres
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadLocalEnv } from "./load-local-env";
import { closeDb, getDb } from "../src/lib/db/client";
import { mediaAssets } from "../src/lib/db/schema";
import { ensureMediaBucket, getMediaObjectStore, mediaObjectPath } from "../src/lib/ai/media/media-storage";

loadLocalEnv();

export async function migrateMediaToStorage(apply = false) {
  const objects = getMediaObjectStore();
  if (!objects) throw new Error("Supabase Storage is not configured: set SUPABASE_URL and SUPABASE_SECRET_KEY.");

  if (apply) process.stdout.write(`bucket: ${await ensureMediaBucket()}\n`);
  const db = getDb();
  const rows = await db
    .select({ id: mediaAssets.id, mimeType: mediaAssets.mimeType, dataBase64: mediaAssets.dataBase64 })
    .from(mediaAssets)
    .where(and(isNull(mediaAssets.storagePath), isNotNull(mediaAssets.dataBase64)));

  let moved = 0;
  let bytesMoved = 0;
  for (const row of rows) {
    const path = mediaObjectPath(row.id, row.mimeType);
    const bytes = new Uint8Array(Buffer.from(row.dataBase64!, "base64"));
    if (!apply) {
      process.stdout.write(`would move ${row.id} (${bytes.byteLength} bytes) -> ${path}\n`);
      continue;
    }
    await objects.put(path, bytes, row.mimeType);
    const stored = await objects.get(path);
    if (stored.byteLength !== bytes.byteLength) {
      throw new Error(`read-back size mismatch for ${row.id}: ${stored.byteLength} != ${bytes.byteLength}`);
    }
    if (!Buffer.from(stored).equals(bytes)) {
      throw new Error(`read-back bytes mismatch for ${row.id}`);
    }
    await db
      .update(mediaAssets)
      .set({ storagePath: path, dataBase64: null, updatedAt: new Date() })
      .where(and(eq(mediaAssets.id, row.id), isNull(mediaAssets.storagePath)));
    moved += 1;
    bytesMoved += bytes.byteLength;
    process.stdout.write(`moved ${row.id} -> ${path}\n`);
  }
  process.stdout.write(
    apply
      ? `done: moved ${moved} of ${rows.length} rows (${(bytesMoved / 1048576).toFixed(1)} MB). Run VACUUM (FULL) media_assets in the SQL editor to return the freed space.\n`
      : `dry run: ${rows.length} rows would move. Re-run with --apply to write.\n`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) migrateMediaToStorage(process.argv.includes("--apply"))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
