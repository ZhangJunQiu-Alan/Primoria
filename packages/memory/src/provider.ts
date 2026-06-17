import { createMem0Provider } from "./adapters/mem0";
import type { MemoryProvider, MemoryProviderConfig } from "./types";

function createDisabledProvider(): MemoryProvider {
  return {
    async search() {
      return [];
    },
    async add() {
      return { ok: true, ids: [], disabled: true };
    },
  };
}

export function createMemoryProvider(config: MemoryProviderConfig = {}): MemoryProvider {
  const provider = config.provider ?? (config.apiKey ? "mem0" : "disabled");
  if (provider === "mem0") return createMem0Provider(config);
  return createDisabledProvider();
}
