# Implementation Plan - Option A: Database Schema Localization & Pre-compiled Translations

This plan details how to implement Chinese translation support for learning entrypoints by extending the database schema with localized columns (`name_zh`), updating the seeding/generation scripts, and mapping the translations during vector search and curriculum planning.

This approach has **zero runtime disk I/O or parsing overhead** because all translations are statically pre-compiled during build/seeding time.

---

## User Review Required

> [!IMPORTANT]
> **Idempotent Database Migration:**
> We will add the `name_zh` columns to `public.knowledge_graph_topics` and `public.knowledge_graph_concepts` using a lightweight migration script. This script is safe to run against both your local database and the remote Singapore Supabase DB instance. It will not destroy or affect existing user accounts or active course data.

---

## Proposed Changes

### 1. Database Schema Migration

#### [NEW] [migrate-kg-zh.mjs](file:///Users/zhangjunqiu/Desktop/primoria/apps/web/scripts/migrate-kg-zh.mjs)
Create an idempotent script to add localized name columns to the knowledge graph tables:
```javascript
import { createPgClient } from "./kg-db-common.mjs";

async function main() {
  const client = createPgClient();
  await client.connect();
  try {
    console.log("Adding name_zh to public.knowledge_graph_topics...");
    await client.query("alter table public.knowledge_graph_topics add column if not exists name_zh text;");
    console.log("Adding name_zh to public.knowledge_graph_concepts...");
    await client.query("alter table public.knowledge_graph_concepts add column if not exists name_zh text;");
    console.log("Migration completed successfully!");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
```

---

### 2. Seeding & Generation Script Updates

#### [MODIFY] [seed-kg.mjs](file:///Users/zhangjunqiu/Desktop/primoria/apps/web/scripts/seed-kg.mjs)
Modify the seed script to read [kg_zh_labels.json](file:///Users/zhangjunqiu/Desktop/primoria/temple/kg_zh_labels.json) and insert these labels into the `name_zh` columns:
1. Load Chinese labels:
   ```javascript
   import { resolve } from "node:path";
   import { existsSync } from "node:fs";

   function loadZhLabels() {
     const path = resolve(REPO_ROOT, "temple/kg_zh_labels.json");
     if (!existsSync(path)) return {};
     return readJson(path).labels ?? {};
   }
   ```
2. Insert `name_zh` for topics:
   ```sql
   insert into public.knowledge_graph_topics
     (graph_id, topic_id, name, name_zh, default_order, created_at, updated_at)
   values ($1, $2, $3, $4, $5, now(), now())
   on conflict (graph_id, topic_id) do update set
     name = excluded.name,
     name_zh = excluded.name_zh,
     default_order = excluded.default_order,
     updated_at = now()
   ```
3. Insert `name_zh` for concepts:
   ```sql
   insert into public.knowledge_graph_concepts
     (graph_id, concept_id, topic_id, name, name_zh, description, default_order, created_at, updated_at)
   values ($1, $2, $3, $4, $5, $6, $7, now(), now())
   on conflict (graph_id, concept_id) do update set
     topic_id = excluded.topic_id,
     name = excluded.name,
     name_zh = excluded.name_zh,
     description = excluded.description,
     default_order = excluded.default_order,
     updated_at = now()
   ```

#### [MODIFY] [build-topic-graph.mjs](file:///Users/zhangjunqiu/Desktop/primoria/apps/web/scripts/build-topic-graph.mjs)
Modify the static topic graph generator to embed `nameZh` directly into the generated static JSON graphs:
1. Load Chinese labels:
   ```javascript
   import { resolve } from "node:path";
   import { existsSync } from "node:fs";
   // Read zh labels using REPO_ROOT
   ```
2. Add `nameZh` property to generated topic nodes and concept entries.

---

### 3. Application Logic Updates

#### [MODIFY] [search.ts](file:///Users/zhangjunqiu/Desktop/primoria/apps/web/src/lib/knowledge-graph/search.ts)
Update the SQL search query to retrieve the new `name_zh` / `topic_name_zh` columns and expose `nameZh` in the search results mapping.

#### [MODIFY] [topic-graph.ts](file:///Users/zhangjunqiu/Desktop/primoria/apps/web/src/lib/knowledge-graph/topic-graph.ts)
Update typescript types (`TopicConcept`, `TopicNode`) to include `nameZh?: string | null`.

#### [MODIFY] [positioning.ts](file:///Users/zhangjunqiu/Desktop/primoria/apps/web/src/lib/knowledge-graph/positioning.ts)
Map the `menu` items using the Chinese name if available:
```typescript
name: t.nameZh || t.name
```

#### [MODIFY] [position-learning-goal.ts](file:///Users/zhangjunqiu/Desktop/primoria/apps/web/src/lib/knowledge-graph/position-learning-goal.ts)
Update `planFromPositioning` to translate `startTopic.name` and `nextTopic.name` in specific branch results:
```typescript
name: start.nameZh || start.name
```

---

## Action Checklist & Execution Plan

We will execute the following steps in sequence:
1. `[ ]` Create and run the schema migration: `node apps/web/scripts/migrate-kg-zh.mjs`
2. `[ ]` Update `seed-kg.mjs` with the Chinese translation column writing logic.
3. `[ ]` Re-run seeding to populate the Chinese columns: `node apps/web/scripts/seed-kg.mjs all`
4. `[ ]` Update `build-topic-graph.mjs` and regenerate the static graphs: `node apps/web/scripts/build-topic-graph.mjs all`
5. `[ ]` Update `search.ts`, `topic-graph.ts`, `positioning.ts`, and `position-learning-goal.ts` to read and leverage the Chinese names.
6. `[ ]` Run test cases using `pnpm test:kg` and verify that user positioning responses are correctly localized.
