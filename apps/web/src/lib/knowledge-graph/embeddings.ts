export const KG_EMBEDDING_DIMENSION = 1536;
export const DEFAULT_OPENAI_KG_EMBEDDING_MODEL = "text-embedding-3-small";
export const DEFAULT_OPENAI_KG_EMBEDDING_MODEL_VERSION = "openai:text-embedding-3-small:1536";
export const DEFAULT_MINIMAX_KG_EMBEDDING_MODEL = "embo-01";
export const DEFAULT_MINIMAX_KG_EMBEDDING_MODEL_VERSION = "minimax:embo-01:1536";

type KnowledgeGraphEmbeddingProvider = "openai-compatible" | "minimax";
export type KnowledgeGraphEmbeddingUsage = "db" | "query";

type EmbeddingResponse = {
  data?: Array<{
    index: number;
    embedding: number[];
  }>;
  error?: {
    message?: string;
  };
};

type MiniMaxEmbeddingResponse = {
  vectors?: number[][];
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
  error?: {
    message?: string;
  };
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function getKnowledgeGraphEmbeddingProvider(): KnowledgeGraphEmbeddingProvider {
  const provider = process.env.KG_EMBEDDING_PROVIDER || "openai-compatible";
  if (provider === "openai" || provider === "openai-compatible") return "openai-compatible";
  if (provider === "minimax") return "minimax";
  throw new Error(`Unsupported KG_EMBEDDING_PROVIDER: ${provider}`);
}

function assertEmbeddingDimensions(embedding: number[]) {
  if (embedding.length !== KG_EMBEDDING_DIMENSION) {
    throw new Error(`Unexpected embedding dimension: ${embedding.length}`);
  }
}

export function resolveOpenAiCompatibleEmbeddingSettings() {
  const baseUrl = process.env.KG_EMBEDDING_BASE_URL || process.env.OPENAI_BASE_URL;
  const apiKey = process.env.KG_EMBEDDING_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_OPENAI_KG_EMBEDDING_MODEL;

  if (!baseUrl) throw new Error("Missing KG_EMBEDDING_BASE_URL or OPENAI_BASE_URL");
  if (!apiKey) throw new Error("Missing KG_EMBEDDING_API_KEY or OPENAI_API_KEY");

  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey, model };
}

async function createOpenAiCompatibleEmbedding(input: string) {
  const { baseUrl, apiKey, model } = resolveOpenAiCompatibleEmbeddingSettings();

  const response = await fetch(`${baseUrl}/embeddings`, {
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
  assertEmbeddingDimensions(embedding);

  return embedding;
}

async function createMiniMaxEmbedding(input: string, usage: KnowledgeGraphEmbeddingUsage) {
  const baseUrl = (process.env.MINIMAX_EMBEDDING_BASE_URL || process.env.MINIMAX_BASE_URL || "https://api.minimax.chat/v1")
    .replace(/\/$/, "");
  const apiKey = requiredEnv("MINIMAX_API_KEY");
  const model = process.env.MINIMAX_EMBEDDING_MODEL || DEFAULT_MINIMAX_KG_EMBEDDING_MODEL;
  const groupId = process.env.MINIMAX_GROUP_ID;
  const url = new URL(`${baseUrl}/embeddings`);
  if (groupId) url.searchParams.set("GroupId", groupId);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, texts: [input], type: usage }),
  });

  const json = (await response.json().catch(() => ({}))) as MiniMaxEmbeddingResponse;
  const statusCode = json.base_resp?.status_code;
  if (!response.ok || (statusCode !== undefined && statusCode !== 0)) {
    throw new Error(json.error?.message ?? json.base_resp?.status_msg ?? `Embedding request failed: ${response.status}`);
  }

  const embedding = json.vectors?.[0];
  if (!embedding?.length) throw new Error("MiniMax embedding provider returned an empty vector");
  assertEmbeddingDimensions(embedding);

  return embedding;
}

async function createOpenAiCompatibleEmbeddings(inputs: string[]) {
  const { baseUrl, apiKey, model } = resolveOpenAiCompatibleEmbeddingSettings();

  const response = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: inputs }),
  });

  const json = (await response.json().catch(() => ({}))) as EmbeddingResponse;
  if (!response.ok) {
    throw new Error(json.error?.message ?? `Embedding request failed: ${response.status}`);
  }

  const rows = [...(json.data ?? [])].sort((a, b) => a.index - b.index);
  if (rows.length !== inputs.length) throw new Error(`Embedding provider returned ${rows.length} of ${inputs.length} vectors`);
  return rows.map((row) => {
    assertEmbeddingDimensions(row.embedding ?? []);
    return row.embedding;
  });
}

async function createMiniMaxEmbeddings(inputs: string[], usage: KnowledgeGraphEmbeddingUsage) {
  const baseUrl = (process.env.MINIMAX_EMBEDDING_BASE_URL || process.env.MINIMAX_BASE_URL || "https://api.minimax.chat/v1")
    .replace(/\/$/, "");
  const apiKey = requiredEnv("MINIMAX_API_KEY");
  const model = process.env.MINIMAX_EMBEDDING_MODEL || DEFAULT_MINIMAX_KG_EMBEDDING_MODEL;
  const groupId = process.env.MINIMAX_GROUP_ID;
  const url = new URL(`${baseUrl}/embeddings`);
  if (groupId) url.searchParams.set("GroupId", groupId);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, texts: inputs, type: usage }),
  });

  const json = (await response.json().catch(() => ({}))) as MiniMaxEmbeddingResponse;
  const statusCode = json.base_resp?.status_code;
  if (!response.ok || (statusCode !== undefined && statusCode !== 0)) {
    throw new Error(json.error?.message ?? json.base_resp?.status_msg ?? `Embedding request failed: ${response.status}`);
  }

  const vectors = json.vectors ?? [];
  if (vectors.length !== inputs.length) throw new Error(`MiniMax returned ${vectors.length} of ${inputs.length} vectors`);
  for (const vector of vectors) assertEmbeddingDimensions(vector);
  return vectors;
}

/** Batch form of createKnowledgeGraphEmbedding: one provider request for all
 * inputs, vectors returned in input order. */
export async function createKnowledgeGraphEmbeddings(inputs: string[], usage: KnowledgeGraphEmbeddingUsage = "db"): Promise<number[][]> {
  if (inputs.length === 0) return [];
  if (getKnowledgeGraphEmbeddingProvider() === "minimax") return createMiniMaxEmbeddings(inputs, usage);
  return createOpenAiCompatibleEmbeddings(inputs);
}

/** True when the configured embedding provider has its credentials, so
 * best-effort callers can skip semantic indexing instead of throwing. */
export function isKnowledgeGraphEmbeddingConfigured(): boolean {
  try {
    if (getKnowledgeGraphEmbeddingProvider() === "minimax") return Boolean(process.env.MINIMAX_API_KEY);
    resolveOpenAiCompatibleEmbeddingSettings();
    return true;
  } catch {
    return false;
  }
}

export async function createKnowledgeGraphEmbedding(input: string, usage: KnowledgeGraphEmbeddingUsage = "query") {
  const provider = getKnowledgeGraphEmbeddingProvider();
  if (provider === "minimax") return createMiniMaxEmbedding(input, usage);
  return createOpenAiCompatibleEmbedding(input);
}

export function getKnowledgeGraphEmbeddingModelVersion() {
  if (process.env.KG_EMBEDDING_MODEL_VERSION) return process.env.KG_EMBEDDING_MODEL_VERSION;
  return getKnowledgeGraphEmbeddingProvider() === "minimax"
    ? DEFAULT_MINIMAX_KG_EMBEDDING_MODEL_VERSION
    : DEFAULT_OPENAI_KG_EMBEDDING_MODEL_VERSION;
}

export function toPgVectorLiteral(embedding: number[]) {
  return `[${embedding.join(",")}]`;
}
