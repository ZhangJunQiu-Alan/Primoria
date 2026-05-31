#!/usr/bin/env tsx

import {
  archiveWorkspaceAgentMemory,
  archiveWorkspaceAgentMemories,
  cancelWorkspaceAgentRun,
  createWorkspace,
  createWorkspaceAgentConnection,
  createWorkspaceAgentMember,
  createWorkspaceAgentProfile,
  createWorkspaceAgentMemory,
  createWorkspaceMember,
  createWorkspaceMessage,
  createWorkspaceTask,
  createWorkspaceThread,
  deleteWorkspaceAgentMemory,
  decideWorkspaceAgentApproval,
  getWorkspaceAgentRunDetail,
  listWorkspaceAgentMemories,
  getWorkspaceView,
  joinWorkspace,
  listWorkspaceAgentRuns,
  listWorkspaceMessages,
  listWorkspaceAgentTemplates,
  retryWorkspaceAgentRun,
  restoreWorkspaceAgentMemory,
  runWorkspaceAgentTask,
  runWorkspaceAgentTurn,
  seedWorkspaceAgentRunForTest,
  updateWorkspaceAgentConnection,
  updateWorkspaceThread,
  updateWorkspaceAgentProfile,
  updateWorkspaceTask,
} from "../src/lib/workspaces/store.ts";
import { buildWorkspaceAgentRunThreadId } from "../src/lib/workspaces/agent-runtime.ts";
import { WorkspaceToolApprovalRequiredError, buildWorkspaceGuardedToolSpecs } from "../src/lib/workspaces/agent-tools.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

async function main() {
  const view = await getWorkspaceView(null);
  assert(view.workspace.id, "workspace exists");
  assert(view.threads.some((thread) => thread.type === "room"), "rooms exist");
  assert(view.members.some((member) => member.displayName === "You"), "local workspace has current user");
  assert(view.messages.length === 0, "local workspace starts without mock messages");
  assert(view.tasks.length === 0, "local workspace starts without mock tasks");

  const createdWorkspace = await createWorkspace(null, {
    name: "Unit workspace",
    ownerName: "Unit Owner",
  });
  assert(createdWorkspace.workspace.name === "Unit workspace", "created workspace name");
  assert(createdWorkspace.workspace.inviteCode, "created workspace invite code");
  assert(createdWorkspace.workspaces.some((workspace) => workspace.id === view.workspace.id), "workspace list keeps seed workspace");
  assert(createdWorkspace.workspaces.some((workspace) => workspace.id === createdWorkspace.workspace.id), "workspace list includes created workspace");
  assert(createdWorkspace.threads.some((thread) => thread.type === "room"), "created workspace has room");
  assert(createdWorkspace.members.some((member) => member.displayName === "Unit Owner"), "created workspace has owner");
  assert(createdWorkspace.messages.length === 0, "created workspace starts without mock messages");

  const seedAgain = await getWorkspaceView(null, view.workspace.id);
  assert(seedAgain.workspace.id === view.workspace.id, "can switch back to seed workspace");
  const createdAgain = await getWorkspaceView(null, createdWorkspace.workspace.id);
  assert(createdAgain.workspace.id === createdWorkspace.workspace.id, "can switch to created workspace");

  const joined = await joinWorkspace(null, {
    inviteCode: createdWorkspace.workspace.inviteCode ?? "",
    displayName: "Joined User",
  });
  assert(joined.workspace.id === createdWorkspace.workspace.id, "joined workspace by invite code");
  assert(joined.members.some((member) => member.displayName === "Joined User"), "joined member appears");
  const ownerMember = joined.members.find((entry) => entry.status === "owner");
  const joinedMember = joined.members.find((entry) => entry.displayName === "Joined User");
  assert(ownerMember, "workspace owner member exists");
  assert(joinedMember, "joined member exists");

  const newThread = await createWorkspaceThread(null, {
    workspaceId: createdWorkspace.workspace.id,
    type: "room",
    name: "Unit room",
    description: "test room",
  });
  assert(newThread.type === "room", "created room thread type");
  assert(newThread.agentTriggerMode === "room_default", "created room defaults to room_default agent trigger mode");

  const newDirect = await createWorkspaceThread(null, {
    workspaceId: createdWorkspace.workspace.id,
    type: "direct",
    name: "Unit direct",
    description: "test direct",
    participantIds: [joinedMember.id],
  });
  assert(newDirect.type === "direct", "created direct thread type");
  assert(newDirect.participantIds?.includes(ownerMember.id), "created direct includes owner participant metadata");
  assert(newDirect.participantIds?.includes(joinedMember.id), "created direct includes requested participant metadata");

  const member = await createWorkspaceMember(null, {
    workspaceId: createdWorkspace.workspace.id,
    displayName: "Unit Agent",
    role: "AI teammate",
    status: "testing",
  });
  assert(member.displayName === "Unit Agent", "created member name");
  let rejectedMissingAgentProfileMember = false;
  try {
    await createWorkspaceMember(null, {
      workspaceId: createdWorkspace.workspace.id,
      displayName: "Unit Orphan Agent Member",
      role: "Agent",
      agentProfileId: "wagent_missing_member_profile",
    });
  } catch (error) {
    rejectedMissingAgentProfileMember = error instanceof Error && error.message.includes("Agent profile not found");
  }
  assert(rejectedMissingAgentProfileMember, "member creation rejects missing agent profile references before persistence");

  const templates = listWorkspaceAgentTemplates();
  assert(templates.some((template) => template.key === "socratic-coach"), "agent templates include socratic coach");
  assert(templates.some((template) => template.key === "visualizer"), "agent templates include visualizer");

  const coachProfile = await createWorkspaceAgentProfile(null, {
    workspaceId: createdWorkspace.workspace.id,
    templateKey: "socratic-coach",
    displayName: "Unit Coach",
  });
  const duplicateCoachProfile = await createWorkspaceAgentProfile(null, {
    workspaceId: createdWorkspace.workspace.id,
    templateKey: "socratic-coach",
    displayName: "Unit Coach",
  });
  assert(duplicateCoachProfile.id === coachProfile.id, "default template agents reuse the existing local workspace profile");
  const firstCoachMemberForDedupe = await createWorkspaceAgentMember(null, {
    workspaceId: createdWorkspace.workspace.id,
    profileId: coachProfile.id,
  });
  const duplicateCoachMemberForDedupe = await createWorkspaceAgentMember(null, {
    workspaceId: createdWorkspace.workspace.id,
    profileId: coachProfile.id,
  });
  assert(duplicateCoachMemberForDedupe.id === firstCoachMemberForDedupe.id, "adding the same local agent profile to a workspace is idempotent");
  assert(coachProfile.handle === "unit-coach", "agent profile derives stable handle");
  assert(coachProfile.templateKey === "socratic-coach", "agent profile records source template");
  assert(coachProfile.capabilities.some((capability) => capability.kind === "skill" && capability.path.includes("socratic")), "agent profile inherits template skill");

  const customizedCoachProfile = await updateWorkspaceAgentProfile(null, {
    workspaceId: createdWorkspace.workspace.id,
    profileId: coachProfile.id,
    displayName: "Unit Learning Guide",
    description: "Custom guide for unit tests",
    systemPrompt: "Guide the learner with concise questions and project checkpoints.",
    memoryScope: "workspace",
    capabilities: [
      { kind: "skill", source: "system", path: "/skills/project-breakdown", enabled: true },
      { kind: "internal_tool", toolName: "create_workspace_task", approval: "always", enabled: true },
      { kind: "internal_tool", toolName: "update_workspace_task", approval: "always", enabled: true },
      { kind: "internal_tool", toolName: "share_learning_app", approval: "always", enabled: true },
      { kind: "internal_tool", toolName: "save_learning_artifact", approval: "always", enabled: true },
      { kind: "internal_tool", toolName: "render_interactive_widget", approval: "always", enabled: true },
      { kind: "internal_tool", toolName: "generate_course", approval: "always", enabled: true },
      { kind: "internal_tool", toolName: "save_agent_memory", approval: "always", enabled: true },
      { kind: "internal_tool", toolName: "summarize_thread", approval: "never", enabled: false },
    ],
  });
  assert(customizedCoachProfile.id === coachProfile.id, "updated agent profile keeps identity");
  assert(customizedCoachProfile.handle === "unit-coach", "updated agent profile keeps stable handle");
  assert(customizedCoachProfile.displayName === "Unit Learning Guide", "updated agent profile changes display name");
  assert(customizedCoachProfile.memoryScope === "workspace", "updated agent profile changes memory scope");
  assert(customizedCoachProfile.capabilities.length === 9, "updated agent profile replaces capabilities");
  assert(
    customizedCoachProfile.capabilities.some((capability) => capability.kind === "internal_tool" && capability.toolName === "create_workspace_task" && capability.approval === "always"),
    "updated agent profile stores tool approval policy",
  );
  const customProfile = await createWorkspaceAgentProfile(null, {
    workspaceId: createdWorkspace.workspace.id,
    displayName: "Unit Maker",
    description: "Builds custom learning artifacts",
    systemPrompt: "Help users turn goals into concrete learning artifacts.",
    visibility: "private",
    memoryScope: "none",
    capabilities: [
      { kind: "skill", source: "workspace", path: `/workspace-skills/${createdWorkspace.workspace.id}/unit-custom-maker`, enabled: true },
      { kind: "internal_tool", toolName: "summarize_thread", approval: "never", enabled: true },
    ],
  });
  assert(!customProfile.templateKey, "custom agent profile does not require a template");
  assert(customProfile.visibility === "private", "custom agent profile keeps visibility");
  assert(customProfile.memoryScope === "none", "custom agent profile keeps memory scope");
  assert(customProfile.capabilities.some((capability) => capability.kind === "skill" && capability.source === "workspace"), "custom agent profile stores portable workspace skill");
  let rejectedSystemSkillWithWorkspacePath = false;
  try {
    await createWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      displayName: "Bad System Skill Agent",
      description: "Should not persist mismatched skill source.",
      systemPrompt: "Help only when configured.",
      capabilities: [
        { kind: "skill", source: "system", path: `/workspace-skills/${createdWorkspace.workspace.id}/wrong-source`, enabled: true },
      ],
    });
  } catch (error) {
    rejectedSystemSkillWithWorkspacePath = error instanceof Error && error.message.includes("Skill source");
  }
  assert(rejectedSystemSkillWithWorkspacePath, "agent profile rejects system skill capabilities with workspace portable paths");
  let rejectedUnknownSystemSkill = false;
  try {
    await createWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      displayName: "Bad Unknown System Skill Agent",
      description: "Should not persist system skills that are not in the supported skill pack.",
      systemPrompt: "Help only when configured.",
      capabilities: [
        { kind: "skill", source: "system", path: "/skills/not-a-real-system-skill", enabled: true },
      ],
    });
  } catch (error) {
    rejectedUnknownSystemSkill = error instanceof Error && error.message.includes("System skill not found");
  }
  assert(rejectedUnknownSystemSkill, "agent profile rejects unknown system skill capabilities before persistence");
  let rejectedUserSkillWithSystemPath = false;
  try {
    await createWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      displayName: "Bad User Skill Agent",
      description: "Should not persist system paths as user skills.",
      systemPrompt: "Help only when configured.",
      capabilities: [
        { kind: "skill", source: "user", path: "/skills/unit-custom-maker", enabled: true },
      ],
    });
  } catch (error) {
    rejectedUserSkillWithSystemPath = error instanceof Error && error.message.includes("Skill source");
  }
  assert(rejectedUserSkillWithSystemPath, "agent profile rejects user skill capabilities that are not user portable ids");
  let rejectedWorkspaceSkillWrongScope = false;
  try {
    await updateWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      profileId: customProfile.id,
      capabilities: [
        { kind: "skill", source: "workspace", path: "/workspace-skills/other_workspace/wrong-scope", enabled: true },
      ],
    });
  } catch (error) {
    rejectedWorkspaceSkillWrongScope = error instanceof Error && error.message.includes("Skill source");
  }
  assert(rejectedWorkspaceSkillWrongScope, "agent profile update rejects workspace skill paths outside the current workspace scope");
  let rejectedUnknownSystemSkillUpdate = false;
  try {
    await updateWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      profileId: customProfile.id,
      capabilities: [
        { kind: "skill", source: "system", path: "/skills/not-a-real-system-skill", enabled: true },
      ],
    });
  } catch (error) {
    rejectedUnknownSystemSkillUpdate = error instanceof Error && error.message.includes("System skill not found");
  }
  assert(rejectedUnknownSystemSkillUpdate, "agent profile update rejects unknown system skill capabilities before persistence");
  let rejectedMissingDelegateAgent = false;
  try {
    await createWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      displayName: "Missing Delegate Agent",
      description: "Should not persist delegate ids that cannot be resolved.",
      systemPrompt: "Delegate only to real agents.",
      capabilities: [
        { kind: "subagent", agentProfileId: "wagent_missing_delegate", enabled: true },
      ],
    });
  } catch (error) {
    rejectedMissingDelegateAgent = error instanceof Error && error.message.includes("Agent profile not found");
  }
  assert(rejectedMissingDelegateAgent, "agent profile rejects subagent capabilities pointing at missing profiles");
  let rejectedSelfDelegateAgent = false;
  try {
    await updateWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      profileId: customProfile.id,
      capabilities: [
        { kind: "subagent", agentProfileId: customProfile.id, enabled: true },
      ],
    });
  } catch (error) {
    rejectedSelfDelegateAgent = error instanceof Error && error.message.includes("delegate to itself");
  }
  assert(rejectedSelfDelegateAgent, "agent profile rejects self-delegating subagent capabilities");
  let rejectedUnknownInternalTool = false;
  try {
    await createWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      displayName: "Unsafe Tool Unit Agent",
      description: "Should not persist unknown tools.",
      systemPrompt: "Help only when configured.",
      capabilities: [
        { kind: "internal_tool", toolName: "run_shell_command", approval: "always", enabled: true },
      ],
    });
  } catch (error) {
    rejectedUnknownInternalTool = error instanceof Error && error.message.includes("Unknown internal tool");
  }
  assert(rejectedUnknownInternalTool, "agent profile rejects unknown internal tool capabilities before persistence");
  let rejectedUnknownInternalToolUpdate = false;
  try {
    await updateWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      profileId: customProfile.id,
      capabilities: [
        { kind: "internal_tool", toolName: "execute_code", approval: "always", enabled: true },
      ],
    });
  } catch (error) {
    rejectedUnknownInternalToolUpdate = error instanceof Error && error.message.includes("Unknown internal tool");
  }
  assert(rejectedUnknownInternalToolUpdate, "agent profile update rejects unknown internal tool capabilities before persistence");
  let rejectedAlwaysToolDowngrade = false;
  try {
    await createWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      displayName: "Downgraded Memory Agent",
      description: "Should not downgrade memory approval.",
      systemPrompt: "Help only when configured.",
      capabilities: [
        { kind: "internal_tool", toolName: "save_agent_memory", approval: "on_risk", enabled: true },
      ],
    });
  } catch (error) {
    rejectedAlwaysToolDowngrade = error instanceof Error && error.message.includes("approval");
  }
  assert(rejectedAlwaysToolDowngrade, "agent profile rejects downgrading always-approval internal tools");
  let rejectedOnRiskToolDowngrade = false;
  try {
    await updateWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      profileId: customProfile.id,
      capabilities: [
        { kind: "internal_tool", toolName: "generate_course", approval: "never", enabled: true },
      ],
    });
  } catch (error) {
    rejectedOnRiskToolDowngrade = error instanceof Error && error.message.includes("approval");
  }
  assert(rejectedOnRiskToolDowngrade, "agent profile update rejects downgrading on-risk internal tools to never");
  let rejectedMissingCustomPurpose = false;
  try {
    await createWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      displayName: "No Purpose Unit Agent",
      systemPrompt: "Help only when configured.",
      capabilities: [
        { kind: "skill", source: "system", path: "/skills/socratic-questioning", enabled: true },
      ],
    });
  } catch (error) {
    rejectedMissingCustomPurpose = error instanceof Error && error.message.includes("purpose");
  }
  assert(rejectedMissingCustomPurpose, "custom agent profile requires an explicit purpose instead of using fallback copy");
  let rejectedMissingCustomBehavior = false;
  try {
    await createWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      displayName: "No Behavior Unit Agent",
      description: "Has a purpose but no behavior.",
      capabilities: [
        { kind: "skill", source: "system", path: "/skills/socratic-questioning", enabled: true },
      ],
    });
  } catch (error) {
    rejectedMissingCustomBehavior = error instanceof Error && error.message.includes("behavior");
  }
  assert(rejectedMissingCustomBehavior, "custom agent profile requires explicit behavior instructions instead of using fallback prompt");
  let rejectedBlankCustomPurposeUpdate = false;
  try {
    await updateWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      profileId: customProfile.id,
      description: " ",
    });
  } catch (error) {
    rejectedBlankCustomPurposeUpdate = error instanceof Error && error.message.includes("purpose");
  }
  assert(rejectedBlankCustomPurposeUpdate, "agent profile update rejects blank purpose text");
  let rejectedBlankCustomBehaviorUpdate = false;
  try {
    await updateWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      profileId: customProfile.id,
      systemPrompt: " ",
    });
  } catch (error) {
    rejectedBlankCustomBehaviorUpdate = error instanceof Error && error.message.includes("behavior");
  }
  assert(rejectedBlankCustomBehaviorUpdate, "agent profile update rejects blank behavior text");
  let rejectedLongCustomPurpose = false;
  try {
    await createWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      displayName: "Long Purpose Unit Agent",
      description: "Purpose ".repeat(80),
      systemPrompt: "Help only when configured.",
      capabilities: [
        { kind: "skill", source: "system", path: "/skills/socratic-questioning", enabled: true },
      ],
    });
  } catch (error) {
    rejectedLongCustomPurpose = error instanceof Error && error.message.includes("purpose");
  }
  assert(rejectedLongCustomPurpose, "custom agent profile rejects overlong purpose text at the store layer");
  let rejectedLongCustomBehavior = false;
  try {
    await updateWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      profileId: customProfile.id,
      systemPrompt: "Behavior ".repeat(800),
    });
  } catch (error) {
    rejectedLongCustomBehavior = error instanceof Error && error.message.includes("behavior");
  }
  assert(rejectedLongCustomBehavior, "agent profile update rejects overlong behavior text at the store layer");
  let rejectedEmptyCustomAgent = false;
  try {
    await createWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      displayName: "Empty Unit Agent",
      description: "Should not be runnable without explicit capabilities.",
      systemPrompt: "Help only when configured.",
      capabilities: [],
    });
  } catch (error) {
    rejectedEmptyCustomAgent = error instanceof Error && error.message.includes("at least one");
  }
  assert(rejectedEmptyCustomAgent, "custom agent profile rejects empty capabilities instead of inventing a fake skill");
  let rejectedDisabledOnlyCustomAgent = false;
  try {
    await updateWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      profileId: customProfile.id,
      capabilities: [
        { kind: "internal_tool", toolName: "summarize_thread", approval: "never", enabled: false },
      ],
    });
  } catch (error) {
    rejectedDisabledOnlyCustomAgent = error instanceof Error && error.message.includes("at least one");
  }
  assert(rejectedDisabledOnlyCustomAgent, "agent profile update rejects disabled-only capabilities");

  const workspaceConnection = await createWorkspaceAgentConnection(null, {
    workspaceId: createdWorkspace.workspace.id,
    scope: "workspace",
    displayName: "Local Learning Search",
    transport: "http",
    configRef: "connection://local-learning-search",
    allowedToolNames: ["search_sources", "search_sources"],
  });
  assert(workspaceConnection.allowedToolNames.length === 1, "workspace connection normalizes duplicate tool names");
  const disabledWorkspaceConnection = await updateWorkspaceAgentConnection(null, {
    workspaceId: createdWorkspace.workspace.id,
    connectionId: workspaceConnection.id,
    status: "disabled",
  });
  assert(disabledWorkspaceConnection.status === "disabled", "workspace connection can be disabled without deleting history");
  let rejectedDisabledConnectionCapability = false;
  try {
    await createWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      displayName: "Disabled Connected Researcher",
      description: "Should not use disabled connections.",
      systemPrompt: "Do research.",
      capabilities: [
        { kind: "mcp_tool", connectionId: workspaceConnection.id, toolName: "search_sources", approval: "always", enabled: true },
      ],
    });
  } catch (error) {
    rejectedDisabledConnectionCapability = error instanceof Error && error.message.includes("not found");
  }
  assert(rejectedDisabledConnectionCapability, "disabled workspace connections cannot be allowlisted by new agent profiles");
  const reenabledWorkspaceConnection = await updateWorkspaceAgentConnection(null, {
    workspaceId: createdWorkspace.workspace.id,
    connectionId: workspaceConnection.id,
    status: "available",
  });
  assert(reenabledWorkspaceConnection.status === "available", "disabled workspace connection can be re-enabled from the registry");
  const mcpProfile = await createWorkspaceAgentProfile(null, {
    workspaceId: createdWorkspace.workspace.id,
    displayName: "Connected Researcher",
    description: "Uses an approved connection after explicit allowlisting.",
    systemPrompt: "Use connected tools only when the user asks for sourced research.",
    memoryScope: "thread",
    capabilities: [
      { kind: "mcp_tool", connectionId: workspaceConnection.id, toolName: "search_sources", approval: "always", enabled: true },
    ],
  });
  assert(
    mcpProfile.capabilities.some((capability) => capability.kind === "mcp_tool" && capability.connectionId === workspaceConnection.id && capability.approval === "always"),
    "agent profile can allowlist a real workspace connection tool",
  );
  let rejectedConnectionApprovalDowngrade = false;
  try {
    await createWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      displayName: "Unsafe Connected Researcher",
      description: "Should not use external tools without approval.",
      systemPrompt: "Do research.",
      capabilities: [
        { kind: "mcp_tool", connectionId: workspaceConnection.id, toolName: "search_sources", approval: "never", enabled: true },
      ],
    });
  } catch (error) {
    rejectedConnectionApprovalDowngrade = error instanceof Error && error.message.includes("approval");
  }
  assert(rejectedConnectionApprovalDowngrade, "agent profile rejects external connection tools without always approval");
  let rejectedUnknownConnectionTool = false;
  try {
    await createWorkspaceAgentProfile(null, {
      workspaceId: createdWorkspace.workspace.id,
      displayName: "Bad Connected Researcher",
      description: "Should not persist an unallowlisted connection tool.",
      systemPrompt: "Do research.",
      capabilities: [
        { kind: "mcp_tool", connectionId: workspaceConnection.id, toolName: "write_sources", approval: "always", enabled: true },
      ],
    });
  } catch (error) {
    rejectedUnknownConnectionTool = error instanceof Error && error.message.includes("not allowed");
  }
  assert(rejectedUnknownConnectionTool, "agent profile rejects mcp_tool capabilities not allowlisted by the connection");

  const secondWorkspace = await createWorkspace(null, {
    name: "Unit second workspace",
    ownerName: "Unit Owner",
  });
  const secondWorkspaceView = await getWorkspaceView(null, secondWorkspace.workspace.id);
  assert(
    secondWorkspaceView.agentProfiles.some((profile) => profile.id === customProfile.id && profile.workspaceId === createdWorkspace.workspace.id && profile.visibility === "private"),
    "personal agent profile appears in owner's saved-agent library across local workspaces",
  );
  const reusedPersonalAgent = await createWorkspaceAgentMember(null, {
    workspaceId: secondWorkspace.workspace.id,
    profileId: customProfile.id,
  });
  assert(reusedPersonalAgent.agentProfileId === customProfile.id, "saved personal agent can be added to another local workspace without cloning");
  const renamedPersonalAgentFromSecondWorkspace = await updateWorkspaceAgentProfile(null, {
    workspaceId: secondWorkspace.workspace.id,
    profileId: customProfile.id,
    displayName: "Unit Maker Everywhere",
    description: "Edited from a second workspace.",
    capabilities: customProfile.capabilities.map((capability) => {
      if (capability.kind === "skill") return { kind: "skill", source: capability.source, path: capability.path, enabled: capability.enabled };
      if (capability.kind === "internal_tool") return { kind: "internal_tool", toolName: capability.toolName, approval: capability.approval, enabled: capability.enabled };
      if (capability.kind === "mcp_tool") return { kind: "mcp_tool", connectionId: capability.connectionId, toolName: capability.toolName, approval: capability.approval, enabled: capability.enabled };
      return { kind: "subagent", agentProfileId: capability.agentProfileId, enabled: capability.enabled };
    }),
  });
  assert(renamedPersonalAgentFromSecondWorkspace.displayName === "Unit Maker Everywhere", "personal agent can be edited from another local workspace");
  const secondWorkspaceAfterAgent = await getWorkspaceView(null, secondWorkspace.workspace.id);
  assert(
    secondWorkspaceAfterAgent.members.some((member) => member.id === reusedPersonalAgent.id && member.agentProfileId === customProfile.id && member.displayName === "Unit Maker Everywhere"),
    "second local workspace updates reused personal agent member name after cross-workspace edit",
  );
  const originalWorkspaceAfterPersonalEdit = await getWorkspaceView(null, createdWorkspace.workspace.id);
  assert(
    originalWorkspaceAfterPersonalEdit.agentProfiles.some((profile) => profile.id === customProfile.id && profile.displayName === "Unit Maker Everywhere"),
    "cross-workspace personal agent edit persists to the original local profile record",
  );

  const delegatedCoachProfile = await updateWorkspaceAgentProfile(null, {
    workspaceId: createdWorkspace.workspace.id,
    profileId: customizedCoachProfile.id,
    displayName: "Unit Learning Guide",
    description: "Custom guide for unit tests",
    systemPrompt: "Guide the learner with concise questions and project checkpoints.",
    memoryScope: "workspace",
    capabilities: [
      { kind: "skill", source: "system", path: "/skills/project-breakdown", enabled: true },
      { kind: "internal_tool", toolName: "create_workspace_task", approval: "always", enabled: true },
      { kind: "internal_tool", toolName: "update_workspace_task", approval: "always", enabled: true },
      { kind: "internal_tool", toolName: "share_learning_app", approval: "always", enabled: true },
      { kind: "internal_tool", toolName: "save_learning_artifact", approval: "always", enabled: true },
      { kind: "internal_tool", toolName: "render_interactive_widget", approval: "always", enabled: true },
      { kind: "internal_tool", toolName: "generate_course", approval: "always", enabled: true },
      { kind: "internal_tool", toolName: "save_agent_memory", approval: "always", enabled: true },
      { kind: "internal_tool", toolName: "summarize_thread", approval: "never", enabled: false },
      { kind: "subagent", agentProfileId: customProfile.id, enabled: true },
    ],
  });
  assert(
    delegatedCoachProfile.capabilities.some((capability) => capability.kind === "subagent" && capability.agentProfileId === customProfile.id && capability.enabled),
    "updated agent profile stores delegate subagent capability",
  );
  const delegatedProfileView = await getWorkspaceView(null, createdWorkspace.workspace.id);
  assert(
    delegatedProfileView.agentProfiles.some(
      (profile) =>
        profile.id === customizedCoachProfile.id &&
        profile.capabilities.some((capability) => capability.kind === "subagent" && capability.agentProfileId === customProfile.id && capability.enabled),
    ),
    "workspace view persists delegate subagent capability",
  );

  const coachMember = await createWorkspaceAgentMember(null, {
    workspaceId: createdWorkspace.workspace.id,
    profileId: delegatedCoachProfile.id,
  });
  assert(coachMember.role === "Agent", "profile-backed agent member has agent role");
  assert(coachMember.agentProfileId === delegatedCoachProfile.id, "agent member references profile");
  const researcherMember = await createWorkspaceAgentMember(null, {
    workspaceId: createdWorkspace.workspace.id,
    profileId: mcpProfile.id,
  });
  assert(researcherMember.agentProfileId === mcpProfile.id, "second profile-backed agent member references profile");

  const threadMemory = await createWorkspaceAgentMemory(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    agentProfileId: delegatedCoachProfile.id,
    scope: "thread",
    title: "Learner prefers hints",
    summary: "The learner wants guiding hints before full worked solutions.",
  });
  assert(threadMemory.scope === "thread", "thread memory keeps explicit scope");
  assert(threadMemory.threadId === newThread.id, "thread memory links to source thread");
  assert(threadMemory.agentProfileId === delegatedCoachProfile.id, "thread memory links to agent profile");

  const workspaceMemory = await createWorkspaceAgentMemory(null, {
    workspaceId: createdWorkspace.workspace.id,
    agentProfileId: delegatedCoachProfile.id,
    scope: "workspace",
    title: "Project goal",
    summary: "The workspace is building a compact calculus review plan.",
  });
  assert(!workspaceMemory.threadId, "workspace memory is not forced into one thread");

  const message = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "workspace unit test message",
    senderName: "Test User",
  });
  assert(message.content === "workspace unit test message", "created message content");
  assert(message.threadId === newThread.id, "created message thread");

  const agentTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    message: {
      ...message,
      content: "@Unit Agent please summarize the workspace unit test message?",
    },
  });
  assert(agentTurn.messages.length === 1, "agent mention creates one agent response");
  assert(agentTurn.messages[0].senderKind === "agent", "agent response sender kind");
  assert(agentTurn.messages[0].senderName === "Unit Agent", "agent response sender name");

  const coachDirect = await createWorkspaceThread(null, {
    workspaceId: createdWorkspace.workspace.id,
    type: "direct",
    name: "Unit Learning Guide DM",
    description: "private agent chat",
    participantIds: [coachMember.id],
  });
  const directAgentMessage = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: coachDirect.id,
    content: "Help me reason about derivatives without a mention.",
    senderName: "Test User",
  });
  const directAgentTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: coachDirect.id,
    message: directAgentMessage,
  });
  assert(directAgentTurn.messages.length === 1, "direct chat with an agent auto-runs the agent without mention");
  assert(directAgentTurn.messages[0].senderName === "Unit Learning Guide", "direct agent chat responds as the agent");
  assert(directAgentTurn.runs.length === 1, "direct agent chat creates a run");
  assert(directAgentTurn.runs[0].trigger === "direct_chat", "direct agent chat records direct_chat trigger");
  assert(directAgentTurn.runs[0].inputMessageId === directAgentMessage.id, "direct agent chat links the human input message");
  assert(directAgentTurn.runs[0].outputMessageId === directAgentTurn.messages[0].id, "direct agent chat links the agent output message");
  assert(directAgentTurn.events.some((event) => event.type === "status" && event.label === "completed"), "direct agent chat records completion event");

  const portableWorkspaceSkillPath = `/workspace-skills/${createdWorkspace.workspace.id}/unit-peer-review`;
  const portableSkillProfile = await createWorkspaceAgentProfile(null, {
    workspaceId: createdWorkspace.workspace.id,
    displayName: "Unit Skill Composer",
    description: "Uses a custom workspace skill when preparing a run.",
    systemPrompt: "Use the custom workspace skill when it is available.",
    memoryScope: "thread",
    capabilities: [
      { kind: "skill", source: "workspace", path: portableWorkspaceSkillPath, enabled: true },
    ],
  });
  const portableSkillMember = await createWorkspaceAgentMember(null, {
    workspaceId: createdWorkspace.workspace.id,
    profileId: portableSkillProfile.id,
  });
  const portableSkillDirect = await createWorkspaceThread(null, {
    workspaceId: createdWorkspace.workspace.id,
    type: "direct",
    name: "Unit Skill Composer DM",
    participantIds: [portableSkillMember.id],
  });
  const portableSkillMessage = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: portableSkillDirect.id,
    content: "Use the custom review skill.",
    senderName: "Test User",
  });
  const portableSkillTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: portableSkillDirect.id,
    message: portableSkillMessage,
    runner: async (runtimeInput) => {
      assert(runtimeInput.config.skills.includes(portableWorkspaceSkillPath), "workspace portable skill reaches runtime config");
      return {
        content: "Custom workspace skill was available.",
        events: [
          {
            type: "status",
            label: "runtime_configured",
            payload: { skills: runtimeInput.config.skills },
          },
        ],
      };
    },
  });
  assert(portableSkillTurn.messages[0].content === "Custom workspace skill was available.", "portable skill agent run uses custom runner output");
  assert(
    portableSkillTurn.events.some((event) => event.label === "runtime_configured" && Array.isArray(asRecord(event.payload).skills)),
    "portable skill agent run persists runtime skill configuration event",
  );

  const coachMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "@Unit Learning Guide help me think through this without giving the answer",
    senderName: "Test User",
  });
  const coachTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    message: coachMention,
  });
  assert(coachTurn.messages.length === 1, "profile-backed agent mention creates a response");
  assert(coachTurn.runs.length === 1, "profile-backed agent mention creates a run");
  assert(coachTurn.events.some((event) => event.type === "status" && event.label === "completed"), "profile-backed agent mention records completion event");
  assert(coachTurn.events.some((event) => event.type === "status" && event.label === "runtime_configured"), "profile-backed agent mention records runtime event");
  assert(coachTurn.runs[0].agentProfileId === customizedCoachProfile.id, "profile-backed run references agent profile");
  assert(coachTurn.runs[0].inputMessageId === coachMention.id, "profile-backed run references input message");
  assert(coachTurn.runs[0].outputMessageId === coachTurn.messages[0].id, "profile-backed run references output message");
  const afterCoachRunMemoryView = await getWorkspaceView(null, createdWorkspace.workspace.id);
  assert(
    afterCoachRunMemoryView.agentMemories.some(
      (memory) => memory.sourceRunId === coachTurn.runs[0].id && memory.scope === "workspace" && memory.sourceMessageId === coachTurn.messages[0].id,
    ),
    "completed workspace-scope agent run automatically creates a reviewable run summary memory",
  );
  const userMemoryProfile = await createWorkspaceAgentProfile(null, {
    workspaceId: createdWorkspace.workspace.id,
    displayName: "Unit Personal Memory Agent",
    description: "Keeps private preferences explicit and reviewed.",
    systemPrompt: "Help with learning preferences, but do not auto-write private user memory.",
    visibility: "private",
    memoryScope: "user",
    capabilities: customProfile.capabilities.map((capability) => {
      if (capability.kind === "skill") return { kind: "skill", source: capability.source, path: capability.path, enabled: capability.enabled };
      if (capability.kind === "internal_tool") return { kind: "internal_tool", toolName: capability.toolName, approval: capability.approval, enabled: capability.enabled };
      if (capability.kind === "mcp_tool") return { kind: "mcp_tool", connectionId: capability.connectionId, toolName: capability.toolName, approval: capability.approval, enabled: capability.enabled };
      return { kind: "subagent", agentProfileId: capability.agentProfileId, enabled: capability.enabled };
    }),
  });
  const userMemoryAgent = await createWorkspaceAgentMember(null, {
    workspaceId: createdWorkspace.workspace.id,
    profileId: userMemoryProfile.id,
  });
  const userMemoryDirect = await createWorkspaceThread(null, {
    workspaceId: createdWorkspace.workspace.id,
    type: "direct",
    name: "Unit Personal Memory Agent DM",
    participantIds: [userMemoryAgent.id],
  });
  const userMemoryMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: userMemoryDirect.id,
    content: "Remember this privately only when I approve it.",
    senderName: "Test User",
  });
  const userMemoryTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: userMemoryDirect.id,
    message: userMemoryMention,
    runner: async () => ({ content: "I can use private context, but I will not save it automatically." }),
  });
  assert(userMemoryAgent.agentProfileId === userMemoryProfile.id, "user-scope memory agent member references profile");
  assert(userMemoryTurn.runs[0].agentProfileId === userMemoryProfile.id, "user-scope memory run references profile");
  assert(userMemoryTurn.memories?.length === 0, "completed user-scope agent run returns no automatic memory for client merge");
  const afterUserMemoryRunView = await getWorkspaceView(null, createdWorkspace.workspace.id);
  assert(!afterUserMemoryRunView.agentMemories.some((memory) => memory.sourceRunId === userMemoryTurn.runs[0].id), "completed user-scope agent run does not auto-write workspace-visible memory");
  const coachStartedEvent = coachTurn.events.find((event) => event.type === "status" && event.label === "started");
  assert(coachStartedEvent, "profile-backed agent mention records started event");
  assert(
    typeof coachStartedEvent.payload === "object" &&
      coachStartedEvent.payload !== null &&
      "deepAgentThreadId" in coachStartedEvent.payload &&
      coachStartedEvent.payload.deepAgentThreadId ===
        buildWorkspaceAgentRunThreadId({
          workspaceId: createdWorkspace.workspace.id,
          threadId: newThread.id,
          agentProfileId: customizedCoachProfile.id,
          runId: coachTurn.runs[0].id,
        }),
    "started event records resumable DeepAgent thread id",
  );
  assert(
    typeof coachStartedEvent.payload === "object" &&
      coachStartedEvent.payload !== null &&
      "triggerDecision" in coachStartedEvent.payload &&
      typeof coachStartedEvent.payload.triggerDecision === "object" &&
      coachStartedEvent.payload.triggerDecision !== null &&
      "reason" in coachStartedEvent.payload.triggerDecision &&
      coachStartedEvent.payload.triggerDecision.reason === "mention",
    "started event records trigger decision reason",
  );
  const coachStartedPayload = asRecord(coachStartedEvent.payload);
  const coachProfileSnapshot = asRecord(coachStartedPayload.agentProfileSnapshot);
  assert(coachProfileSnapshot.displayName === "Unit Learning Guide", "started event snapshots profile display name for historical audit");
  assert(coachProfileSnapshot.handle === customizedCoachProfile.handle, "started event snapshots profile handle for historical audit");
  assert(coachProfileSnapshot.memoryScope === "workspace", "started event snapshots profile memory scope for historical audit");
  const coachSnapshotCapabilities = Array.isArray(coachProfileSnapshot.capabilities) ? coachProfileSnapshot.capabilities : [];
  assert(
    coachSnapshotCapabilities.some((capability) => asRecord(capability).kind === "internal_tool" && asRecord(capability).toolName === "create_workspace_task"),
    "started event snapshots enabled profile capabilities for historical audit",
  );
  assert(coachTurn.messages[0].senderName === "Unit Learning Guide", "profile-backed agent responds with profile name");
  assert(coachTurn.messages[0].content.includes("Custom guide for unit tests"), "profile-backed agent response uses customized identity");

  const coordinatorMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "@agents who should help me plan this next?",
    senderName: "Test User",
  });
  const coordinatorTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    message: coordinatorMention,
  });
  assert(coordinatorTurn.runs.length >= 1, "generic agent mention creates a coordinator-selected run");
  assert(coordinatorTurn.runs.every((run) => run.trigger === "coordinator"), "generic agent mention records coordinator trigger");
  assert(
    coordinatorTurn.events.some((event) => {
      if (event.type !== "status" || event.label !== "started" || typeof event.payload !== "object" || event.payload === null || !("triggerDecision" in event.payload)) return false;
      const decision = event.payload.triggerDecision;
      return typeof decision === "object" && decision !== null && "reason" in decision && decision.reason === "coordinator";
    }),
    "coordinator started event records coordinator trigger decision",
  );

  const mentionOnlyRoom = await createWorkspaceThread(null, {
    workspaceId: createdWorkspace.workspace.id,
    type: "room",
    name: "Mention-only agent room",
    description: "agents only answer direct mentions",
    agentTriggerMode: "mention_only",
  });
  assert(mentionOnlyRoom.agentTriggerMode === "mention_only", "mention-only room persists agent trigger mode");
  const mentionOnlyGeneric = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: mentionOnlyRoom.id,
    content: "@agents stay quiet unless I name someone",
    senderName: "Test User",
  });
  const mentionOnlyGenericTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: mentionOnlyRoom.id,
    message: mentionOnlyGeneric,
  });
  assert(mentionOnlyGenericTurn.runs.length === 0, "mention-only room suppresses generic coordinator agent triggers");
  const mentionOnlyNamed = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: mentionOnlyRoom.id,
    content: "@Unit Learning Guide named mentions still work",
    senderName: "Test User",
  });
  const mentionOnlyNamedTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: mentionOnlyRoom.id,
    message: mentionOnlyNamed,
  });
  assert(mentionOnlyNamedTurn.runs.length === 1, "mention-only room still runs explicitly named agents");
  assert(mentionOnlyNamedTurn.runs[0].trigger === "mention", "mention-only named agent run keeps mention trigger");

  const quietReviewRoom = await createWorkspaceThread(null, {
    workspaceId: createdWorkspace.workspace.id,
    type: "room",
    name: "Quiet review agent room",
    description: "agents do not post into chat automatically",
    agentTriggerMode: "quiet_review",
  });
  assert(quietReviewRoom.agentTriggerMode === "quiet_review", "quiet review room persists agent trigger mode");
  const quietReviewMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: quietReviewRoom.id,
    content: "@Unit Learning Guide do not auto-post in this room",
    senderName: "Test User",
  });
  const quietReviewTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: quietReviewRoom.id,
    message: quietReviewMention,
  });
  assert(quietReviewTurn.runs.length === 0, "quiet review room suppresses chat auto-runs even for named mentions");

  const editableModeRoom = await createWorkspaceThread(null, {
    workspaceId: createdWorkspace.workspace.id,
    type: "room",
    name: "Editable agent mode room",
    description: "agent mode can change after creation",
    agentTriggerMode: "room_default",
  });
  const updatedModeRoom = await updateWorkspaceThread(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: editableModeRoom.id,
    agentTriggerMode: "mention_only",
  });
  assert(updatedModeRoom.agentTriggerMode === "mention_only", "room agent trigger mode can be edited after creation");
  const updatedModeView = await getWorkspaceView(null, createdWorkspace.workspace.id);
  assert(
    updatedModeView.threads.some((thread) => thread.id === editableModeRoom.id && thread.agentTriggerMode === "mention_only"),
    "edited room agent trigger mode appears in workspace view",
  );
  const editedRoomGeneric = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: editableModeRoom.id,
    content: "@agents edited mode should suppress coordinator",
    senderName: "Test User",
  });
  const editedRoomGenericTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: editableModeRoom.id,
    message: editedRoomGeneric,
  });
  assert(editedRoomGenericTurn.runs.length === 0, "edited mention-only room suppresses generic coordinator triggers");

  const allowlistedRoom = await createWorkspaceThread(null, {
    workspaceId: createdWorkspace.workspace.id,
    type: "room",
    name: "Allowlisted agent room",
    description: "only selected agents can answer",
    agentTriggerMode: "room_default",
    allowedAgentProfileIds: [delegatedCoachProfile.id],
  });
  assert(allowlistedRoom.allowedAgentProfileIds?.[0] === delegatedCoachProfile.id, "room stores allowed agent profile ids");
  const blockedResearcherMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: allowlistedRoom.id,
    content: "@Connected Researcher should not answer in this room",
    senderName: "Test User",
  });
  const blockedResearcherTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: allowlistedRoom.id,
    message: blockedResearcherMention,
  });
  assert(blockedResearcherTurn.runs.length === 0, "room agent allowlist suppresses named agents outside the allowlist");
  let rejectedUnknownAllowedAgent = false;
  try {
    await createWorkspaceThread(null, {
      workspaceId: createdWorkspace.workspace.id,
      type: "room",
      name: "Invalid agent allowlist room",
      allowedAgentProfileIds: ["wagent_missing_profile"],
    });
  } catch (error) {
    rejectedUnknownAllowedAgent = error instanceof Error && error.message.includes("Allowed agent");
  }
  assert(rejectedUnknownAllowedAgent, "room agent allowlist rejects profiles that are not workspace agent members");
  const allowedCoachMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: allowlistedRoom.id,
    content: "@Unit Learning Guide you are allowed here",
    senderName: "Test User",
  });
  const allowedCoachTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: allowlistedRoom.id,
    message: allowedCoachMention,
  });
  assert(allowedCoachTurn.runs.length === 1, "room agent allowlist keeps selected named agents active");
  assert(allowedCoachTurn.runs[0].agentProfileId === delegatedCoachProfile.id, "allowlisted room runs the selected agent profile");
  const updatedAllowlistedRoom = await updateWorkspaceThread(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: allowlistedRoom.id,
    allowedAgentProfileIds: [mcpProfile.id],
  });
  assert(updatedAllowlistedRoom.allowedAgentProfileIds?.[0] === mcpProfile.id, "room agent allowlist can be edited");
  let rejectedUnknownAllowedAgentUpdate = false;
  try {
    await updateWorkspaceThread(null, {
      workspaceId: createdWorkspace.workspace.id,
      threadId: allowlistedRoom.id,
      allowedAgentProfileIds: ["wagent_missing_profile"],
    });
  } catch (error) {
    rejectedUnknownAllowedAgentUpdate = error instanceof Error && error.message.includes("Allowed agent");
  }
  assert(rejectedUnknownAllowedAgentUpdate, "room agent allowlist update rejects profiles that are not workspace agent members");
  const allowedResearcherMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: allowlistedRoom.id,
    content: "@Connected Researcher you are allowed after the edit",
    senderName: "Test User",
  });
  const allowedResearcherTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: allowlistedRoom.id,
    message: allowedResearcherMention,
  });
  assert(allowedResearcherTurn.runs.length === 1, "edited room agent allowlist activates the newly selected agent");
  assert(allowedResearcherTurn.runs[0].agentProfileId === mcpProfile.id, "edited allowlisted room runs the newly selected profile");
  const disabledAgentsRoom = await updateWorkspaceThread(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: allowlistedRoom.id,
    allowedAgentProfileIds: [],
  });
  assert(Array.isArray(disabledAgentsRoom.allowedAgentProfileIds) && disabledAgentsRoom.allowedAgentProfileIds.length === 0, "room agent allowlist can be emptied to disable all room agents");
  const disabledAgentMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: allowlistedRoom.id,
    content: "@Connected Researcher no agents are allowed now",
    senderName: "Test User",
  });
  const disabledAgentTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: allowlistedRoom.id,
    message: disabledAgentMention,
  });
  assert(disabledAgentTurn.runs.length === 0, "empty room agent allowlist suppresses all named agent triggers");

  const failingMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "@Unit Learning Guide try the failing runtime",
    senderName: "Test User",
  });
  const failedTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    message: failingMention,
    runner: async () => ({
      content: "partial runtime output",
      error: "runtime unavailable",
      events: [{ type: "status", label: "deepagent_failed", payload: { error: "runtime unavailable" } }],
    }),
  });
  assert(failedTurn.runs.length === 1, "failed runtime still creates an agent run");
  assert(failedTurn.runs[0].status === "failed", "failed runtime persists failed run status");
  assert(failedTurn.runs[0].error === "runtime unavailable", "failed runtime persists error");
  assert(failedTurn.events.some((event) => event.label === "deepagent_failed"), "failed runtime persists failure event");
  assert(failedTurn.messages[0].content.includes("could not finish"), "failed runtime creates visible failure message");
  const retriedFailedTurn = await retryWorkspaceAgentRun(null, {
    workspaceId: createdWorkspace.workspace.id,
    runId: failedTurn.runs[0].id,
    runner: async () => ({
      content: "Retry completed with a better explanation.",
      events: [{ type: "status", label: "retry_runtime_called", payload: { sourceRunId: failedTurn.runs[0].id } }],
    }),
  });
  assert(retriedFailedTurn.runs.length === 1, "retry failed run creates a new run");
  assert(retriedFailedTurn.runs[0].id !== failedTurn.runs[0].id, "retry creates a new run id");
  assert(retriedFailedTurn.runs[0].status === "completed", "retry failed run can complete");
  assert(retriedFailedTurn.runs[0].inputMessageId === failingMention.id, "retry failed run reuses original input message");
  assert(retriedFailedTurn.runs[0].trigger === failedTurn.runs[0].trigger, "retry failed run preserves trigger kind");
  assert(retriedFailedTurn.messages[0].content.includes("Retry completed"), "retry failed run writes new output message");
  assert(retriedFailedTurn.events.some((event) => event.label === "retried"), "retry records source run event");
  assert(retriedFailedTurn.memories?.some((memory) => memory.sourceRunId === retriedFailedTurn.runs[0].id), "retry completed run returns reviewable memory for client merge");

  const approvalMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "@Unit Learning Guide create a worksheet for this",
    senderName: "Test User",
  });
  const approvalTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    message: approvalMention,
    runner: async () => ({
      content: "",
      status: "waiting_for_approval",
      events: [{ type: "approval_request", label: "create_workspace_task", payload: { title: "Worksheet" } }],
    }),
  });
  assert(approvalTurn.runs[0].status === "waiting_for_approval", "approval request persists waiting run status");
  assert(!approvalTurn.runs[0].error, "approval request is not persisted as an error");
  assert(approvalTurn.events.some((event) => event.type === "approval_request"), "approval request persists approval event");
  assert(approvalTurn.messages[0].content.includes("waiting for approval"), "approval request creates visible waiting message");
  assert(approvalTurn.approvals?.length === 1, "approval request creates a durable pending approval");
  assert(approvalTurn.approvals?.[0]?.status === "pending", "approval request starts pending");
  assert(approvalTurn.approvals?.[0]?.toolName === "create_workspace_task", "approval records requested tool");

  const hitlMetadataMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "@Unit Learning Guide create a HITL worksheet",
    senderName: "Test User",
  });
  const hitlMetadataTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    message: hitlMetadataMention,
    runner: async () => ({
      content: "",
      status: "waiting_for_approval",
      events: [
        {
          type: "approval_request",
          label: "create_workspace_task",
          payload: {
            input: { title: "HITL worksheet" },
            policy: { visibleLabel: "Create task", risk: "write" },
            reviewConfig: { actionName: "create_workspace_task", allowedDecisions: ["approve", "reject"] },
            actionDescription: "Create task requires workspace approval before changing workspace state.",
            deepAgentThreadId: "workspace:test:thread:test:agent:test:run:hitl",
          },
        },
      ],
    }),
  });
  const hitlApproval = hitlMetadataTurn.approvals?.[0];
  assert((hitlApproval?.policy as any).reviewConfig.allowedDecisions.join(",") === "approve,reject", "persisted HITL approval keeps reviewConfig for DeepAgent resume audit");
  assert((hitlApproval?.policy as any).actionDescription.includes("requires workspace approval"), "persisted HITL approval keeps action description for review UI");
  assert((hitlApproval?.input as any).title === "HITL worksheet", "persisted HITL approval keeps only tool args as input");
  assert(!("reviewConfig" in ((hitlApproval?.input as any) ?? {})), "HITL review metadata is not mixed into tool input args");

  const approvalView = await getWorkspaceView(null, createdWorkspace.workspace.id);
  assert(approvalView.agentApprovals.some((approval) => approval.id === approvalTurn.approvals?.[0]?.id), "pending approval appears in workspace view");
  const deniedApproval = await decideWorkspaceAgentApproval(null, {
    workspaceId: createdWorkspace.workspace.id,
    approvalId: approvalTurn.approvals?.[0]?.id ?? "",
    decision: "denied",
    decidedBy: "Unit Owner",
    reason: "Unit test denial",
  });
  assert(deniedApproval.approval.status === "denied", "approval decision persists denied status");
  assert(deniedApproval.run.status === "cancelled", "denied approval cancels waiting run");
  assert(deniedApproval.events.some((event) => event.label === "approval_denied"), "approval decision records audit event");
  const deniedDecisionEvent = deniedApproval.events.find((event) => event.label === "approval_denied");
  assert((deniedDecisionEvent?.payload as any).resumeDecision.type === "reject", "denied approval decision event records DeepAgent reject resume decision");
  assert((deniedDecisionEvent?.payload as any).resumeDecision.message === "Unit test denial", "denied approval decision event keeps reviewer feedback for DeepAgent resume");
  assert((deniedDecisionEvent?.payload as any).deepAgentThreadId, "denied approval decision event records resume thread id");
  const repeatedDeniedApproval = await decideWorkspaceAgentApproval(null, {
    workspaceId: createdWorkspace.workspace.id,
    approvalId: approvalTurn.approvals?.[0]?.id ?? "",
    decision: "denied",
    decidedBy: "Unit Owner",
  });
  assert(repeatedDeniedApproval.approval.status === "denied", "repeating the same approval decision is idempotent");
  assert(repeatedDeniedApproval.events.length === 0, "repeating the same approval decision does not create duplicate audit events");
  const flippedDeniedApproval = await decideWorkspaceAgentApproval(null, {
    workspaceId: createdWorkspace.workspace.id,
    approvalId: approvalTurn.approvals?.[0]?.id ?? "",
    decision: "approved",
    decidedBy: "Unit Owner",
  }).catch((error) => error);
  assert(flippedDeniedApproval instanceof Error && flippedDeniedApproval.message.includes("already denied"), "decided approvals cannot be flipped to the opposite decision");

  const externalApprovalMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "@Unit Learning Guide search approved external sources",
    senderName: "Test User",
  });
  const externalApprovalTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    message: externalApprovalMention,
    runner: async (runtimeInput) => ({
      content: "",
      status: "waiting_for_approval",
      events: [
        {
          type: "approval_request",
          label: "mcp_conn_sources_search_sources",
          payload: {
            input: { query: "derivative intuition" },
            policy: {
              toolName: "mcp_conn_sources_search_sources",
              visibleLabel: "Source Search: search_sources",
              risk: "external",
              approval: "always",
            },
            deepAgentThreadId: runtimeInput.threadId,
          },
        },
      ],
    }),
  });
  const approvedExternal = await decideWorkspaceAgentApproval(null, {
    workspaceId: createdWorkspace.workspace.id,
    approvalId: externalApprovalTurn.approvals?.[0]?.id ?? "",
    decision: "approved",
    decidedBy: "Unit Owner",
  });
  assert(approvedExternal.approval.status === "approved", "external tool approval persists approved status");
  assert(approvedExternal.run.status === "waiting_for_approval", "approved external tool waits for DeepAgent resume instead of pretending to complete");
  const externalResumeEvent = approvedExternal.events.find((event) => event.label === "deepagent_resume_required");
  assert(externalResumeEvent, "approved external tool records a visible DeepAgent resume-required audit event");
  assert((externalResumeEvent?.payload as any).deepAgentThreadId, "external resume-required event records resume thread id");
  assert((externalResumeEvent?.payload as any).resumeDecision.type === "approve", "external resume-required event records approve resume decision");

  const externalResumeMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "@Unit Learning Guide resume an approved external source search",
    senderName: "Test User",
  });
  const externalResumeTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    message: externalResumeMention,
    runner: async (runtimeInput) => ({
      content: "",
      status: "waiting_for_approval",
      events: [
        {
          type: "approval_request",
          label: "mcp_conn_sources_search_sources",
          payload: {
            input: { query: "chain rule visual proof" },
            policy: {
              toolName: "mcp_conn_sources_search_sources",
              visibleLabel: "Source Search: search_sources",
              risk: "external",
              approval: "always",
            },
            deepAgentThreadId: runtimeInput.threadId,
          },
        },
      ],
    }),
  });
  const externalResumeApproval = externalResumeTurn.approvals?.[0];
  let resumeRunnerCalled = false;
  const resumedExternal = await decideWorkspaceAgentApproval(null, {
    workspaceId: createdWorkspace.workspace.id,
    approvalId: externalResumeApproval?.id ?? "",
    decision: "approved",
    decidedBy: "Unit Owner",
    runner: async (runtimeInput) => {
      resumeRunnerCalled = true;
      assert(runtimeInput.threadId === externalResumeApproval?.deepAgentThreadId, "external resume reuses persisted DeepAgent thread id");
      assert((runtimeInput.resumeCommand as any)?.resume?.decisions?.[0]?.type === "approve", "external resume sends approve decision to DeepAgent");
      return {
        content: "External source result is ready.",
        status: "completed",
        events: [{ type: "status", label: "deepagent_resumed", payload: { deepAgentThreadId: runtimeInput.threadId } }],
      };
    },
  });
  assert(resumeRunnerCalled, "approved external tool resumes through injected runner");
  assert(resumedExternal.run.status === "completed", "approved external tool completes after successful DeepAgent resume");
  assert(resumedExternal.message?.content === "External source result is ready.", "approved external resume persists the agent follow-up message");
  assert(resumedExternal.events.some((event) => event.label === "deepagent_resumed"), "approved external resume records resume event");
  assert(!resumedExternal.events.some((event) => event.label === "deepagent_resume_required"), "successful external resume does not ask for manual resume fallback");

  const externalFailMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "@Unit Learning Guide resume an external source search that fails",
    senderName: "Test User",
  });
  const externalFailTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    message: externalFailMention,
    runner: async (runtimeInput) => ({
      content: "",
      status: "waiting_for_approval",
      events: [
        {
          type: "approval_request",
          label: "mcp_conn_sources_search_sources",
          payload: {
            input: { query: "failing source search" },
            policy: {
              toolName: "mcp_conn_sources_search_sources",
              visibleLabel: "Source Search: search_sources",
              risk: "external",
              approval: "always",
            },
            deepAgentThreadId: runtimeInput.threadId,
          },
        },
      ],
    }),
  });
  const failedExternal = await decideWorkspaceAgentApproval(null, {
    workspaceId: createdWorkspace.workspace.id,
    approvalId: externalFailTurn.approvals?.[0]?.id ?? "",
    decision: "approved",
    decidedBy: "Unit Owner",
    runner: async (runtimeInput) => {
      assert((runtimeInput.resumeCommand as any)?.resume?.decisions?.[0]?.type === "approve", "failed external resume still sends approve decision to DeepAgent");
      throw new Error("external source unavailable");
    },
  });
  assert(failedExternal.approval.status === "approved", "failed external resume still records the user approval decision");
  assert(failedExternal.run.status === "failed", "failed external resume marks the run failed");
  assert(failedExternal.run.error === "external source unavailable", "failed external resume stores the resume error on the run");
  assert(!failedExternal.message, "failed external resume does not create a misleading agent message");
  assert(failedExternal.events.some((event) => event.label === "deepagent_resume_failed"), "failed external resume records explicit failure event");
  assert(failedExternal.events.some((event) => event.label === "failed"), "failed external resume records terminal failed event");
  const staleApprovalSeed = await seedWorkspaceAgentRunForTest(null, {
    run: {
      workspaceId: createdWorkspace.workspace.id,
      threadId: newThread.id,
      agentProfileId: delegatedCoachProfile.id,
      agentMemberId: coachMember.id,
      trigger: "manual",
      status: "failed",
      error: "terminal run should not accept approval decisions",
    },
    events: [
      {
        type: "approval_request",
        label: "create_workspace_task",
        payload: { input: { title: "Stale approval task" }, policy: { visibleLabel: "Create task", risk: "write" } },
      },
      {
        type: "status",
        label: "failed",
        payload: { error: "terminal run should not accept approval decisions" },
      },
    ],
    createApprovals: true,
  });
  assert(staleApprovalSeed.agentApprovals[0]?.status === "pending", "test seed can create stale pending approval on a terminal run");
  const rejectedTerminalApproval = await decideWorkspaceAgentApproval(null, {
    workspaceId: createdWorkspace.workspace.id,
    approvalId: staleApprovalSeed.agentApprovals[0]?.id ?? "",
    decision: "approved",
    decidedBy: "Unit Owner",
  }).catch((error) => error);
  assert(rejectedTerminalApproval instanceof Error && rejectedTerminalApproval.message.includes("terminal run"), "terminal runs reject pending approval decisions");
  const afterRejectedTerminalApproval = await getWorkspaceView(null, createdWorkspace.workspace.id);
  assert(
    afterRejectedTerminalApproval.agentApprovals.some((approval) => approval.id === staleApprovalSeed.agentApprovals[0]?.id && approval.status === "pending"),
    "rejected terminal approval decision leaves stale approval unchanged for audit repair",
  );
  assert(
    !afterRejectedTerminalApproval.agentRunEvents.some((event) => event.runId === staleApprovalSeed.agentRuns[0].id && event.label === "approval_approved"),
    "rejected terminal approval decision does not append approval events",
  );

  const siblingApprovalThread = await createWorkspaceThread(null, {
    workspaceId: createdWorkspace.workspace.id,
    type: "room",
    name: "Sibling approval room",
    description: "approval invariant regression",
  });
  const siblingApprovalMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: siblingApprovalThread.id,
    content: "@Unit Learning Guide request two approval-gated actions",
    senderName: "Test User",
  });
  const siblingApprovalTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: siblingApprovalThread.id,
    message: siblingApprovalMention,
    runner: async () => ({
      content: "",
      status: "waiting_for_approval",
      events: [
        {
          type: "approval_request",
          label: "create_workspace_task",
          payload: { input: { title: "One approved action" }, policy: { visibleLabel: "Create task", risk: "write" } },
        },
        {
          type: "approval_request",
          label: "save_agent_memory",
          payload: { input: { title: "Stale sibling memory", summary: "Should not remain pending." }, policy: { visibleLabel: "Save memory", risk: "write" } },
        },
      ],
    }),
  });
  assert(siblingApprovalTurn.approvals?.length === 2, "multi-approval run creates two pending approvals");
  const taskSiblingApproval = siblingApprovalTurn.approvals?.find((approval) => approval.toolName === "create_workspace_task");
  const memorySiblingApproval = siblingApprovalTurn.approvals?.find((approval) => approval.toolName === "save_agent_memory");
  const approvedSibling = await decideWorkspaceAgentApproval(null, {
    workspaceId: createdWorkspace.workspace.id,
    approvalId: taskSiblingApproval?.id ?? "",
    decision: "approved",
    decidedBy: "Unit Owner",
  });
  assert(approvedSibling.run.status === "completed", "approving one action can complete the waiting run");
  assert(approvedSibling.approvals?.some((approval) => approval.id === taskSiblingApproval?.id && approval.status === "approved"), "decision response includes approved active approval");
  assert(approvedSibling.approvals?.some((approval) => approval.id === memorySiblingApproval?.id && approval.status === "expired"), "terminal run expires sibling pending approval");
  assert(approvedSibling.events.some((event) => event.label === "pending_approvals_expired"), "terminal run expiration records audit event");

  const cancellableMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "@Unit Learning Guide prepare a cancellable worksheet",
    senderName: "Test User",
  });
  const cancellableTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    message: cancellableMention,
    runner: async () => ({
      content: "",
      status: "waiting_for_approval",
      events: [
        {
          type: "approval_request",
          label: "create_workspace_task",
          payload: { input: { title: "Cancelled worksheet" }, policy: { visibleLabel: "Create task", risk: "write" } },
        },
      ],
    }),
  });
  const cancelledRun = await cancelWorkspaceAgentRun(null, {
    workspaceId: createdWorkspace.workspace.id,
    runId: cancellableTurn.runs[0].id,
    cancelledBy: "Unit Owner",
    reason: "Unit test cancellation",
  });
  assert(cancelledRun.run.status === "cancelled", "cancel run marks waiting run cancelled");
  assert(cancelledRun.run.completedAt, "cancel run sets completedAt");
  assert(cancelledRun.events.some((event) => event.label === "cancelled"), "cancel run records cancellation event");
  assert(cancelledRun.approvals.some((approval) => approval.status === "expired"), "cancel run expires pending approvals");
  const cancelledAgain = await cancelWorkspaceAgentRun(null, {
    workspaceId: createdWorkspace.workspace.id,
    runId: cancellableTurn.runs[0].id,
  });
  assert(cancelledAgain.events.length === 0, "cancel run is idempotent for terminal runs");
  const retriedCancelledRun = await retryWorkspaceAgentRun(null, {
    workspaceId: createdWorkspace.workspace.id,
    runId: cancellableTurn.runs[0].id,
    runner: async () => ({ content: "Cancelled run retry completed." }),
  });
  assert(retriedCancelledRun.runs[0].id !== cancellableTurn.runs[0].id, "retry cancelled run creates a new run");
  assert(retriedCancelledRun.runs[0].status === "completed", "retry cancelled run can complete");
  assert(retriedCancelledRun.runs[0].inputMessageId === cancellableMention.id, "retry cancelled run reuses original input message");
  assert(retriedCancelledRun.messages[0].content.includes("Cancelled run retry completed"), "retry cancelled run writes output message");

  const approvedMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "@Unit Learning Guide create the approved worksheet",
    senderName: "Test User",
  });
  const approvedTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    message: approvedMention,
    runner: async () => ({
      content: "",
      status: "waiting_for_approval",
      events: [
        {
          type: "approval_request",
          label: "create_workspace_task",
          payload: { input: { title: "Approved worksheet", scope: "Shared", progress: "ready" } },
        },
      ],
    }),
  });
  const approvedApproval = await decideWorkspaceAgentApproval(null, {
    workspaceId: createdWorkspace.workspace.id,
    approvalId: approvedTurn.approvals?.[0]?.id ?? "",
    decision: "approved",
    decidedBy: "Unit Owner",
  });
  assert(approvedApproval.approval.status === "approved", "approved tool decision persists approved status");
  assert(approvedApproval.run.status === "completed", "approved tool execution completes the waiting run");
  assert(approvedApproval.task?.title === "Approved worksheet", "approved create task tool creates a workspace task");
  assert(approvedApproval.message?.content.includes("Approved worksheet"), "approved create task tool creates a visible agent message");
  assert(approvedApproval.run.taskId === approvedApproval.task?.id, "approved tool execution links run to created task");
  assert(approvedApproval.run.outputMessageId === approvedApproval.message?.id, "approved tool execution links run to final message");
  assert(approvedApproval.events.some((event) => event.label === "approval_tool_executed"), "approved tool execution records audit event");
  const approvedDecisionEvent = approvedApproval.events.find((event) => event.label === "approval_approved");
  assert((approvedDecisionEvent?.payload as any).resumeDecision.type === "approve", "approved decision event records DeepAgent approve resume decision");
  assert((approvedDecisionEvent?.payload as any).deepAgentThreadId, "approved decision event records resume thread id");

  const memoryApprovalMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "@Unit Learning Guide remember my hint preference",
    senderName: "Test User",
  });
  const memoryApprovalTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    message: memoryApprovalMention,
    runner: async () => ({
      content: "",
      status: "waiting_for_approval",
      events: [
        {
          type: "approval_request",
          label: "save_agent_memory",
          payload: { input: { title: "Hint preference", summary: "Learner prefers hints before full solutions.", scope: "user" } },
        },
      ],
    }),
  });
  assert(memoryApprovalTurn.approvals?.[0]?.toolName === "save_agent_memory", "save memory approval request records requested tool");
  const approvedMemory = await decideWorkspaceAgentApproval(null, {
    workspaceId: createdWorkspace.workspace.id,
    approvalId: memoryApprovalTurn.approvals?.[0]?.id ?? "",
    decision: "approved",
    decidedBy: "Unit Owner",
  });
  assert(approvedMemory.memory?.scope === "user", "approved save memory tool creates user-scope memory only after approval");
  assert(approvedMemory.memory?.title === "Hint preference", "approved save memory preserves title");
  assert(approvedMemory.run.status === "completed", "approved save memory completes waiting run");
  assert(approvedMemory.events.some((event) => event.label === "save_agent_memory" && event.type === "tool_end"), "approved save memory records tool_end");

  const guardedCreateTask = buildWorkspaceGuardedToolSpecs(customizedCoachProfile, {
    workspaceName: createdWorkspace.workspace.name,
    thread: newThread,
    member: coachMember,
    recentMessages: ["Learner: Please turn this into practice."],
    openTasks: [],
  }).find((spec) => spec.name === "create_workspace_task");
  assert(guardedCreateTask?.invoke, "guarded create task tool is invokable from runtime context");
  const guardedInput = {
    title: "Guarded integration worksheet",
    scope: "Shared",
    progress: "ready",
    assigneeId: member.id,
    dueAt: "2026-06-01",
  };
  const guardedApprovalError = await guardedCreateTask.invoke(guardedInput).catch((error) => error);
  assert(guardedApprovalError instanceof WorkspaceToolApprovalRequiredError, "guarded create task raises approval interrupt before writing");
  assert(guardedApprovalError.input === guardedInput, "guarded approval preserves exact tool input payload for approval resume");
  const guardedApprovalMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "@Unit Learning Guide use the guarded create task tool",
    senderName: "Test User",
  });
  const guardedApprovalTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    message: guardedApprovalMention,
    runner: async () => ({
      content: "",
      status: "waiting_for_approval",
      events: [
        {
          type: "approval_request",
          label: guardedApprovalError.policy.toolName,
          payload: {
            input: guardedApprovalError.input,
            policy: guardedApprovalError.policy,
          },
        },
      ],
    }),
  });
  const approvedGuardedTool = await decideWorkspaceAgentApproval(null, {
    workspaceId: createdWorkspace.workspace.id,
    approvalId: guardedApprovalTurn.approvals?.[0]?.id ?? "",
    decision: "approved",
    decidedBy: "Unit Owner",
  });
  assert(approvedGuardedTool.task?.title === "Guarded integration worksheet", "approved guarded create task uses tool payload title");
  assert(approvedGuardedTool.task?.assigneeId === member.id, "approved guarded create task preserves requested assignee");
  assert(approvedGuardedTool.task?.dueAt === "2026-06-01", "approved guarded create task preserves due date");
  assert(approvedGuardedTool.message?.senderName === "Unit Learning Guide", "approved guarded create task writes agent message");
  assert(approvedGuardedTool.events.some((event) => event.type === "tool_start" && event.label === "create_workspace_task"), "approved guarded create task records tool_start");
  assert(approvedGuardedTool.events.some((event) => event.type === "tool_end" && event.label === "create_workspace_task"), "approved guarded create task records tool_end");

  const appMessage = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "workspace unit app card",
    senderName: "Test User",
    artifact: {
      type: "app",
      appId: "unit_app",
      version: 2,
      title: "Unit App",
      description: "test app card",
      primaryAction: "Open app",
      secondaryAction: "Create task",
    },
  });
  assert(appMessage.artifact?.type === "app", "created app artifact message");
  assert(appMessage.artifact?.type === "app" && appMessage.artifact.appId === "unit_app", "created app artifact reference");
  const viewWithAppArtifact = await getWorkspaceView(null, createdWorkspace.workspace.id);
  assert(
    viewWithAppArtifact.artifacts.some((artifact) => artifact.sourceMessageId === appMessage.id && artifact.kind === "app" && artifact.title === "Unit App"),
    "created app artifact is indexed as a first-class workspace artifact",
  );
  const indexedAppArtifact = viewWithAppArtifact.artifacts.find((artifact) => artifact.sourceMessageId === appMessage.id);
  assert(indexedAppArtifact?.payload === appMessage.artifact, "manual app card uses one compatibility snapshot for message and first-class payload");
  assert(indexedAppArtifact?.description === appMessage.artifact?.description, "manual app card keeps first-class artifact description aligned to snapshot");
  assert(indexedAppArtifact?.reviewStatus === "reviewed", "manual app card artifacts default to reviewed");
  const artifactReviewTask = await createWorkspaceTask(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    title: `Review ${indexedAppArtifact?.title ?? "artifact"}`,
    scope: indexedAppArtifact ? "App" : "Artifact",
    progress: "new",
    sourceArtifactId: indexedAppArtifact?.id,
    sourceRunId: "unit_review_source_run",
  });
  assert(artifactReviewTask.sourceArtifactId === indexedAppArtifact?.id, "artifact review task keeps source artifact id");
  assert(artifactReviewTask.sourceRunId === "unit_review_source_run", "artifact review task keeps source run id");
  const viewWithArtifactReviewTask = await getWorkspaceView(null, createdWorkspace.workspace.id);
  const persistedArtifactReviewTask = viewWithArtifactReviewTask.tasks.find((entry) => entry.id === artifactReviewTask.id);
  assert(persistedArtifactReviewTask?.sourceArtifactId === indexedAppArtifact?.id, "workspace view preserves artifact review task provenance");
  assert(persistedArtifactReviewTask?.sourceRunId === "unit_review_source_run", "workspace view preserves review task source run provenance");
  const snapshotAppMessage = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "workspace unit app snapshot",
    senderName: "Test User",
    artifact: {
      type: "app",
      appId: "unit_snapshot_app",
      version: 1,
      title: "Unit Snapshot App",
      description: "test app snapshot",
      primaryAction: "Open app",
      secondaryAction: "Create task",
      template: { type: "html", source: "<section><h1>Unit snapshot app</h1></section>" },
    },
  });
  assert(snapshotAppMessage.artifact?.type === "app", "created app snapshot artifact message");
  assert(
    snapshotAppMessage.artifact?.type === "app" && snapshotAppMessage.artifact.template?.type === "html",
    "created app snapshot artifact keeps template",
  );

  const task = await createWorkspaceTask(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    title: "Workspace unit task",
    scope: "Private",
    progress: "new",
    assigneeId: member.id,
  });
  assert(task.title === "Workspace unit task", "created task title");
  assert(task.threadId === newThread.id, "created task thread");
  assert(task.assigneeName === "Unit Agent", "created task assignee");

  const agentTaskRun = await runWorkspaceAgentTask(null, {
    workspaceId: createdWorkspace.workspace.id,
    task,
  });
  assert(agentTaskRun.task?.status === "done", "agent task run completes assigned task");
  assert(agentTaskRun.messages.length === 1, "agent task run creates one message");
  assert(agentTaskRun.runs.length === 1, "agent task run creates one run");
  assert(agentTaskRun.events.some((event) => event.type === "status" && event.label === "completed"), "agent task run records completion event");
  assert(agentTaskRun.events.some((event) => event.type === "status" && event.label === "runtime_configured"), "agent task run records runtime event");
  assert(agentTaskRun.runs[0].taskId === task.id, "agent task run references task");
  assert(agentTaskRun.artifacts?.some((artifact) => artifact.sourceRunId === agentTaskRun.runs[0].id && artifact.kind === "task_result"), "agent task run returns first-class task result artifact for client merge");

  const approvalUpdateTarget = await createWorkspaceTask(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    title: "Approval update target",
    scope: "Shared",
    progress: "needs update",
  });
  const approvedUpdateMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "@Unit Learning Guide update the target task",
    senderName: "Test User",
  });
  const approvedUpdateTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    message: approvedUpdateMention,
    runner: async () => ({
      content: "",
      status: "waiting_for_approval",
      events: [
        {
          type: "approval_request",
          label: "update_workspace_task",
          payload: {
            input: {
              taskId: approvalUpdateTarget.id,
              status: "done",
              progress: "approved update",
              resultSummary: "Updated after approval.",
            },
          },
        },
      ],
    }),
  });
  const approvedUpdate = await decideWorkspaceAgentApproval(null, {
    workspaceId: createdWorkspace.workspace.id,
    approvalId: approvedUpdateTurn.approvals?.[0]?.id ?? "",
    decision: "approved",
    decidedBy: "Unit Owner",
  });
  assert(approvedUpdate.task?.id === approvalUpdateTarget.id, "approved update tool returns updated task");
  assert(approvedUpdate.task?.status === "done", "approved update tool updates task status");
  assert(approvedUpdate.task?.resultSummary === "Updated after approval.", "approved update tool stores result summary");
  assert(approvedUpdate.message?.content.includes("Approval update target"), "approved update tool creates visible agent message");
  assert(approvedUpdate.run.status === "completed", "approved update tool completes the waiting run");
  assert(approvedUpdate.run.taskId === approvalUpdateTarget.id, "approved update tool links run to updated task");
  assert(approvedUpdate.run.outputMessageId === approvedUpdate.message?.id, "approved update tool links run to final message");
  assert(approvedUpdate.events.some((event) => event.label === "approval_tool_executed"), "approved update tool records execution event");
  assert(approvedUpdate.events.some((event) => event.type === "tool_start" && event.label === "update_workspace_task"), "approved update tool records tool_start");
  assert(approvedUpdate.events.some((event) => event.type === "tool_end" && event.label === "update_workspace_task"), "approved update tool records tool_end");

  const approvedAppMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "@Unit Learning Guide share an approved app",
    senderName: "Test User",
  });
  const approvedAppTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    message: approvedAppMention,
    runner: async () => ({
      content: "",
      status: "waiting_for_approval",
      events: [
        {
          type: "approval_request",
          label: "share_learning_app",
          payload: {
            input: {
              appId: "approved_app",
              version: 3,
              title: "Approved App",
              description: "Approved app card.",
              primaryAction: "Open app",
              secondaryAction: "Create task",
            },
          },
        },
      ],
    }),
  });
  const approvedApp = await decideWorkspaceAgentApproval(null, {
    workspaceId: createdWorkspace.workspace.id,
    approvalId: approvedAppTurn.approvals?.[0]?.id ?? "",
    decision: "approved",
    decidedBy: "Unit Owner",
  });
  assert(approvedApp.message?.artifact?.type === "app", "approved share app tool creates app artifact message");
  assert(approvedApp.message?.artifact?.type === "app" && approvedApp.message.artifact.appId === "approved_app", "approved share app tool preserves app id");
  assert(approvedApp.run.status === "completed", "approved share app tool completes waiting run");
  assert(approvedApp.run.outputMessageId === approvedApp.message?.id, "approved share app tool links run to final message");
  assert(approvedApp.events.some((event) => event.type === "artifact" && event.label === "share_learning_app"), "approved share app tool records artifact event");

  const approvedWidgetMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "@Unit Learning Guide render an approved widget",
    senderName: "Test User",
  });
  const approvedWidgetTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    message: approvedWidgetMention,
    runner: async () => ({
      content: "",
      status: "waiting_for_approval",
      events: [
        {
          type: "approval_request",
          label: "render_interactive_widget",
          payload: {
            input: {
              appId: "approved_widget",
              version: 1,
              title: "Approved Widget",
              description: "Interactive derivative intuition widget.",
              html: "<section><h1>Derivative widget</h1></section>",
              primaryAction: "Open widget",
            },
          },
        },
      ],
    }),
  });
  const approvedWidget = await decideWorkspaceAgentApproval(null, {
    workspaceId: createdWorkspace.workspace.id,
    approvalId: approvedWidgetTurn.approvals?.[0]?.id ?? "",
    decision: "approved",
    decidedBy: "Unit Owner",
  });
  assert(approvedWidget.message?.artifact?.type === "app", "approved render widget tool creates app artifact message");
  assert(approvedWidget.message?.artifact?.type === "app" && approvedWidget.message.artifact.appId === "approved_widget", "approved render widget preserves app id");
  assert(approvedWidget.message?.artifact?.type === "app" && approvedWidget.message.artifact.template?.type === "html", "approved render widget stores html template snapshot");
  assert(approvedWidget.message?.artifact?.type === "app" && approvedWidget.message.artifact.primaryAction === "Open widget", "approved render widget preserves primary action");
  assert(approvedWidget.run.status === "completed", "approved render widget completes waiting run");
  assert(approvedWidget.run.outputMessageId === approvedWidget.message?.id, "approved render widget links run to final message");
  assert(approvedWidget.events.some((event) => event.type === "artifact" && event.label === "render_interactive_widget"), "approved render widget records artifact event");

  const approvedCourseMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "@Unit Learning Guide generate an approved course",
    senderName: "Test User",
  });
  const approvedCourseTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    message: approvedCourseMention,
    runner: async () => ({
      content: "",
      status: "waiting_for_approval",
      events: [
        {
          type: "approval_request",
          label: "generate_course",
          payload: {
            input: {
              title: "Derivative Course",
              topic: "Derivative intuition",
              description: "A one-week course draft.",
              modules: [
                { title: "Slope as a story", objective: "Connect graph slope to change." },
                { title: "Instantaneous rate", objective: "Bridge average and instantaneous rate." },
              ],
              assessments: ["Explain derivative intuition in your own words."],
            },
          },
        },
      ],
    }),
  });
  const approvedCourse = await decideWorkspaceAgentApproval(null, {
    workspaceId: createdWorkspace.workspace.id,
    approvalId: approvedCourseTurn.approvals?.[0]?.id ?? "",
    decision: "approved",
    decidedBy: "Unit Owner",
  });
  assert(approvedCourse.message?.artifact?.type === "task", "approved generate course tool creates course artifact card");
  assert(approvedCourse.message?.artifact?.type === "task" && approvedCourse.message.artifact.title === "Derivative Course", "approved generate course preserves course title");
  assert(approvedCourse.message?.artifact?.type === "task" && approvedCourse.message.artifact.groups.includes("Course"), "approved generate course marks artifact as course");
  assert(approvedCourse.artifact?.kind === "course", "approved generate course returns first-class course artifact");
  assert(approvedCourse.artifact?.title === approvedCourse.message?.artifact?.title, "approved generate course keeps legacy snapshot title aligned to first-class artifact");
  assert(approvedCourse.artifact?.payload === approvedCourse.message?.artifact, "approved generate course uses one compatibility snapshot for message and first-class payload");
  assert(approvedCourse.artifact?.sourceRunId === approvedCourse.run.id, "approved generate course links course artifact to source run");
  assert(approvedCourse.message?.content.includes("Generated course"), "approved generate course creates visible course message");
  assert(approvedCourse.run.status === "completed", "approved generate course completes waiting run");
  assert(approvedCourse.run.outputMessageId === approvedCourse.message?.id, "approved generate course links run to final message");
  const approvedCourseArtifactEvent = approvedCourse.events.find((event) => event.type === "artifact" && event.label === "generate_course");
  assert(approvedCourseArtifactEvent, "approved generate course records artifact event");
  const approvedCourseArtifactPayload = asRecord(approvedCourseArtifactEvent.payload);
  assert(approvedCourseArtifactPayload.artifactId === approvedCourse.artifact.id, "approved generate course artifact event references first-class artifact id");
  assert(approvedCourseArtifactPayload.artifactKind === "course", "approved generate course artifact event carries semantic kind");
  assert(approvedCourseArtifactPayload.artifactTitle === "Derivative Course", "approved generate course artifact event carries compact title");
  assert(approvedCourseArtifactPayload.sourceMessageId === approvedCourse.message.id, "approved generate course artifact event references source message id");
  assert(!("artifact" in approvedCourseArtifactPayload), "approved generate course artifact event does not embed full artifact record");
  const approvedCourseToolEndPayload = asRecord(approvedCourse.events.find((event) => event.type === "tool_end" && event.label === "generate_course")?.payload);
  assert(!("artifact" in approvedCourseToolEndPayload), "approved generate course tool event does not embed full artifact record");

  const approvedArtifactMention = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "@Unit Learning Guide save an approved artifact",
    senderName: "Test User",
  });
  const approvedArtifactTurn = await runWorkspaceAgentTurn(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    message: approvedArtifactMention,
    runner: async () => ({
      content: "",
      status: "waiting_for_approval",
      events: [
        {
          type: "approval_request",
          label: "save_learning_artifact",
          payload: {
            input: {
              title: "Approved Artifact",
              description: "Saved plan from the agent.",
              groups: ["Plan", "Review"],
            },
          },
        },
      ],
    }),
  });
  const approvedArtifact = await decideWorkspaceAgentApproval(null, {
    workspaceId: createdWorkspace.workspace.id,
    approvalId: approvedArtifactTurn.approvals?.[0]?.id ?? "",
    decision: "approved",
    decidedBy: "Unit Owner",
  });
  assert(approvedArtifact.message?.artifact?.type === "task", "approved save artifact tool creates reusable artifact card");
  assert(approvedArtifact.message?.artifact?.type === "task" && approvedArtifact.message.artifact.title === "Approved Artifact", "approved save artifact tool preserves artifact title");
  assert(approvedArtifact.artifact?.kind === "saved_artifact", "approved save artifact returns first-class saved artifact record");
  assert(approvedArtifact.artifact?.payload === approvedArtifact.message?.artifact, "approved save artifact uses one compatibility snapshot for message and first-class payload");
  assert(approvedArtifact.artifact?.sourceRunId === approvedArtifact.run.id, "approved save artifact links first-class artifact to source run");
  assert(approvedArtifact.run.status === "completed", "approved save artifact tool completes waiting run");
  const approvedSavedArtifactEvent = approvedArtifact.events.find((event) => event.type === "artifact" && event.label === "save_learning_artifact");
  assert(approvedSavedArtifactEvent, "approved save artifact tool records artifact event");
  const approvedSavedArtifactPayload = asRecord(approvedSavedArtifactEvent.payload);
  assert(approvedSavedArtifactPayload.artifactId === approvedArtifact.artifact.id, "approved save artifact event references first-class artifact id");
  assert(approvedSavedArtifactPayload.artifactKind === "saved_artifact", "approved save artifact event carries semantic kind");
  assert(approvedSavedArtifactPayload.artifactTitle === "Approved Artifact", "approved save artifact event carries compact title");
  assert(approvedSavedArtifactPayload.sourceMessageId === approvedArtifact.message.id, "approved save artifact event references source message id");
  assert(!("artifact" in approvedSavedArtifactPayload), "approved save artifact event does not embed full artifact record");
  const approvedSavedArtifactToolEndPayload = asRecord(approvedArtifact.events.find((event) => event.type === "tool_end" && event.label === "save_learning_artifact")?.payload);
  assert(!("artifact" in approvedSavedArtifactToolEndPayload), "approved save artifact tool event does not embed full artifact record");

  const failingTask = await createWorkspaceTask(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    title: "Workspace failing agent task",
    assigneeId: member.id,
  });
  const failedTaskRun = await runWorkspaceAgentTask(null, {
    workspaceId: createdWorkspace.workspace.id,
    task: failingTask,
    runner: async () => ({
      content: "partial task output",
      error: "task runtime unavailable",
      events: [{ type: "status", label: "deepagent_failed", payload: { error: "task runtime unavailable" } }],
    }),
  });
  assert(failedTaskRun.task?.status === "open", "failed agent task run leaves task open");
  assert(failedTaskRun.task?.progress === "agent run failed", "failed agent task run records task progress");
  assert(failedTaskRun.runs[0].status === "failed", "failed agent task run persists failed run");
  assert(failedTaskRun.runs[0].error === "task runtime unavailable", "failed agent task run persists error");
  assert(failedTaskRun.events.some((event) => event.label === "deepagent_failed"), "failed agent task run persists failure event");

  const updatedTask = await updateWorkspaceTask(null, {
    workspaceId: createdWorkspace.workspace.id,
    taskId: task.id,
    status: "done",
    progress: "submitted",
    resultSummary: "Unit task result submitted.",
  });
  assert(updatedTask.status === "done", "updated task status");
  assert(updatedTask.assigneeId === member.id, "updated task keeps assignee");
  assert(updatedTask.resultSummary === "Unit task result submitted.", "updated task result summary");
  assert(updatedTask.submittedAt, "updated task submitted timestamp");

  const reopenCandidate = await createWorkspaceTask(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    title: "Unit task reopen clears stale result",
    assigneeId: member.id,
  });
  const submittedReopenCandidate = await updateWorkspaceTask(null, {
    workspaceId: createdWorkspace.workspace.id,
    taskId: reopenCandidate.id,
    status: "done",
    progress: "submitted",
    resultSummary: "This result should not survive reopen.",
  });
  assert(submittedReopenCandidate.submittedAt, "submitted reopen candidate records submitted timestamp");
  const reopenedTask = await updateWorkspaceTask(null, {
    workspaceId: createdWorkspace.workspace.id,
    taskId: reopenCandidate.id,
    status: "open",
    progress: "needs another attempt",
  });
  assert(reopenedTask.status === "open", "reopened task is open");
  assert(reopenedTask.progress === "needs another attempt", "reopened task keeps new progress");
  assert(!reopenedTask.resultSummary, "reopened task clears stale result summary");
  assert(!reopenedTask.submittedAt, "reopened task clears stale submitted timestamp");

  const nextView = await getWorkspaceView(null, createdWorkspace.workspace.id);
  assert(nextView.threads.some((entry) => entry.id === newThread.id), "created thread appears in workspace view");
  assert(nextView.threads.some((entry) => entry.id === newDirect.id), "created direct appears in workspace view");
  assert(nextView.threads.some((entry) => entry.id === coachDirect.id), "created direct agent chat appears in workspace view");
  assert(nextView.members.some((entry) => entry.id === member.id), "created member appears in workspace view");
  assert(nextView.members.some((entry) => entry.id === coachMember.id && entry.agentProfileId === customizedCoachProfile.id), "profile-backed agent member appears in workspace view");
  assert(
    nextView.agentProfiles.some(
      (entry) =>
        entry.id === customizedCoachProfile.id &&
        entry.displayName === "Unit Learning Guide" &&
        entry.memoryScope === "workspace" &&
        entry.capabilities.some((capability) => capability.kind === "internal_tool" && capability.toolName === "create_workspace_task" && capability.approval === "always"),
    ),
    "updated agent profile appears in workspace view",
  );
  assert(nextView.agentProfiles.some((entry) => entry.id === customProfile.id && entry.visibility === "private"), "custom agent profile appears in workspace view");
  assert(nextView.agentRuns.some((entry) => entry.id === coachTurn.runs[0].id && entry.status === "completed"), "agent run appears in workspace view");
  assert(nextView.agentRuns.some((entry) => entry.id === directAgentTurn.runs[0].id && entry.trigger === "direct_chat"), "direct agent chat run appears in workspace view");
  assert(nextView.agentRuns.some((entry) => entry.id === retriedFailedTurn.runs[0].id && entry.status === "completed"), "retried failed run appears in workspace view");
  assert(nextView.agentRuns.some((entry) => entry.id === retriedCancelledRun.runs[0].id && entry.status === "completed"), "retried cancelled run appears in workspace view");
  assert(nextView.agentRunEvents.some((entry) => entry.runId === coachTurn.runs[0].id && entry.label === "completed"), "agent run events appear in workspace view");
  assert(
    nextView.messages.some((entry) => entry.id === message.id && entry.content === message.content),
    "created message appears in workspace view",
  );
  assert(nextView.messages.some((entry) => entry.id === appMessage.id && entry.artifact?.type === "app"), "created app card appears in workspace view");
  assert(nextView.artifacts.some((entry) => entry.sourceMessageId === appMessage.id && entry.kind === "app"), "created app appears in first-class artifacts view");
  assert(nextView.artifacts.some((entry) => entry.sourceRunId === approvedCourse.run.id && entry.kind === "course"), "approved course appears as first-class course artifact");
  assert(nextView.artifacts.some((entry) => entry.sourceRunId === agentTaskRun.runs[0].id && entry.kind === "task_result"), "agent task output appears as first-class task result artifact");
  assert(nextView.artifacts.some((entry) => entry.sourceRunId === approvedArtifact.run.id && entry.title === "Approved Artifact" && entry.kind === "saved_artifact"), "approved artifact appears in first-class artifacts view");
  assert(nextView.agentMemories.some((entry) => entry.id === threadMemory.id && entry.title === "Learner prefers hints"), "thread memory appears as product-visible workspace memory");
  assert(nextView.agentMemories.some((entry) => entry.id === workspaceMemory.id && entry.scope === "workspace"), "workspace memory appears as product-visible workspace memory");
  assert(nextView.agentMemories.some((entry) => entry.sourceRunId === coachTurn.runs[0].id && entry.title.includes("Unit Learning Guide")), "automatic run summary memory appears in workspace view");
  assert(!nextView.agentMemories.some((entry) => entry.sourceRunId === userMemoryTurn.runs[0].id), "user-scope agent runs do not create automatic workspace-visible memory");
  assert(!nextView.agentMemories.some((entry) => entry.sourceRunId === agentTurn.runs[0].id), "legacy implicit agent with thread memory does not create memory without an agent profile membership");
  assert(!nextView.agentMemories.some((entry) => entry.sourceRunId === failedTurn.runs[0].id), "failed agent runs do not create automatic memory");
  assert(nextView.agentMemories.every((entry) => !entry.archivedAt), "workspace view hides archived agent memories by default");
  const archivedThreadMemory = await archiveWorkspaceAgentMemory(null, {
    workspaceId: createdWorkspace.workspace.id,
    memoryId: threadMemory.id,
  });
  assert(archivedThreadMemory.archivedAt, "archiving an agent memory records archived timestamp");
  const afterMemoryArchiveView = await getWorkspaceView(null, createdWorkspace.workspace.id);
  assert(!afterMemoryArchiveView.agentMemories.some((entry) => entry.id === threadMemory.id), "archived agent memory is hidden from default workspace view");
  assert(afterMemoryArchiveView.agentMemories.some((entry) => entry.id === workspaceMemory.id), "archiving one memory keeps other memories visible");
  const bulkMemoryA = await createWorkspaceAgentMemory(null, {
    workspaceId: createdWorkspace.workspace.id,
    agentProfileId: delegatedCoachProfile.id,
    scope: "workspace",
    title: "Bulk archive A",
    summary: "Temporary memory for bulk archive regression.",
  });
  const bulkMemoryB = await createWorkspaceAgentMemory(null, {
    workspaceId: createdWorkspace.workspace.id,
    agentProfileId: delegatedCoachProfile.id,
    scope: "workspace",
    title: "Bulk archive B",
    summary: "Second temporary memory for bulk archive regression.",
  });
  const bulkArchivedMemories = await archiveWorkspaceAgentMemories(null, {
    workspaceId: createdWorkspace.workspace.id,
    memoryIds: [bulkMemoryA.id, bulkMemoryB.id],
  });
  assert(bulkArchivedMemories.length === 2, "bulk archiving memories returns archived records");
  assert(bulkArchivedMemories.every((memory) => memory.archivedAt), "bulk archived memories record archived timestamps");
  const afterBulkMemoryArchiveView = await getWorkspaceView(null, createdWorkspace.workspace.id);
  assert(!afterBulkMemoryArchiveView.agentMemories.some((entry) => bulkArchivedMemories.some((memory) => memory.id === entry.id)), "bulk archived memories are hidden from workspace view");
  const archivedMemoryAudit = await listWorkspaceAgentMemories(null, {
    workspaceId: createdWorkspace.workspace.id,
    includeArchived: true,
  });
  assert(archivedMemoryAudit.memories.some((memory) => memory.id === archivedThreadMemory.id && memory.archivedAt), "archived memory remains queryable for audit");
  assert(bulkArchivedMemories.every((archived) => archivedMemoryAudit.memories.some((memory) => memory.id === archived.id && memory.archivedAt)), "bulk archived memories remain queryable for audit");
  const restoredThreadMemory = await restoreWorkspaceAgentMemory(null, {
    workspaceId: createdWorkspace.workspace.id,
    memoryId: archivedThreadMemory.id,
  });
  assert(!restoredThreadMemory.archivedAt, "restoring an archived agent memory clears archived timestamp");
  const afterMemoryRestoreView = await getWorkspaceView(null, createdWorkspace.workspace.id);
  assert(afterMemoryRestoreView.agentMemories.some((entry) => entry.id === archivedThreadMemory.id), "restored agent memory returns to default workspace view");
  const deletedBulkMemory = await deleteWorkspaceAgentMemory(null, {
    workspaceId: createdWorkspace.workspace.id,
    memoryId: bulkArchivedMemories[0].id,
  });
  assert(deletedBulkMemory.id === bulkArchivedMemories[0].id, "deleting an agent memory returns the deleted record");
  const afterMemoryDeleteAudit = await listWorkspaceAgentMemories(null, {
    workspaceId: createdWorkspace.workspace.id,
    includeArchived: true,
  });
  assert(!afterMemoryDeleteAudit.memories.some((memory) => memory.id === deletedBulkMemory.id), "deleted agent memory is removed from audit history");
  assert(nextView.messages.some((entry) => entry.id === agentTurn.messages[0].id), "agent mention response appears in workspace view");
  assert(nextView.messages.some((entry) => entry.id === coachTurn.messages[0].id), "profile-backed agent response appears in workspace view");
  assert(nextView.messages.some((entry) => entry.id === directAgentMessage.id), "direct agent chat human message appears in workspace view");
  assert(nextView.messages.some((entry) => entry.id === directAgentTurn.messages[0].id), "direct agent chat response appears in workspace view");
  assert(nextView.messages.some((entry) => entry.id === agentTaskRun.messages[0].id), "agent task response appears in workspace view");
  assert(
    nextView.messages.some((entry) => entry.id === snapshotAppMessage.id && entry.artifact?.type === "app" && entry.artifact.template?.type === "html"),
    "created app snapshot appears in workspace view",
  );
  assert(
    nextView.tasks.some((entry) => entry.id === task.id && entry.status === "done" && entry.assigneeName === "Unit Agent" && entry.resultSummary),
    "updated assigned task appears in workspace view",
  );
  assert(nextView.tasks.some((entry) => entry.id === approvedApproval.task?.id), "approved tool task appears in workspace view");
  assert(nextView.messages.some((entry) => entry.id === approvedApproval.message?.id), "approved tool message appears in workspace view");
  assert(nextView.tasks.some((entry) => entry.id === approvedGuardedTool.task?.id && entry.assigneeId === member.id), "approved guarded tool task appears in workspace view");
  assert(nextView.messages.some((entry) => entry.id === approvedGuardedTool.message?.id), "approved guarded tool message appears in workspace view");
  assert(
    nextView.tasks.some((entry) => entry.id === approvedUpdate.task?.id && entry.status === "done" && entry.resultSummary === "Updated after approval."),
    "approved update task appears in workspace view",
  );
  assert(nextView.messages.some((entry) => entry.id === approvedUpdate.message?.id), "approved update message appears in workspace view");
  assert(
    nextView.agentRuns.some((entry) => entry.id === approvedApproval.run.id && entry.taskId === approvedApproval.task?.id && entry.outputMessageId === approvedApproval.message?.id),
    "approved tool run links persist in workspace view",
  );
  assert(
    nextView.agentRuns.some((entry) => entry.id === approvedUpdate.run.id && entry.taskId === approvedUpdate.task?.id && entry.outputMessageId === approvedUpdate.message?.id),
    "approved update run links persist in workspace view",
  );
  const listedRuns = await listWorkspaceAgentRuns(null, { workspaceId: createdWorkspace.workspace.id, threadId: newThread.id });
  assert(listedRuns.runs.some((entry) => entry.id === coachTurn.runs[0].id), "agent runs can be listed for a thread");
  assert(listedRuns.events.some((entry) => entry.runId === coachTurn.runs[0].id), "agent run events can be listed for a thread");
  assert(listedRuns.approvals.some((entry) => entry.id === deniedApproval.approval.id && entry.status === "denied"), "agent approvals can be listed for a thread");
  assert(listedRuns.approvals.some((entry) => entry.id === approvedApproval.approval.id && entry.status === "approved"), "approved agent approvals can be listed for a thread");
  assert(listedRuns.approvals.some((entry) => entry.id === approvedGuardedTool.approval.id && entry.status === "approved"), "approved guarded tool approval can be listed for a thread");
  assert(listedRuns.approvals.some((entry) => entry.id === approvedUpdate.approval.id && entry.status === "approved"), "approved update approvals can be listed for a thread");
  const runDetail = await getWorkspaceAgentRunDetail(null, {
    workspaceId: createdWorkspace.workspace.id,
    runId: coachTurn.runs[0].id,
  });
  assert(runDetail.run.id === coachTurn.runs[0].id, "agent run detail returns the requested run");
  assert(runDetail.events.some((entry) => entry.runId === coachTurn.runs[0].id), "agent run detail returns persisted events");
  assert(runDetail.inputMessage?.id === coachMention.id, "agent run detail returns linked input message");
  assert(runDetail.outputMessage?.id === coachTurn.messages[0].id, "agent run detail returns linked output message");
  assert(runDetail.memories?.some((entry) => entry.sourceRunId === coachTurn.runs[0].id), "agent run detail returns linked run memories");
  const approvedRunDetail = await getWorkspaceAgentRunDetail(null, {
    workspaceId: createdWorkspace.workspace.id,
    runId: approvedApproval.run.id,
  });
  assert(approvedRunDetail.approvals.some((entry) => entry.id === approvedApproval.approval.id), "agent run detail returns linked approval decisions");
  assert(approvedRunDetail.task?.id === approvedApproval.task?.id, "agent run detail returns linked task output");
  assert(approvedRunDetail.artifacts?.some((entry) => entry.sourceRunId === approvedApproval.run.id), "agent run detail returns linked artifacts");

  const pagedThread = await createWorkspaceThread(null, {
    workspaceId: createdWorkspace.workspace.id,
    type: "room",
    name: "Paged unit room",
    description: "pagination test room",
  });
  for (let index = 1; index <= 65; index += 1) {
    await createWorkspaceMessage(null, {
      workspaceId: createdWorkspace.workspace.id,
      threadId: pagedThread.id,
      content: `paged unit message ${index}`,
      senderName: "Test User",
    });
  }
  const pagedView = await getWorkspaceView(null, createdWorkspace.workspace.id);
  const visiblePagedMessages = pagedView.messages.filter((entry) => entry.threadId === pagedThread.id);
  assert(visiblePagedMessages.length === 50, "workspace view limits local messages per thread");
  assert(visiblePagedMessages[0].content === "paged unit message 16", "workspace view keeps newest local message window");
  const earlierPage = await listWorkspaceMessages(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: pagedThread.id,
    before: visiblePagedMessages[0].createdAt,
    limit: 10,
  });
  assert(earlierPage.messages.length === 10, "local earlier message page returns requested limit");
  assert(earlierPage.hasMore, "local earlier message page reports remaining messages");
  assert(earlierPage.messages[0].content === "paged unit message 6", "local earlier message page is chronological");

  const originalNodeEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    let productionLocalBlocked = false;
    try {
      await getWorkspaceView(null);
    } catch (error) {
      productionLocalBlocked = error instanceof Error && error.message.includes("Workspace local storage is disabled in production");
    }
    assert(productionLocalBlocked, "production workspace access does not fall back to local storage");
  } finally {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  }

  process.stdout.write("[workspace.unit] ALL UNIT CHECKS PASSED\n");
}

void main().catch((error) => {
  process.stderr.write(`[workspace.unit] FAILED: ${(error as Error).message}\n`);
  process.exit(1);
});
