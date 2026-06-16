import type { Memory as Mem0Memory } from "mem0ai";
import { memoryScopeFilters, memoryScopeMetadata, memoryScopeRunId, memoryScopeUserId } from "../scopes";
import type { MemoryAddInput, MemoryProvider, MemoryProviderConfig, MemoryRecord, MemorySearchInput } from "../types";

async function createClient(config: MemoryProviderConfig): Promise<{
  add: (messages: Array<{ role: "user" | "assistant"; content: string }>, options?: Record<string, unknown>) => Promise<Array<Mem0Memory>>;
  search: (query: string, options?: Record<string, unknown>) => Promise<{ results: Array<Mem0Memory> }>;
} | null> {
  if (!config.apiKey) return null;
  const { MemoryClient } = await import("mem0ai");
  return new MemoryClient({ apiKey: config.apiKey, host: config.host });
}

function mem0MemoryText(memory: Mem0Memory): string {
  return memory.memory ?? memory.data?.memory ?? "";
}

function mapMemory(memory: Mem0Memory): MemoryRecord {
  return {
    id: memory.id,
    text: mem0MemoryText(memory),
    score: memory.score,
    metadata: memory.metadata ?? undefined,
    createdAt: memory.createdAt ? new Date(memory.createdAt).toISOString() : undefined,
    updatedAt: memory.updatedAt ? new Date(memory.updatedAt).toISOString() : undefined,
  };
}

export function createMem0Provider(config: MemoryProviderConfig): MemoryProvider {
  let clientPromise: ReturnType<typeof createClient> | null = null;

  function getClient() {
    clientPromise ??= createClient(config);
    return clientPromise;
  }

  return {
    async search(input: MemorySearchInput) {
      const client = await getClient();
      if (!client) return [];

      const userId = memoryScopeUserId(input.scope);
      const response = await client.search(input.query, {
        filters: {
          ...memoryScopeFilters(input.scope),
          ...(input.metadata ?? {}),
          ...(userId ? { userId } : {}),
        },
        topK: input.topK ?? 6,
        rerank: input.rerank ?? true,
      });

      return (response.results ?? []).map(mapMemory).filter((memory) => memory.text.trim().length > 0);
    },

    async add(input: MemoryAddInput) {
      const client = await getClient();
      if (!client) return { ok: true, ids: [], disabled: true };

      const metadata = {
        ...memoryScopeMetadata(input.scope),
        ...(input.metadata ?? {}),
      };
      const result = await client.add(input.messages, {
        userId: memoryScopeUserId(input.scope),
        runId: input.runId ?? memoryScopeRunId(input.scope),
        metadata,
      });

      return { ok: true, ids: (result ?? []).map((memory) => memory.id).filter(Boolean) };
    },
  };
}
