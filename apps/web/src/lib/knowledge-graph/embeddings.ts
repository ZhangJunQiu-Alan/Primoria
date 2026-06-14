export const DEFAULT_KG_EMBEDDING_MODEL = "text-embedding-3-small";
export const DEFAULT_KG_EMBEDDING_MODEL_VERSION = "openai:text-embedding-3-small:1536";

type EmbeddingResponse = {
  data?: Array<{
    index: number;
    embedding: number[];
  }>;
  error?: {
    message?: string;
  };
};

export async function createKnowledgeGraphEmbedding(input: string) {
  const baseUrl = process.env.OPENAI_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_KG_EMBEDDING_MODEL;

  if (!baseUrl) throw new Error("Missing OPENAI_BASE_URL");
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/embeddings`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input }),
  });

  const json = (await response.json().catch(() => ({}))) as EmbeddingResponse;

  if (!response.ok) {
    throw new Error(json.error?.message ?? `Embedding request failed: ${response.status}`);
  }

  const embedding = json.data?.[0]?.embedding;
  if (!embedding?.length) throw new Error("Embedding provider returned an empty vector");

  return embedding;
}

export function getKnowledgeGraphEmbeddingModelVersion() {
  return process.env.KG_EMBEDDING_MODEL_VERSION || DEFAULT_KG_EMBEDDING_MODEL_VERSION;
}

export function toPgVectorLiteral(embedding: number[]) {
  return `[${embedding.join(",")}]`;
}
