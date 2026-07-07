import { Pool } from "pg";

import { getNodePostgresSsl } from "../db/ssl";
import {
  createKnowledgeGraphEmbedding,
  getKnowledgeGraphEmbeddingModelVersion,
  toPgVectorLiteral,
} from "./embeddings";
import { encodeKnowledgeGraphQuery, type EncodedKnowledgeGraphQuery } from "./query-encoding";

// Sentinel for cross-graph recall (search across every graph, no graph filter).
export const ALL_KG_GRAPHS = "*";
export const DEFAULT_KG_SEARCH_TOP_K = 15;

export type KnowledgeGraphNodeKind = "topic" | "concept";

export type KnowledgeGraphSearchResult = {
  graphId: string;
  kind: KnowledgeGraphNodeKind;
  nodeId: string;
  name: string;
  description: string | null;
  topicId: string | null;
  topicName: string | null;
  embedText: string;
  modelVersion: string;
  distance: number;
  similarity: number;
};

export type KnowledgeGraphSearchResponse = {
  encodedQuery: EncodedKnowledgeGraphQuery;
  graphId: string;
  modelVersion: string;
  topK: number;
  results: KnowledgeGraphSearchResult[];
};

type PgRow = {
  graph_id: string;
  kind: KnowledgeGraphNodeKind;
  node_id: string;
  name: string | null;
  description: string | null;
  topic_id: string | null;
  topic_name: string | null;
  embed_text: string;
  model_version: string;
  distance: number;
  similarity: number;
};

const globalForKnowledgeGraph = globalThis as typeof globalThis & {
  primoriaKnowledgeGraphPool?: Pool;
};

function getKnowledgeGraphPool() {
  if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL");

  if (!globalForKnowledgeGraph.primoriaKnowledgeGraphPool) {
    globalForKnowledgeGraph.primoriaKnowledgeGraphPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 4,
      ssl: getNodePostgresSsl(),
    });
  }

  return globalForKnowledgeGraph.primoriaKnowledgeGraphPool;
}

function clampTopK(topK: number | undefined) {
  if (!Number.isFinite(topK)) return DEFAULT_KG_SEARCH_TOP_K;
  return Math.min(Math.max(Math.trunc(topK ?? DEFAULT_KG_SEARCH_TOP_K), 1), 50);
}

function mapRow(row: PgRow): KnowledgeGraphSearchResult {
  return {
    graphId: row.graph_id,
    kind: row.kind,
    nodeId: row.node_id,
    name: row.name ?? row.node_id,
    description: row.description,
    topicId: row.topic_id,
    topicName: row.topic_name,
    embedText: row.embed_text,
    modelVersion: row.model_version,
    distance: Number(row.distance),
    similarity: Number(row.similarity),
  };
}

export async function searchKnowledgeGraphNodes(input: {
  query: string;
  graphId?: string;
  topK?: number;
  modelVersion?: string;
}): Promise<KnowledgeGraphSearchResponse> {
  // No graphId (or "*") => cross-graph recall: rank nodes across every graph so
  // cold-start positioning can discover the subject from the top hits.
  const graphFilter = input.graphId && input.graphId !== ALL_KG_GRAPHS ? input.graphId : null;
  const modelVersion = input.modelVersion || getKnowledgeGraphEmbeddingModelVersion();
  const topK = clampTopK(input.topK);
  const encodedQuery = encodeKnowledgeGraphQuery(input.query);
  const queryEmbedding = await createKnowledgeGraphEmbedding(encodedQuery.embeddingQuery);
  const queryVector = toPgVectorLiteral(queryEmbedding);
  const pool = getKnowledgeGraphPool();

  const result = await pool.query<PgRow>(
    `
      select
        e.graph_id,
        e.kind,
        e.node_id,
        coalesce(topic_node.name, concept_node.name) as name,
        concept_node.description,
        concept_node.topic_id,
        concept_topic.name as topic_name,
        e.embed_text,
        e.model_version,
        (e.embedding <=> $1::vector)::float8 as distance,
        (1 - (e.embedding <=> $1::vector))::float8 as similarity
      from public.kg_node_embeddings e
      left join public.knowledge_graph_topics topic_node
        on e.kind = 'topic'
       and topic_node.graph_id = e.graph_id
       and topic_node.topic_id = e.node_id
      left join public.knowledge_graph_concepts concept_node
        on e.kind = 'concept'
       and concept_node.graph_id = e.graph_id
       and concept_node.concept_id = e.node_id
      left join public.knowledge_graph_topics concept_topic
        on concept_topic.graph_id = concept_node.graph_id
       and concept_topic.topic_id = concept_node.topic_id
      where e.model_version = $2
        ${graphFilter ? "and e.graph_id = $4" : ""}
      order by e.embedding <=> $1::vector
      limit $3
    `,
    graphFilter ? [queryVector, modelVersion, topK, graphFilter] : [queryVector, modelVersion, topK],
  );

  return {
    encodedQuery,
    graphId: graphFilter ?? ALL_KG_GRAPHS,
    modelVersion,
    topK,
    results: result.rows.map(mapRow),
  };
}
