#!/usr/bin/env tsx

import {
  buildWorkspaceMcpClientConfig,
  buildWorkspaceMcpGuardedToolSpecs,
  selectWorkspaceMcpToolSelections,
} from "../src/lib/workspaces/agent-mcp.ts";
import { workspaceMcpRuntimeToolName, workspaceMcpToolManifest } from "../src/lib/agent-os/tools.ts";
import { buildWorkspaceToolInterrupts, requiresWorkspaceToolApproval } from "../src/lib/workspaces/agent-tools.ts";
import type { WorkspaceAgentConnection, WorkspaceAgentProfile } from "../src/lib/workspaces/types.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

async function main() {
  const connection: WorkspaceAgentConnection = {
    id: "conn_sources",
    workspaceId: "workspace_mcp",
    ownerId: "owner_mcp",
    scope: "workspace",
    displayName: "Source Search",
    transport: "http",
    configRef: "https://mcp.example.test/sources",
    allowedToolNames: ["search_sources"],
    status: "available",
    createdAt: 1,
    updatedAt: 2,
  };
  const disabledConnection: WorkspaceAgentConnection = {
    ...connection,
    id: "conn_disabled",
    displayName: "Disabled",
    allowedToolNames: ["disabled_search"],
    status: "disabled",
  };
  const profile: WorkspaceAgentProfile = {
    id: "agent_profile_mcp",
    workspaceId: "workspace_mcp",
    ownerId: "owner_mcp",
    displayName: "MCP Researcher",
    handle: "mcp-researcher",
    description: "Uses approved external source tools.",
    visibility: "workspace",
    systemPrompt: "Use external sources only after approval.",
    memoryScope: "thread",
    capabilities: [
      { id: "cap_mcp", profileId: "agent_profile_mcp", kind: "mcp_tool", connectionId: connection.id, toolName: "search_sources", approval: "always", enabled: true },
      { id: "cap_unallowed", profileId: "agent_profile_mcp", kind: "mcp_tool", connectionId: connection.id, toolName: "write_sources", approval: "always", enabled: true },
      { id: "cap_disabled_connection", profileId: "agent_profile_mcp", kind: "mcp_tool", connectionId: disabledConnection.id, toolName: "disabled_search", approval: "always", enabled: true },
    ],
    createdAt: 1,
    updatedAt: 2,
  };

  const selections = selectWorkspaceMcpToolSelections(profile, [connection, disabledConnection]);
  assert(selections.length === 1, "MCP selection keeps only visible allowlisted connection tools");
  assert(selections[0].toolName === "search_sources", "MCP selection preserves raw allowlisted tool name");
  const mcpManifest = workspaceMcpToolManifest({ connection, toolName: "search_sources" });
  assert(mcpManifest.source === "mcp", "MCP manifest records MCP source");
  assert(mcpManifest.risk === "external" && mcpManifest.approval === "always", "MCP manifest preserves external risk and approval");
  assert(mcpManifest.inspector?.label.includes("Source Search"), "MCP manifest carries inspector label");
  assert(mcpManifest.render?.renderer === "workspace-tool-result", "MCP manifest uses generic tool result renderer");

  const config = buildWorkspaceMcpClientConfig([connection]);
  assert(config.throwOnLoadError === false, "MCP adapter config does not fail the whole run when one connection cannot load");
  assert(config.onConnectionError === "ignore", "MCP adapter config treats connection errors as recoverable");
  assert(config.prefixToolNameWithServerName === false, "MCP adapter config keeps raw tool names for explicit Primoria allowlist matching");
  assert(config.useStandardContentBlocks === true, "MCP adapter config requests standard content blocks");
  assert((config.mcpServers.conn_sources as { url: string }).url === "https://mcp.example.test/sources", "MCP adapter config maps connection URL");

  let closeCalled = false;
  const specs = await buildWorkspaceMcpGuardedToolSpecs({
    profile,
    connections: [connection, disabledConnection],
    clientFactory: (clientConfig) => ({
      async getTools(serverName: string) {
        assert(serverName === connection.id, "MCP loader asks only for the selected connection server");
        assert(Object.keys(clientConfig.mcpServers).length === 1, "MCP client config contains only selected connections");
        return [
          {
            name: "search_sources",
            description: "Search approved source indexes.",
            async invoke(input) {
              return { ok: true, input };
            },
          },
          {
            name: "write_sources",
            description: "Should not be wrapped without an allowlist entry.",
            async invoke() {
              return "not allowed";
            },
          },
        ];
      },
      async close() {
        closeCalled = true;
      },
    }),
  });
  assert(specs.length === 1, "MCP guarded specs wrap only allowed raw tools");
  const spec = specs[0];
  assert(spec.name === workspaceMcpRuntimeToolName(connection.id, "search_sources"), "MCP guarded spec uses a stable runtime-safe tool name");
  assert(spec.policy.risk === "external", "MCP guarded spec is marked as external risk");
  assert(spec.policy.approval === "always", "MCP guarded spec always requires approval");
  assert(spec.policy.visibleLabel.includes("Source Search"), "MCP guarded spec carries connection label for approvals");
  assert(requiresWorkspaceToolApproval(spec.policy), "MCP guarded spec participates in approval interrupts");
  const interrupts = buildWorkspaceToolInterrupts([spec.policy]);
  assert(interrupts[spec.name].description.includes("external connection"), "MCP approval copy explains external data egress");
  const output = await spec.invoke?.({ query: "calculus" });
  const outputPayload = JSON.parse(output ?? "{}");
  assert(outputPayload.tool === spec.name, "MCP guarded spec returns structured tool output");
  assert(outputPayload.ok === true, "MCP guarded spec marks successful tool output");
  assert(outputPayload.summary.includes("Source Search"), "MCP guarded spec returns a user-visible success summary");
  assert(outputPayload.output.ok === true, "MCP guarded spec preserves raw structured output");
  assert(outputPayload.connection.id === connection.id, "MCP guarded spec records connection provenance");
  await spec.cleanup?.();
  assert(closeCalled, "MCP guarded spec cleanup closes the underlying MCP client");

  const failingSpecs = await buildWorkspaceMcpGuardedToolSpecs({
    profile,
    connections: [connection],
    clientFactory: () => ({
      async getTools() {
        return [
          {
            name: "search_sources",
            description: "Search approved source indexes.",
            async invoke() {
              throw new Error("source endpoint unavailable");
            },
          },
        ];
      },
    }),
  });
  const failedOutput = await failingSpecs[0].invoke?.({ query: "limits" });
  const failedPayload = JSON.parse(failedOutput ?? "{}");
  assert(failedPayload.tool === failingSpecs[0].name, "failed MCP tool still returns a structured payload");
  assert(failedPayload.ok === false, "failed MCP tool marks recoverable failure");
  assert(failedPayload.summary.includes("could not complete"), "failed MCP tool returns user-visible failure summary");
  assert(failedPayload.error === "source endpoint unavailable", "failed MCP tool preserves safe error text");

  let loadFailureCloseCalled = false;
  const unavailableSpecs = await buildWorkspaceMcpGuardedToolSpecs({
    profile,
    connections: [connection],
    clientFactory: () => ({
      async getTools() {
        throw new Error("connection load failed");
      },
      async close() {
        loadFailureCloseCalled = true;
      },
    }),
  });
  assert(unavailableSpecs.length === 0, "unavailable MCP connection does not collapse runtime preparation");
  assert(loadFailureCloseCalled, "unavailable MCP connection cleanup still closes the client");
}

main()
  .then(() => {
    console.log("[workspace.agent-mcp.unit] ALL MCP CHECKS PASSED");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
