import type { WorkspaceAgentProfile, WorkspaceAgentRunTrigger, WorkspaceMember, WorkspaceThread, WorkspaceView } from "./types";

export type WorkspaceAgentParticipant = {
  member: WorkspaceMember;
  profile?: WorkspaceAgentProfile;
};

export type WorkspaceAgentTriggerDecision = {
  agents: WorkspaceAgentParticipant[];
  trigger: WorkspaceAgentRunTrigger;
  reason: "mention" | "direct_agent_chat" | "coordinator" | "quiet_review" | "mention_only" | "none";
  confidence: number;
};

export function isWorkspaceAgentMember(member: WorkspaceMember) {
  if (member.agentProfileId) return true;
  const role = member.role.trim().toLowerCase();
  return role === "agent" || role === "ai" || role === "ai teammate";
}

export function selectWorkspaceAgentsForMessage(
  view: Pick<WorkspaceView, "members" | "agentProfiles">,
  thread: WorkspaceThread,
  content: string,
): WorkspaceAgentParticipant[] {
  return decideWorkspaceAgentsForMessage(view, thread, content).agents;
}

export function decideWorkspaceAgentsForMessage(
  view: Pick<WorkspaceView, "members" | "agentProfiles">,
  thread: WorkspaceThread,
  content: string,
): WorkspaceAgentTriggerDecision {
  const roomAllowedProfileIds =
    thread.type === "room" && Array.isArray(thread.allowedAgentProfileIds)
      ? new Set(thread.allowedAgentProfileIds)
      : undefined;
  const agents = view.members
    .filter(isWorkspaceAgentMember)
    .map((member) => ({
      member,
      profile: member.agentProfileId ? view.agentProfiles.find((profile) => profile.id === member.agentProfileId) : undefined,
    }))
    .filter((agent) => !roomAllowedProfileIds || (agent.profile?.id && roomAllowedProfileIds.has(agent.profile.id)));
  if (!agents.length) return noAgentDecision();
  const triggerMode = thread.agentTriggerMode ?? "room_default";

  const normalizedContent = content.toLowerCase();
  const mentionedAgents = agents.filter((agent) => {
    const name = agent.member.displayName.toLowerCase();
    const displayHandle = normalizeAgentHandle(agent.member.displayName);
    const profileHandle = agent.profile?.handle.toLowerCase();
    return (
      normalizedContent.includes(`@${name}`) ||
      normalizedContent.includes(`@${displayHandle}`) ||
      Boolean(profileHandle && normalizedContent.includes(`@${profileHandle}`))
    );
  });
  if (thread.type === "room" && triggerMode === "quiet_review") {
    return { agents: [], trigger: "manual", reason: "quiet_review", confidence: 1 };
  }
  if (mentionedAgents.length) return { agents: mentionedAgents.slice(0, 1), trigger: "mention", reason: "mention", confidence: 1 };
  if (thread.type === "room" && triggerMode === "mention_only") {
    return { agents: [], trigger: "mention", reason: "mention_only", confidence: 1 };
  }
  if (/\@(agent|agents|ai)\b/i.test(content)) return { agents: agents.slice(0, 1), trigger: "coordinator", reason: "coordinator", confidence: 0.8 };
  if (thread.type === "direct" && thread.participantIds?.length) {
    const participantIds = new Set(thread.participantIds);
    const directAgents = agents.filter((agent) => participantIds.has(agent.member.id));
    if (directAgents.length !== 1) return noAgentDecision();
    const humanParticipantCount = thread.participantIds.filter((memberId) => {
      const member = view.members.find((entry) => entry.id === memberId);
      return member && !isWorkspaceAgentMember(member);
    }).length;
    return humanParticipantCount <= 1 ? { agents: directAgents, trigger: "direct_chat", reason: "direct_agent_chat", confidence: 1 } : noAgentDecision();
  }
  return noAgentDecision();
}

export function normalizeAgentHandle(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function noAgentDecision(): WorkspaceAgentTriggerDecision {
  return { agents: [], trigger: "mention", reason: "none", confidence: 0 };
}
