export type MemoryScope =
  | { type: "user"; userId: string }
  | { type: "user_course"; userId: string; courseId: string }
  | { type: "agent"; agentId: string }
  | { type: "workspace"; workspaceId: string }
  | { type: "system" };

export type MemoryMessageRole = "user" | "assistant";

export type MemoryMessage = {
  role: MemoryMessageRole;
  content: string;
};

export type MemoryRecord = {
  id: string;
  text: string;
  score?: number;
  scope?: MemoryScope;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type MemorySearchInput = {
  scope: MemoryScope;
  query: string;
  topK?: number;
  rerank?: boolean;
  metadata?: Record<string, unknown>;
};

export type MemoryAddInput = {
  scope: MemoryScope;
  messages: MemoryMessage[];
  runId?: string;
  metadata?: Record<string, unknown>;
};

export type MemoryWriteResult = {
  ok: boolean;
  ids: string[];
  disabled?: boolean;
};

export type MemoryProvider = {
  search(input: MemorySearchInput): Promise<MemoryRecord[]>;
  add(input: MemoryAddInput): Promise<MemoryWriteResult>;
};

export type MemoryProviderConfig = {
  provider?: "mem0" | "disabled";
  apiKey?: string;
  host?: string;
};
