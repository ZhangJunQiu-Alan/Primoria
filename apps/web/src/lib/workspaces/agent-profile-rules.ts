import { randomBytes } from "node:crypto";
import { AGENT_BEHAVIOR_MAX_LENGTH, AGENT_PURPOSE_MAX_LENGTH } from "./agent-profile-guardrails";
import { resolveWorkspaceAgentSkillPath } from "./agent-skill-paths";
import { isWorkspaceInternalToolName, WORKSPACE_INTERNAL_TOOL_POLICIES, type WorkspaceToolApproval } from "./agent-tools";
import type { WorkspaceAgentCapability, WorkspaceAgentCapabilityInput, WorkspaceAgentTemplate } from "./types";

export const WORKSPACE_AGENT_TEMPLATES: WorkspaceAgentTemplate[] = [
  {
    key: "socratic-coach",
    displayName: "Socratic Coach",
    handle: "socratic-coach",
    description: "Asks guiding questions and helps learners reason without giving full answers too early.",
    systemPrompt: "You are a Socratic learning coach. Ask focused questions, surface assumptions, and help the learner make the next step themselves.",
    memoryScope: "thread",
    capabilities: [
      { kind: "skill", source: "system", path: "/skills/socratic-questioning", enabled: true },
      { kind: "skill", source: "system", path: "/skills/misconception-diagnosis", enabled: true },
      { kind: "internal_tool", toolName: "summarize_thread", approval: "never", enabled: true },
      { kind: "internal_tool", toolName: "create_quiz", approval: "never", enabled: true },
    ],
  },
  {
    key: "visualizer",
    displayName: "Visualizer",
    handle: "visualizer",
    description: "Turns abstract ideas into compact interactive explanations and simulations.",
    systemPrompt: "You are a visualization agent. Preserve the learner's concrete constraints and build compact visual explanations when helpful.",
    memoryScope: "workspace",
    capabilities: [
      { kind: "skill", source: "system", path: "/skills/visual-explainer", enabled: true },
      { kind: "internal_tool", toolName: "render_interactive_widget", approval: "always", enabled: true },
      { kind: "internal_tool", toolName: "save_learning_artifact", approval: "always", enabled: true },
    ],
  },
  {
    key: "examiner",
    displayName: "Examiner",
    handle: "examiner",
    description: "Creates practice questions, checks answers, and identifies weak points.",
    systemPrompt: "You are an examiner. Create targeted practice, grade answers constructively, and explain the next improvement step.",
    memoryScope: "user",
    capabilities: [
      { kind: "skill", source: "system", path: "/skills/quiz-generation", enabled: true },
      { kind: "skill", source: "system", path: "/skills/misconception-diagnosis", enabled: true },
      { kind: "internal_tool", toolName: "create_quiz", approval: "never", enabled: true },
      { kind: "internal_tool", toolName: "save_learning_artifact", approval: "always", enabled: true },
    ],
  },
  {
    key: "project-mentor",
    displayName: "Project Mentor",
    handle: "project-mentor",
    description: "Breaks learning goals into concrete project tasks and review checkpoints.",
    systemPrompt: "You are a project mentor. Turn vague goals into small tasks, checkpoints, and review loops.",
    memoryScope: "workspace",
    capabilities: [
      { kind: "skill", source: "system", path: "/skills/project-breakdown", enabled: true },
      { kind: "internal_tool", toolName: "create_workspace_task", approval: "on_risk", enabled: true },
      { kind: "internal_tool", toolName: "update_workspace_task", approval: "on_risk", enabled: true },
      { kind: "internal_tool", toolName: "save_learning_artifact", approval: "always", enabled: true },
    ],
  },
  {
    key: "research-buddy",
    displayName: "Research Buddy",
    handle: "research-buddy",
    description: "Finds grounded references in the workspace context and prepares source-aware summaries.",
    systemPrompt: "You are a research buddy. Ground claims in available context, separate evidence from assumptions, and ask before using external connections.",
    memoryScope: "thread",
    capabilities: [
      { kind: "skill", source: "system", path: "/skills/source-grounded-research", enabled: true },
      { kind: "internal_tool", toolName: "search_workspace_messages", approval: "never", enabled: true },
      { kind: "internal_tool", toolName: "summarize_thread", approval: "never", enabled: true },
      { kind: "internal_tool", toolName: "save_learning_artifact", approval: "always", enabled: true },
    ],
  },
  {
    key: "course-designer",
    displayName: "Course Designer",
    handle: "course-designer",
    description: "Turns a goal into a structured course plan, activities, and assessment checkpoints.",
    systemPrompt: "You are a course designer. Convert learning goals into modular plans with activities, deliverables, assessment checkpoints, and review loops.",
    memoryScope: "workspace",
    capabilities: [
      { kind: "skill", source: "system", path: "/skills/project-breakdown", enabled: true },
      { kind: "skill", source: "system", path: "/skills/quiz-generation", enabled: true },
      { kind: "internal_tool", toolName: "generate_course", approval: "always", enabled: true },
      { kind: "internal_tool", toolName: "create_quiz", approval: "never", enabled: true },
      { kind: "internal_tool", toolName: "save_learning_artifact", approval: "always", enabled: true },
    ],
  },
  {
    key: "critic-reviewer",
    displayName: "Critic / Reviewer",
    handle: "critic-reviewer",
    description: "Reviews artifacts and learner attempts with strengths, risks, and concrete next actions.",
    systemPrompt: "You are a critic and reviewer. Give concise, kind, specific review notes with one strength, one risk, and one next action.",
    memoryScope: "thread",
    capabilities: [
      { kind: "skill", source: "system", path: "/skills/artifact-review", enabled: true },
      { kind: "skill", source: "system", path: "/skills/misconception-diagnosis", enabled: true },
      { kind: "internal_tool", toolName: "summarize_thread", approval: "never", enabled: true },
      { kind: "internal_tool", toolName: "update_workspace_task", approval: "on_risk", enabled: true },
      { kind: "internal_tool", toolName: "save_learning_artifact", approval: "always", enabled: true },
    ],
  },
];

export function slugifyAgentHandle(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "workspace-agent"
  );
}

export async function createUniqueAgentHandle(baseHandle: string, exists: (handle: string) => boolean | Promise<boolean>) {
  const base = slugifyAgentHandle(baseHandle);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const handle = attempt === 0 ? base : `${base}-${attempt + 1}`;
    if (!(await exists(handle))) return handle;
  }
  throw new Error("Agent handle could not be generated.");
}

export function buildAgentCapabilities(profileId: string, capabilities: WorkspaceAgentCapabilityInput[]) {
  return capabilities.map((capability): WorkspaceAgentCapability => {
    const base = {
      id: `wcap_${randomBytes(10).toString("base64url")}`,
      profileId,
      enabled: capability.enabled,
    };
    if (capability.kind === "skill") {
      return { ...base, kind: "skill", source: capability.source, path: capability.path };
    }
    if (capability.kind === "internal_tool") {
      return { ...base, kind: "internal_tool", toolName: capability.toolName, approval: capability.approval };
    }
    if (capability.kind === "mcp_tool") {
      return {
        ...base,
        kind: "mcp_tool",
        connectionId: capability.connectionId,
        toolName: capability.toolName,
        approval: capability.approval,
      };
    }
    return { ...base, kind: "subagent", agentProfileId: capability.agentProfileId };
  });
}

export function assertAgentProfileHasRunnableCapability(capabilities: WorkspaceAgentCapabilityInput[]) {
  if (!capabilities.some((capability) => capability.enabled)) {
    throw new Error("Agent profile must include at least one enabled skill, action, delegate, or connection.");
  }
}

export function assertAgentSkillCapabilityPaths(ownerId: string | null | undefined, workspaceId: string, capabilities: WorkspaceAgentCapabilityInput[]) {
  for (const capability of capabilities) {
    if (capability.kind !== "skill" || !capability.enabled) continue;
    if (capability.source === "system" && /^\/skills\/[a-z0-9-]+$/.test(capability.path)) {
      if (!resolveWorkspaceAgentSkillPath(capability.path)) throw new Error("System skill not found.");
      continue;
    }
    if (capability.source === "workspace" && capability.path.startsWith(`/workspace-skills/${workspaceId}/`) && /^\/workspace-skills\/[^/]+\/[a-z0-9-]+$/.test(capability.path)) continue;
    if (capability.source === "user" && ownerId && capability.path.startsWith(`/user-skills/${ownerId}/`) && /^\/user-skills\/[^/]+\/[a-z0-9-]+$/.test(capability.path)) continue;
    throw new Error("Skill source does not match path.");
  }
}

export function assertAgentInternalToolCapabilities(capabilities: WorkspaceAgentCapabilityInput[]) {
  for (const capability of capabilities) {
    if (capability.kind !== "internal_tool" || !capability.enabled) continue;
    if (!isWorkspaceInternalToolName(capability.toolName)) {
      throw new Error("Unknown internal tool capability.");
    }
    const policy = WORKSPACE_INTERNAL_TOOL_POLICIES[capability.toolName];
    if (approvalRank(capability.approval) < approvalRank(policy.approval)) {
      throw new Error("Internal tool approval cannot be weaker than policy.");
    }
  }
}

export function assertAgentConnectionToolCapabilities(capabilities: WorkspaceAgentCapabilityInput[]) {
  for (const capability of capabilities) {
    if (capability.kind !== "mcp_tool" || !capability.enabled) continue;
    if (capability.approval !== "always") {
      throw new Error("External connection tools always require approval.");
    }
  }
}

function approvalRank(approval: WorkspaceToolApproval) {
  if (approval === "always") return 2;
  if (approval === "on_risk") return 1;
  return 0;
}

export function assertAgentProfileTextGuardrails(input: {
  templateKey?: string;
  description?: string;
  systemPrompt?: string;
  requireDescription?: boolean;
  requireSystemPrompt?: boolean;
}) {
  if (!input.templateKey && input.requireDescription !== false && !input.description?.trim()) {
    throw new Error("Custom agents must include a purpose.");
  }
  if (!input.templateKey && input.requireSystemPrompt !== false && !input.systemPrompt?.trim()) {
    throw new Error("Custom agents must include behavior instructions.");
  }
  if (input.description !== undefined && !input.description.trim()) {
    throw new Error("Agent purpose cannot be blank.");
  }
  if (input.description !== undefined && input.description.trim().length > AGENT_PURPOSE_MAX_LENGTH) {
    throw new Error("Agent purpose is too long.");
  }
  if (input.systemPrompt !== undefined && !input.systemPrompt.trim()) {
    throw new Error("Agent behavior cannot be blank.");
  }
  if (input.systemPrompt !== undefined && input.systemPrompt.trim().length > AGENT_BEHAVIOR_MAX_LENGTH) {
    throw new Error("Agent behavior is too long.");
  }
}
