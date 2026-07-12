import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveOpenAiCompatibleEmbeddingSettings } from "../src/lib/knowledge-graph/embeddings";

const ENV_KEYS = [
  "KG_EMBEDDING_BASE_URL",
  "KG_EMBEDDING_API_KEY",
  "OPENAI_BASE_URL",
  "OPENAI_API_KEY",
  "OPENAI_EMBEDDING_MODEL",
] as const;

let savedEnv: Record<(typeof ENV_KEYS)[number], string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]])) as typeof savedEnv;
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = savedEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("OpenAI-compatible KG embedding settings", () => {
  it("prefers dedicated embedding credentials over chat credentials", () => {
    process.env.KG_EMBEDDING_BASE_URL = "https://embedding.example/v1/";
    process.env.KG_EMBEDDING_API_KEY = "embedding-key";
    process.env.OPENAI_BASE_URL = "https://chat.example/v1";
    process.env.OPENAI_API_KEY = "chat-key";
    process.env.OPENAI_EMBEDDING_MODEL = "embedding-model";

    expect(resolveOpenAiCompatibleEmbeddingSettings()).toEqual({
      baseUrl: "https://embedding.example/v1",
      apiKey: "embedding-key",
      model: "embedding-model",
    });
  });

  it("falls back to the chat endpoint only when dedicated settings are absent", () => {
    process.env.OPENAI_BASE_URL = "https://combined.example/v1/";
    process.env.OPENAI_API_KEY = "combined-key";

    expect(resolveOpenAiCompatibleEmbeddingSettings()).toEqual({
      baseUrl: "https://combined.example/v1",
      apiKey: "combined-key",
      model: "text-embedding-3-small",
    });
  });

  it("fails explicitly when no embedding-capable endpoint or key is configured", () => {
    expect(() => resolveOpenAiCompatibleEmbeddingSettings()).toThrow(/KG_EMBEDDING_BASE_URL/);
    process.env.KG_EMBEDDING_BASE_URL = "https://embedding.example/v1";
    expect(() => resolveOpenAiCompatibleEmbeddingSettings()).toThrow(/KG_EMBEDDING_API_KEY/);
  });
});
