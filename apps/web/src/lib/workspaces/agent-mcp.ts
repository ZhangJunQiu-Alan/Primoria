import type { WorkspaceGuardedToolSpec, WorkspaceInternalToolPolicy } from "./agent-tools";
import type { WorkspaceAgentConnection, WorkspaceAgentProfile } from "./types";
import { workspaceMcpRuntimeToolName, workspaceMcpToolManifest } from "../agent-os/tools";

export type WorkspaceMcpLangChainTool = {
  name: string;
  description?: string;
  invoke: (input?: unknown) => Promise<unknown>;
};

export type WorkspaceMcpClient = {
  getTools: (...servers: string[]) => Promise<WorkspaceMcpLangChainTool[]>;
  close?: () => Promise<void>;
};

export type WorkspaceMcpClientFactory = (config: WorkspaceMcpClientConfig) => WorkspaceMcpClient;

export type WorkspaceMcpClientConfig = {
  throwOnLoadError: boolean;
  prefixToolNameWithServerName: boolean;
  useStandardContentBlocks: boolean;
  onConnectionError: "throw" | "ignore";
  mcpServers: Record<string, WorkspaceMcpServerConfig>;
};

export type WorkspaceMcpServerConfig =
  | {
      transport?: "sse";
      url: string;
    }
  | {
      transport: "stdio";
      command: string;
      args: string[];
      env?: Record<string, string>;
    };

export type WorkspaceMcpToolBuildInput = {
  profile: WorkspaceAgentProfile;
  connections: WorkspaceAgentConnection[];
  clientFactory?: WorkspaceMcpClientFactory;
};

export async function buildWorkspaceMcpGuardedToolSpecs(input: WorkspaceMcpToolBuildInput): Promise<WorkspaceGuardedToolSpec[]> {
  const selections = selectWorkspaceMcpToolSelections(input.profile, input.connections);
  if (!selections.length) return [];
  const selectedConnections = Array.from(new Map(selections.map((selection) => [selection.connection.id, selection.connection])).values());
  const config = buildWorkspaceMcpClientConfig(selectedConnections);
  const client = input.clientFactory ? input.clientFactory(config) : await createDefaultWorkspaceMcpClient(config);
  let closed = false;
  const cleanup = async () => {
    if (closed) return;
    closed = true;
    await client.close?.();
  };
  const specs: WorkspaceGuardedToolSpec[] = [];
  try {
    for (const connection of selectedConnections) {
      const rawTools = await readWorkspaceMcpConnectionTools(client, connection.id);
      for (const selection of selections.filter((entry) => entry.connection.id === connection.id)) {
        const rawTool = rawTools.find((tool) => tool.name === selection.toolName);
        if (!rawTool) continue;
        const runtimeToolName = workspaceMcpRuntimeToolName(connection.id, rawTool.name);
        const policy = buildWorkspaceMcpToolPolicy(connection, rawTool.name, runtimeToolName);
        specs.push({
          name: runtimeToolName,
          description: rawTool.description || `Use ${rawTool.name} through ${connection.displayName}.`,
          policy,
          invoke: async (toolInput?: unknown) => executeWorkspaceMcpTool(connection, runtimeToolName, rawTool, toolInput),
          cleanup,
        });
      }
    }
    if (!specs.length) await cleanup();
    return specs;
  } catch (error) {
    await cleanup();
    throw error;
  }
}

export function selectWorkspaceMcpToolSelections(profile: WorkspaceAgentProfile, connections: WorkspaceAgentConnection[]) {
  const visibleConnections = new Map(connections.filter((connection) => connection.status !== "disabled").map((connection) => [connection.id, connection]));
  return profile.capabilities.flatMap((capability) => {
    if (capability.kind !== "mcp_tool" || !capability.enabled) return [];
    const connection = visibleConnections.get(capability.connectionId);
    if (!connection || !connection.allowedToolNames.includes(capability.toolName)) return [];
    return [{ connection, toolName: capability.toolName, approval: capability.approval }];
  });
}

export function buildWorkspaceMcpClientConfig(connections: WorkspaceAgentConnection[]): WorkspaceMcpClientConfig {
  return {
    throwOnLoadError: false,
    prefixToolNameWithServerName: false,
    useStandardContentBlocks: true,
    onConnectionError: "ignore",
    mcpServers: Object.fromEntries(connections.map((connection) => [connection.id, buildWorkspaceMcpServerConfig(connection)])),
  };
}

export function buildWorkspaceMcpServerConfig(connection: WorkspaceAgentConnection): WorkspaceMcpServerConfig {
  if (connection.transport === "http" || connection.transport === "sse") {
    const url = parseWorkspaceMcpUrl(connection.configRef);
    return connection.transport === "sse" ? { transport: "sse", url } : { url };
  }
  const config = parseWorkspaceStdioConnectionConfig(connection.configRef);
  return {
    transport: "stdio",
    command: config.command,
    args: config.args,
    ...(config.env ? { env: config.env } : {}),
  };
}

function buildWorkspaceMcpToolPolicy(connection: WorkspaceAgentConnection, rawToolName: string, runtimeToolName: string): WorkspaceInternalToolPolicy {
  const manifest = workspaceMcpToolManifest({ connection, toolName: rawToolName, runtimeToolName });
  return {
    toolName: manifest.name,
    risk: manifest.risk,
    approval: manifest.approval,
    scopes: manifest.scopes,
    visibleLabel: manifest.inspector?.label ?? `${connection.displayName}: ${rawToolName}`,
    description: manifest.description,
  };
}

async function createDefaultWorkspaceMcpClient(config: WorkspaceMcpClientConfig): Promise<WorkspaceMcpClient> {
  const module = await import("@langchain/mcp-adapters");
  const { MultiServerMCPClient } = module as {
    MultiServerMCPClient?: new (config: WorkspaceMcpClientConfig) => WorkspaceMcpClient;
  };
  if (!MultiServerMCPClient) throw new Error("LangChain MCP adapter is not available.");
  return new MultiServerMCPClient(config);
}

function parseWorkspaceMcpUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("MCP HTTP/SSE connections require an http(s) URL config reference.");
  }
  return url.toString();
}

function parseWorkspaceStdioConnectionConfig(value: string) {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("MCP stdio connections require a JSON config reference.");
  }
  const record = parsed as Record<string, unknown>;
  const command = typeof record.command === "string" && record.command.trim() ? record.command.trim() : undefined;
  const args = Array.isArray(record.args) ? record.args.filter((entry): entry is string => typeof entry === "string") : [];
  const env = record.env && typeof record.env === "object" && !Array.isArray(record.env) ? Object.fromEntries(Object.entries(record.env).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : undefined;
  if (!command) throw new Error("MCP stdio config requires a command.");
  return { command, args, env };
}

async function readWorkspaceMcpConnectionTools(client: WorkspaceMcpClient, connectionId: string) {
  try {
    return await client.getTools(connectionId);
  } catch {
    return [];
  }
}

async function executeWorkspaceMcpTool(
  connection: WorkspaceAgentConnection,
  runtimeToolName: string,
  rawTool: WorkspaceMcpLangChainTool,
  input: unknown,
) {
  try {
    const output = await rawTool.invoke(input);
    return JSON.stringify(
      {
        tool: runtimeToolName,
        ok: true,
        summary: `Completed ${rawTool.name} through ${connection.displayName}.`,
        connection: {
          id: connection.id,
          displayName: connection.displayName,
          scope: connection.scope,
        },
        input,
        output,
      },
      null,
      2,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "External connection tool failed.";
    return JSON.stringify(
      {
        tool: runtimeToolName,
        ok: false,
        summary: `${connection.displayName}: ${rawTool.name} could not complete.`,
        connection: {
          id: connection.id,
          displayName: connection.displayName,
          scope: connection.scope,
        },
        input,
        error: message,
      },
      null,
      2,
    );
  }
}
