import postgres from "postgres";
import { readFileSync } from "node:fs";
const env = (() => { try { return readFileSync(".env.local","utf8").match(/DATABASE_URL="([^"]+)"/)?.[1]; } catch {} })()
  || readFileSync(".env","utf8").match(/DATABASE_URL="([^"]+)"/)?.[1];
const sql = postgres(env, { prepare: false });
const rows = await sql`select coalesce(language,'(null)') as lang, count(*)::int as n from courses group by 1 order by 2 desc`;
console.log("courses by language:", rows);
const sample = await sql`select title, topic, coalesce(language,'(null)') as lang from courses order by created_at desc limit 25`;
console.table(sample);
await sql.end();
