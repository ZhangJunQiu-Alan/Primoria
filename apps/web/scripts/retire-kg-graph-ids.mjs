#!/usr/bin/env node

import { createPgClient, withTransaction } from "./kg-db-common.mjs";

const RETIRED_GRAPH_IDS = new Map([["Python", "sicp_cs61a"]]);

async function retireGraphId(client, oldGraphId, newGraphId) {
  const oldGraph = await client.query("select exists(select 1 from knowledge_graphs where id = $1) as found", [oldGraphId]);
  if (!oldGraph.rows[0]?.found) {
    process.stdout.write(`[db:retire:kg] ${oldGraphId}: already retired\n`);
    return;
  }

  const newGraph = await client.query("select exists(select 1 from knowledge_graphs where id = $1) as found", [newGraphId]);
  if (!newGraph.rows[0]?.found) {
    throw new Error(`Cannot retire ${oldGraphId}: replacement graph ${newGraphId} is not seeded`);
  }

  const counts = await withTransaction(client, async () => {
    // Preserve both courses if a user already has an active course under each ID.
    await client.query(
      `update courses old_course
       set archived_at = coalesce(old_course.archived_at, now()), updated_at = now()
       where old_course.graph_id = $1
         and old_course.archived_at is null
         and exists (
           select 1 from courses replacement
           where replacement.owner_id = old_course.owner_id
             and replacement.graph_id = $2
             and replacement.archived_at is null
         )`,
      [oldGraphId, newGraphId],
    );

    const courseRows = await client.query("update courses set graph_id = $2 where graph_id = $1", [oldGraphId, newGraphId]);
    const profileRows = await client.query(
      "update learner_profiles set goal_graph_id = $2 where goal_graph_id = $1",
      [oldGraphId, newGraphId],
    );
    const eventRows = await client.query("update learning_events set graph_id = $2 where graph_id = $1", [oldGraphId, newGraphId]);
    const progressRows = await client.query(
      "update learning_progress_jobs set graph_id = $2 where graph_id = $1",
      [oldGraphId, newGraphId],
    );
    const extractorRows = await client.query("update extractor_jobs set graph_id = $2 where graph_id = $1", [oldGraphId, newGraphId]);

    await client.query(
      `insert into user_concept_mastery (owner_id, graph_id, concept_id, status, score, updated_at)
       select owner_id, $2, concept_id, status, score, updated_at
       from user_concept_mastery
       where graph_id = $1
       on conflict (owner_id, graph_id, concept_id) do update set
         status = case
           when excluded.updated_at > user_concept_mastery.updated_at then excluded.status
           else user_concept_mastery.status
         end,
         score = case
           when excluded.updated_at > user_concept_mastery.updated_at then excluded.score
           else user_concept_mastery.score
         end,
         updated_at = greatest(excluded.updated_at, user_concept_mastery.updated_at)`,
      [oldGraphId, newGraphId],
    );
    const masteryRows = await client.query("delete from user_concept_mastery where graph_id = $1", [oldGraphId]);

    // Cascades remove the retired graph's nodes, edges, and embeddings.
    await client.query("delete from knowledge_graphs where id = $1", [oldGraphId]);

    return {
      courses: courseRows.rowCount ?? 0,
      profiles: profileRows.rowCount ?? 0,
      events: eventRows.rowCount ?? 0,
      progressJobs: progressRows.rowCount ?? 0,
      extractorJobs: extractorRows.rowCount ?? 0,
      mastery: masteryRows.rowCount ?? 0,
    };
  });

  process.stdout.write(`[db:retire:kg] ${oldGraphId} -> ${newGraphId}: ${JSON.stringify(counts)}\n`);
}

async function main() {
  const client = createPgClient();
  await client.connect();
  try {
    for (const [oldGraphId, newGraphId] of RETIRED_GRAPH_IDS) {
      await retireGraphId(client, oldGraphId, newGraphId);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`[db:retire:kg] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
