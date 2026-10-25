import { closeDb, getDb } from "../../src/lib/db/client";
import { sql } from "drizzle-orm";

async function main() {
try {
  const result = await getDb().transaction(async (tx) => {
    const columns = await tx.execute(sql`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'media_assets'`);
    const counts = await tx.execute(sql`select count(*)::int as rows, coalesce(sum(byte_length), 0)::text as image_bytes from public.media_assets`);
    return { columns: columns.map((row) => row.column_name), media: counts[0] };
  }, { accessMode: "read only" });
  console.log(JSON.stringify(result, null, 2));
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Storage environment is missing");
  const response = await fetch(`${url}/storage/v1/bucket`, { headers: { apikey: key }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Storage read returned ${response.status}`);
  const buckets = await response.json();
  console.log(JSON.stringify({ buckets: buckets.map((bucket: { id: string; public: boolean }) => ({ id: bucket.id, public: bucket.public })) }));
} catch (error) {
  console.error(`Preflight error code: ${(error as { code?: string }).code ?? "unavailable"}`);
  console.error("Preflight failed; no cloud state was changed. Inspect connection/configuration without printing credentials.");
  process.exitCode = 1;
} finally {
  await closeDb();
}
}

void main();
