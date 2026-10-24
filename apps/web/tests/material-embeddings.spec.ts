import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createKnowledgeGraphEmbeddings, isKnowledgeGraphEmbeddingConfigured } from "../src/lib/knowledge-graph/embeddings";
import { chunkEmbedText } from "../src/lib/materials/semantic-index";

const vector = (seed: number) => Array.from({ length: 1536 }, (_, i) => (i === seed ? 1 : 0));
const requestBody = (mock: ReturnType<typeof vi.fn>) => JSON.parse(String((mock.mock.calls[0][1] as RequestInit).body));
const ENV_KEYS = ["KG_EMBEDDING_PROVIDER", "KG_EMBEDDING_BASE_URL", "KG_EMBEDDING_API_KEY", "OPENAI_BASE_URL", "OPENAI_API_KEY", "MINIMAX_API_KEY"];

describe("batch knowledge-graph embeddings", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    vi.unstubAllGlobals();
  });

  it("returns OpenAI-compatible vectors in input order", async () => {
    process.env.KG_EMBEDDING_BASE_URL = "http://embed.test/v1";
    process.env.KG_EMBEDDING_API_KEY = "k";
    const fetchMock = vi.fn(async (_url: unknown, _init?: RequestInit) =>
      Response.json({ data: [{ index: 1, embedding: vector(1) }, { index: 0, embedding: vector(0) }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const vectors = await createKnowledgeGraphEmbeddings(["a", "b"]);
    expect(vectors[0][0]).toBe(1);
    expect(vectors[1][1]).toBe(1);
    expect(requestBody(fetchMock)).toMatchObject({ input: ["a", "b"] });
    expect(await createKnowledgeGraphEmbeddings([])).toEqual([]);
  });

  it("sends MiniMax texts with the db usage and rejects short responses", async () => {
    process.env.KG_EMBEDDING_PROVIDER = "minimax";
    process.env.MINIMAX_API_KEY = "k";
    const fetchMock = vi.fn(async (_url: unknown, _init?: RequestInit) => Response.json({ vectors: [vector(0)], base_resp: { status_code: 0 } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createKnowledgeGraphEmbeddings(["a", "b"])).rejects.toThrow("MiniMax returned 1 of 2 vectors");
    expect(requestBody(fetchMock)).toMatchObject({ texts: ["a", "b"], type: "db" });
  });

  it("reports whether a provider is configured without throwing", () => {
    expect(isKnowledgeGraphEmbeddingConfigured()).toBe(false);
    process.env.KG_EMBEDDING_PROVIDER = "minimax";
    expect(isKnowledgeGraphEmbeddingConfigured()).toBe(false);
    process.env.MINIMAX_API_KEY = "k";
    expect(isKnowledgeGraphEmbeddingConfigured()).toBe(true);
    process.env.KG_EMBEDDING_PROVIDER = "unsupported";
    expect(isKnowledgeGraphEmbeddingConfigured()).toBe(false);
  });
});

describe("chunkEmbedText", () => {
  it("prefixes a heading the chunk text does not already start with, and caps length", () => {
    expect(chunkEmbedText({ heading: "Limits", text: "Body" })).toBe("Limits\nBody");
    expect(chunkEmbedText({ heading: "Limits", text: "Limits\n\nBody" })).toBe("Limits\n\nBody");
    expect(chunkEmbedText({ heading: null, text: "x".repeat(3_000) })).toHaveLength(2_000);
  });
});
