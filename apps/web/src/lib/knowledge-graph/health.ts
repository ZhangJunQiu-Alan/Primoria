import { getKnowledgeGraphEmbeddingModelVersion } from "./embeddings";
import { classifyKnowledgeGraphFailure } from "./errors";

export type KnowledgeGraphHealth = {
  status: "ok" | "degraded" | "unhealthy";
  database: "ok" | "unavailable";
  kg: {
    schema: "ok" | "missing" | "drift" | "unknown";
    embeddings: "ok" | "empty" | "unknown";
    modelVersion: string | null;
  };
};

export type HealthQuery = (
  text: string,
  params?: unknown[],
) => Promise<{ rows: Array<Record<string, unknown>> }>;

export async function checkKnowledgeGraphHealth(query: HealthQuery): Promise<KnowledgeGraphHealth> {
  let modelVersion: string | null = null;
  try {
    modelVersion = getKnowledgeGraphEmbeddingModelVersion();
  } catch {
    modelVersion = null;
  }

  try {
    const reg = await query(
      `select
         to_regclass('public.knowledge_graph_topics') is not null as topics,
         to_regclass('public.knowledge_graph_concepts') is not null as concepts,
         to_regclass('public.kg_node_embeddings') is not null as embeddings_table`,
    );
    const row = reg.rows[0] ?? {};
    const schemaOk = row.topics === true && row.concepts === true && row.embeddings_table === true;

    let embeddings: KnowledgeGraphHealth["kg"]["embeddings"] = "unknown";
    if (row.embeddings_table === true && modelVersion) {
      const seeded = await query(
        `select exists(select 1 from public.kg_node_embeddings where model_version = $1) as seeded`,
        [modelVersion],
      );
      embeddings = seeded.rows[0]?.seeded === true ? "ok" : "empty";
    }

    const schema = schemaOk ? "ok" : "missing";
    const status = schema === "ok" && embeddings === "ok" ? "ok" : "degraded";
    return { status, database: "ok", kg: { schema, embeddings, modelVersion } };
  } catch (error) {
    if (classifyKnowledgeGraphFailure(error) === "kg_schema_drift") {
      return {
        status: "degraded",
        database: "ok",
        kg: { schema: "drift", embeddings: "unknown", modelVersion },
      };
    }
    return {
      status: "unhealthy",
      database: "unavailable",
      kg: { schema: "unknown", embeddings: "unknown", modelVersion },
    };
  }
}
