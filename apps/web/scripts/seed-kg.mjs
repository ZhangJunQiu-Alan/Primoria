#!/usr/bin/env node

import {
  DEFAULT_GRAPH_ID,
  createPgClient,
  graphPath,
  listGraphIds,
  readJson,
  withTransaction,
} from "./kg-db-common.mjs";

const arg = process.argv[2] || DEFAULT_GRAPH_ID;

function validateGraph(graph) {
  if (!Array.isArray(graph.nodes)) throw new Error("Graph JSON must have a nodes array");
  if (!Array.isArray(graph.edges)) throw new Error("Graph JSON must have an edges array");

  const ids = new Set();
  const topics = new Set();
  const concepts = new Set();
  const conceptEdges = new Map();

  for (const node of graph.nodes) {
    if (!node.id || ids.has(node.id)) throw new Error(`Duplicate or missing node id: ${node.id}`);
    ids.add(node.id);
    if (node.kind === "topic") {
      if (node.topic !== null) throw new Error(`Topic ${node.id} must have topic=null`);
      topics.add(node.id);
    } else if (node.kind === "concept") {
      if (!/^pc_[a-f0-9]{32}$/.test(node.canonical_id ?? "")) {
        throw new Error(`Concept ${node.id} has invalid canonical_id: ${node.canonical_id}`);
      }
      concepts.add(node.id);
    } else {
      throw new Error(`Unsupported node kind for ${node.id}: ${node.kind}`);
    }
  }

  for (const node of graph.nodes) {
    if (node.kind !== "concept") continue;
    if (!topics.has(node.topic)) throw new Error(`Concept ${node.id} references missing topic ${node.topic}`);
  }

  for (const edge of graph.edges) {
    if (edge.type !== "prereq") throw new Error(`Unsupported edge type: ${edge.type}`);
    if (!concepts.has(edge.from)) throw new Error(`Edge references missing from concept ${edge.from}`);
    if (!concepts.has(edge.to)) throw new Error(`Edge references missing to concept ${edge.to}`);
    if (edge.from === edge.to) throw new Error(`Self-loop edge is not allowed: ${edge.from}`);
    if (!["hard", "soft"].includes(edge.strength)) throw new Error(`Invalid edge strength: ${edge.strength}`);
    const key = `${edge.from}|${edge.to}|${edge.type}`;
    if (conceptEdges.has(key)) throw new Error(`Duplicate edge: ${key}`);
    conceptEdges.set(key, edge);
  }

  assertAcyclic([...concepts], graph.edges);
}

function assertAcyclic(concepts, edges) {
  const outgoing = new Map(concepts.map((id) => [id, []]));
  const indegree = new Map(concepts.map((id) => [id, 0]));
  for (const edge of edges) {
    outgoing.get(edge.from).push(edge.to);
    indegree.set(edge.to, indegree.get(edge.to) + 1);
  }

  const queue = concepts.filter((id) => indegree.get(id) === 0);
  let seen = 0;
  while (queue.length > 0) {
    const id = queue.shift();
    seen += 1;
    for (const next of outgoing.get(id)) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  if (seen !== concepts.length) throw new Error("Prerequisite graph contains a cycle");
}

async function seedGraph(client, graphId) {
  const graph = readJson(graphPath(graphId));

  // DB stores concept-level prereq edges only; the topic DAG is derived
  // separately (build-topic-graph). Drop any topic-endpoint edges with a warning.
  const kind = new Map(graph.nodes.map((n) => [n.id, n.kind]));
  const conceptEdges = graph.edges.filter((e) => kind.get(e.from) === "concept" && kind.get(e.to) === "concept");
  const droppedTopicEdges = graph.edges.length - conceptEdges.length;
  if (droppedTopicEdges > 0) {
    process.stderr.write(`[db:seed:kg] ${graphId}: skipping ${droppedTopicEdges} topic-level edge(s) (concept edges only)\n`);
    graph.edges = conceptEdges;
  }

  validateGraph(graph);

  const topics = graph.nodes.filter((n) => n.kind === "topic");
  const concepts = graph.nodes.filter((n) => n.kind === "concept");
  const topicIds = topics.map((t) => t.id);
  const conceptIds = concepts.map((c) => c.id);

  await withTransaction(client, async () => {
      await client.query(
        `
          insert into public.knowledge_graphs (id, subject, schema_doc, created_at, updated_at)
          values ($1, $2, $3::jsonb, now(), now())
          on conflict (id) do update set
            subject = excluded.subject,
            schema_doc = excluded.schema_doc,
            updated_at = now()
        `,
        [graphId, graph.subject, JSON.stringify(graph.schema ?? {})],
      );

      for (const topic of topics) {
        await client.query(
          `
            insert into public.knowledge_graph_topics
              (graph_id, topic_id, name, default_order, created_at, updated_at)
            values ($1, $2, $3, $4, now(), now())
            on conflict (graph_id, topic_id) do update set
              name = excluded.name,
              default_order = excluded.default_order,
              updated_at = now()
          `,
          [graphId, topic.id, topic.name, topic.default_order],
        );
      }

      for (const concept of concepts) {
        await client.query(
          `
            insert into public.knowledge_graph_concepts
              (graph_id, concept_id, canonical_id, topic_id, name, description, default_order, created_at, updated_at)
            values ($1, $2, $3, $4, $5, $6, $7, now(), now())
            on conflict (graph_id, concept_id) do update set
              canonical_id = excluded.canonical_id,
              topic_id = excluded.topic_id,
              name = excluded.name,
              description = excluded.description,
              default_order = excluded.default_order,
              updated_at = now()
          `,
          [
            graphId,
            concept.id,
            concept.canonical_id,
            concept.topic,
            concept.name,
            concept.description,
            concept.default_order,
          ],
        );
      }

      await client.query(
        `
          delete from public.knowledge_graph_edges
          where from_graph_id = $1 and to_graph_id = $1
        `,
        [graphId],
      );

      await client.query(
        `
          delete from public.knowledge_graph_concepts
          where graph_id = $1 and not (concept_id = any($2::text[]))
        `,
        [graphId, conceptIds],
      );

      await client.query(
        `
          delete from public.knowledge_graph_topics
          where graph_id = $1 and not (topic_id = any($2::text[]))
        `,
        [graphId, topicIds],
      );

      for (const edge of graph.edges) {
        await client.query(
          `
            insert into public.knowledge_graph_edges
              (from_graph_id, from_concept_id, to_graph_id, to_concept_id, edge_type, strength, created_at, updated_at)
            values ($1, $2, $1, $3, $4, $5, now(), now())
          `,
          [graphId, edge.from, edge.to, edge.type, edge.strength],
        );
      }
  });

  process.stdout.write(
    `[db:seed:kg] ${graphId}: ${topics.length} topics, ${concepts.length} concepts, ${graph.edges.length} edges\n`,
  );
}

async function main() {
  const ids = arg === "all" ? listGraphIds() : [arg];
  const client = createPgClient();
  await client.connect();
  try {
    for (const id of ids) await seedGraph(client, id);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`[db:seed:kg] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
