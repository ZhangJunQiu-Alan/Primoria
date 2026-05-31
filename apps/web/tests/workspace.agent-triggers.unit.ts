#!/usr/bin/env tsx

import {
  decideWorkspaceAgentsForMessage,
  isWorkspaceAgentMember,
  selectWorkspaceAgentsForMessage,
} from "../src/lib/workspaces/agent-triggers.ts";
import type { WorkspaceAgentProfile, WorkspaceMember, WorkspaceThread, WorkspaceView } from "../src/lib/workspaces/types.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function baseView(members: WorkspaceMember[], agentProfiles: WorkspaceAgentProfile[]): WorkspaceView {
  return {
    workspace: { id: "workspace_triggers", name: "Trigger workspace", createdAt: 1, updatedAt: 2 },
    workspaces: [],
    members,
    agentProfiles,
    threads: [],
    messages: [],
    tasks: [],
    agentRuns: [],
    agentRunEvents: [],
    agentApprovals: [],
    persisted: false,
  };
}

async function main() {
  const human: WorkspaceMember = {
    id: "member_human",
    workspaceId: "workspace_triggers",
    displayName: "Agent Smith",
    role: "Person",
  };
  const profile: WorkspaceAgentProfile = {
    id: "profile_coach",
    workspaceId: "workspace_triggers",
    displayName: "Careful Coach",
    handle: "careful-coach",
    description: "Helps reason through problems.",
    visibility: "workspace",
    systemPrompt: "Ask good questions.",
    memoryScope: "thread",
    capabilities: [],
    createdAt: 1,
    updatedAt: 2,
  };
  const agent: WorkspaceMember = {
    id: "member_agent",
    workspaceId: "workspace_triggers",
    displayName: "Careful Coach",
    role: "Agent",
    agentProfileId: profile.id,
  };
  const profileBackedCollaborator: WorkspaceMember = {
    ...agent,
    id: "member_profile_backed_collaborator",
    role: "Collaborator",
  };
  const legacyAgent: WorkspaceMember = {
    id: "member_legacy_agent",
    workspaceId: "workspace_triggers",
    displayName: "Legacy Coach",
    role: "Agent",
  };
  const humanWithAgentRoleText: WorkspaceMember = {
    id: "member_human_agent_role_text",
    workspaceId: "workspace_triggers",
    displayName: "Mina",
    role: "Learning agent coordinator",
  };
  const secondProfile: WorkspaceAgentProfile = {
    id: "profile_practice",
    workspaceId: "workspace_triggers",
    displayName: "Practice Buddy",
    handle: "practice-buddy",
    description: "Creates practice prompts.",
    visibility: "workspace",
    systemPrompt: "Give focused practice.",
    memoryScope: "thread",
    capabilities: [],
    createdAt: 1,
    updatedAt: 2,
  };
  const secondAgent: WorkspaceMember = {
    id: "member_practice_agent",
    workspaceId: "workspace_triggers",
    displayName: "Practice Buddy",
    role: "Agent",
    agentProfileId: secondProfile.id,
  };
  const room: WorkspaceThread = {
    id: "thread_room",
    workspaceId: "workspace_triggers",
    type: "room",
    name: "General",
    createdAt: 1,
    updatedAt: 2,
  };
  const direct: WorkspaceThread = {
    id: "thread_direct",
    workspaceId: "workspace_triggers",
    type: "direct",
    name: "Coach DM",
    participantIds: [agent.id],
    createdAt: 1,
    updatedAt: 2,
  };
  const view = baseView([human, agent], [profile]);

  assert(!isWorkspaceAgentMember(human), "human names containing agent are not treated as agents");
  assert(!isWorkspaceAgentMember(humanWithAgentRoleText), "human role text containing agent is not treated as an agent");
  assert(isWorkspaceAgentMember(agent), "profile-backed Agent role is treated as agent");
  assert(isWorkspaceAgentMember(profileBackedCollaborator), "profile-backed collaborator role is treated as agent");
  assert(isWorkspaceAgentMember(legacyAgent), "legacy exact Agent role remains treated as agent");

  const directAgents = selectWorkspaceAgentsForMessage(view, direct, "Can you help?");
  assert(directAgents.length === 1 && directAgents[0].member.id === agent.id, "direct chat with agent triggers that agent");
  const directDecision = decideWorkspaceAgentsForMessage(view, direct, "Can you help?");
  assert(directDecision.trigger === "direct_chat" && directDecision.reason === "direct_agent_chat", "direct chat decision records direct_chat trigger");

  const dbStyleDirect: WorkspaceThread = {
    ...direct,
    participantIds: [human.id, agent.id],
  };
  const dbStyleDirectAgents = selectWorkspaceAgentsForMessage(view, dbStyleDirect, "Can you help?");
  assert(dbStyleDirectAgents.length === 1 && dbStyleDirectAgents[0].member.id === agent.id, "direct chat with human plus agent triggers the single agent");

  const multiAgentView = baseView([human, agent, secondAgent], [profile, secondProfile]);
  const multiAgentDirect: WorkspaceThread = {
    ...direct,
    id: "thread_multi_agent_direct",
    participantIds: [human.id, agent.id, secondAgent.id],
  };
  const multiAgentSilent = decideWorkspaceAgentsForMessage(multiAgentView, multiAgentDirect, "Can someone help?");
  assert(multiAgentSilent.agents.length === 0 && multiAgentSilent.reason === "none", "direct chat with multiple agents does not auto-run without mention");
  const multiAgentMention = decideWorkspaceAgentsForMessage(multiAgentView, multiAgentDirect, "@practice-buddy make two examples");
  assert(
    multiAgentMention.agents.length === 1 && multiAgentMention.agents[0].member.id === secondAgent.id && multiAgentMention.trigger === "mention",
    "direct chat with multiple agents still routes explicit mentions",
  );
  const multipleSpecificMentions = decideWorkspaceAgentsForMessage(multiAgentView, room, "@careful-coach @practice-buddy help compare approaches");
  assert(
    multipleSpecificMentions.agents.length === 1 && multipleSpecificMentions.agents[0].member.id === agent.id,
    "multiple named agent mentions still choose one visible primary responder by default",
  );

  const handleMention = selectWorkspaceAgentsForMessage(view, room, "@careful-coach explain this");
  assert(handleMention.length === 1 && handleMention[0].profile?.id === profile.id, "profile handle mention triggers agent");
  const mentionDecision = decideWorkspaceAgentsForMessage(view, room, "@careful-coach explain this");
  assert(mentionDecision.trigger === "mention" && mentionDecision.reason === "mention", "specific agent mention records mention trigger");

  const genericMention = selectWorkspaceAgentsForMessage(view, room, "@agents who should handle this?");
  assert(genericMention.length === 1 && genericMention[0].member.id === agent.id, "generic agent mention selects available agents");
  const coordinatorDecision = decideWorkspaceAgentsForMessage(view, room, "@agents who should handle this?");
  assert(coordinatorDecision.trigger === "coordinator" && coordinatorDecision.reason === "coordinator", "generic agent mention records coordinator trigger");
  assert(coordinatorDecision.confidence > 0, "coordinator decision includes confidence");
  const multiAgentCoordinatorDecision = decideWorkspaceAgentsForMessage(multiAgentView, room, "@agents who should handle this?");
  assert(
    multiAgentCoordinatorDecision.agents.length === 1 && multiAgentCoordinatorDecision.trigger === "coordinator",
    "generic agent mention routes through one coordinator-selected agent by default",
  );
  const allowlistedRoom: WorkspaceThread = {
    ...room,
    allowedAgentProfileIds: [secondProfile.id],
  };
  const blockedSpecificMention = decideWorkspaceAgentsForMessage(multiAgentView, allowlistedRoom, "@careful-coach explain this");
  assert(blockedSpecificMention.agents.length === 0, "room allowlist suppresses specific mentions for agents outside the allowlist");
  const allowedSpecificMention = decideWorkspaceAgentsForMessage(multiAgentView, allowlistedRoom, "@practice-buddy make two examples");
  assert(
    allowedSpecificMention.agents.length === 1 && allowedSpecificMention.agents[0].profile?.id === secondProfile.id,
    "room allowlist keeps specific mentions for selected agents active",
  );
  const allowlistedCoordinator = decideWorkspaceAgentsForMessage(multiAgentView, allowlistedRoom, "@agents who should handle this?");
  assert(
    allowlistedCoordinator.agents.length === 1 && allowlistedCoordinator.agents[0].profile?.id === secondProfile.id,
    "room allowlist constrains generic coordinator selection to selected agents",
  );
  const noAgentsRoom: WorkspaceThread = {
    ...room,
    allowedAgentProfileIds: [],
  };
  const noAgentsDecision = decideWorkspaceAgentsForMessage(multiAgentView, noAgentsRoom, "@practice-buddy make two examples");
  assert(noAgentsDecision.agents.length === 0, "empty room allowlist suppresses all room agent triggers");

  const silent = selectWorkspaceAgentsForMessage(view, room, "Can anyone explain this?");
  assert(silent.length === 0, "room messages without mention stay silent");
  const silentDecision = decideWorkspaceAgentsForMessage(view, room, "Can anyone explain this?");
  assert(silentDecision.reason === "none" && silentDecision.agents.length === 0, "silent room message returns no-agent decision");

  process.stdout.write("[workspace.agent-triggers.unit] ALL TRIGGER CHECKS PASSED\n");
}

void main().catch((error) => {
  process.stderr.write(`[workspace.agent-triggers.unit] FAILED: ${(error as Error).message}\n`);
  process.exit(1);
});
