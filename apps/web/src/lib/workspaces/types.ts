import type { LearningAppTemplate } from "@/lib/capability-library/types";
import type { AgentEvent, AgentSignal } from "@primoria/contracts/agent";

export type WorkspaceThreadType = "room" | "direct";
export type WorkspaceThreadAgentTriggerMode = "mention_only" | "room_default" | "quiet_review";
export type WorkspaceSenderKind = "human" | "agent" | "system";

export type WorkspaceSummary = {
  id: string;
  name: string;
  inviteCode?: string;
  createdAt: number;
  updatedAt: number;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  displayName: string;
  role: string;
  status?: string;
  agentProfileId?: string;
};

export type WorkspaceAgentCapability =
  | {
      id: string;
      profileId: string;
      kind: "skill";
      source: "system" | "workspace" | "user";
      path: string;
      enabled: boolean;
    }
  | {
      id: string;
      profileId: string;
      kind: "internal_tool";
      toolName: string;
      approval: "never" | "on_risk" | "always";
      enabled: boolean;
    }
  | {
      id: string;
      profileId: string;
      kind: "mcp_tool";
      connectionId: string;
      toolName: string;
      approval: "on_risk" | "always";
      enabled: boolean;
    }
  | {
      id: string;
      profileId: string;
      kind: "subagent";
      agentProfileId: string;
      enabled: boolean;
    };

export type WorkspaceAgentCapabilityInput =
  | Omit<Extract<WorkspaceAgentCapability, { kind: "skill" }>, "id" | "profileId">
  | Omit<Extract<WorkspaceAgentCapability, { kind: "internal_tool" }>, "id" | "profileId">
  | Omit<Extract<WorkspaceAgentCapability, { kind: "mcp_tool" }>, "id" | "profileId">
  | Omit<Extract<WorkspaceAgentCapability, { kind: "subagent" }>, "id" | "profileId">;

export type WorkspaceAgentProfile = {
  id: string;
  workspaceId: string;
  ownerId?: string;
  displayName: string;
  handle: string;
  description: string;
  visibility: "private" | "workspace" | "public_template";
  templateKey?: string;
  systemPrompt: string;
  defaultModel?: string;
  memoryScope: "none" | "user" | "workspace" | "thread";
  capabilities: WorkspaceAgentCapability[];
  createdAt: number;
  updatedAt: number;
};

export type WorkspaceAgentTemplate = {
  key: string;
  displayName: string;
  handle: string;
  description: string;
  systemPrompt: string;
  memoryScope: WorkspaceAgentProfile["memoryScope"];
  capabilities: WorkspaceAgentCapabilityInput[];
};

export type WorkspaceThread = {
  id: string;
  workspaceId: string;
  type: WorkspaceThreadType;
  name: string;
  description?: string;
  agentTriggerMode?: WorkspaceThreadAgentTriggerMode;
  allowedAgentProfileIds?: string[];
  participantIds?: string[];
  createdAt: number;
  updatedAt: number;
};

export type WorkspaceMessageArtifact =
  | {
      type: "app";
      appId?: string;
      version?: number;
      template?: LearningAppTemplate;
      title: string;
      description: string;
      primaryAction: string;
      secondaryAction?: string;
    }
  | {
      type: "task";
      title: string;
      description: string;
      groups: string[];
    };

export type WorkspaceMessage = {
  id: string;
  workspaceId: string;
  threadId: string;
  senderName: string;
  senderKind: WorkspaceSenderKind;
  content: string;
  artifact?: WorkspaceMessageArtifact;
  createdAt: number;
};

export type WorkspaceArtifactKind = "app" | "task_result" | "course" | "saved_artifact";
export type WorkspaceArtifactReviewStatus = "needs_review" | "reviewed";

export type WorkspaceArtifact = {
  id: string;
  workspaceId: string;
  threadId: string;
  kind: WorkspaceArtifactKind;
  title: string;
  description: string;
  reviewStatus: WorkspaceArtifactReviewStatus;
  sourceMessageId: string;
  sourceRunId?: string;
  payload: WorkspaceMessageArtifact;
  createdAt: number;
  updatedAt: number;
};

export type WorkspaceTask = {
  id: string;
  workspaceId: string;
  threadId: string;
  title: string;
  scope: string;
  status: string;
  progress: string;
  assigneeId?: string;
  assigneeName?: string;
  resultSummary?: string;
  submittedAt?: number;
  sourceArtifactId?: string;
  sourceRunId?: string;
  dueAt?: string;
  createdAt: number;
  updatedAt: number;
};

export type WorkspaceAgentRunStatus = "queued" | "running" | "waiting_for_approval" | "completed" | "failed" | "cancelled";

export type WorkspaceAgentRunTrigger = "mention" | "direct_chat" | "task_assignment" | "coordinator" | "manual";

export type WorkspaceAgentRun = {
  id: string;
  workspaceId: string;
  threadId: string;
  agentProfileId: string;
  agentMemberId?: string;
  trigger: WorkspaceAgentRunTrigger;
  status: WorkspaceAgentRunStatus;
  inputMessageId?: string;
  outputMessageId?: string;
  taskId?: string;
  startedAt: number;
  completedAt?: number;
  error?: string;
};

export type WorkspaceAgentRunEvent = {
  id: string;
  runId: string;
  workspaceId: string;
  threadId: string;
  type: "status" | "todo" | "tool_start" | "tool_end" | "subagent_start" | "subagent_end" | "approval_request" | "ask_user_request" | "artifact" | "message_delta";
  label: string;
  payload?: unknown;
  createdAt: number;
};

export type WorkspaceAgentApprovalStatus = "pending" | "approved" | "denied" | "expired";

export type WorkspaceAgentApproval = {
  id: string;
  workspaceId: string;
  threadId: string;
  runId: string;
  agentProfileId: string;
  agentMemberId?: string;
  toolName: string;
  status: WorkspaceAgentApprovalStatus;
  input?: unknown;
  policy?: unknown;
  deepAgentThreadId?: string;
  requestedAt: number;
  decidedAt?: number;
  decidedBy?: string;
  decisionReason?: string;
};

export type WorkspaceAgentMemoryScope = "user" | "workspace" | "thread";

export type WorkspaceAgentMemory = {
  id: string;
  workspaceId?: string;
  userId?: string;
  threadId?: string;
  agentProfileId: string;
  scope: WorkspaceAgentMemoryScope;
  title: string;
  summary: string;
  sourceRunId?: string;
  sourceMessageId?: string;
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
};

export type WorkspaceAgentConnectionTransport = "stdio" | "http" | "sse";
export type WorkspaceAgentConnectionScope = "user" | "workspace";
export type WorkspaceAgentConnectionStatus = "available" | "disabled";

export type WorkspaceAgentConnection = {
  id: string;
  workspaceId?: string;
  ownerId?: string;
  scope: WorkspaceAgentConnectionScope;
  displayName: string;
  transport: WorkspaceAgentConnectionTransport;
  configRef: string;
  allowedToolNames: string[];
  status: WorkspaceAgentConnectionStatus;
  createdAt: number;
  updatedAt: number;
};

export type WorkspaceView = {
  workspace: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
  members: WorkspaceMember[];
  agentProfiles: WorkspaceAgentProfile[];
  threads: WorkspaceThread[];
  messages: WorkspaceMessage[];
  tasks: WorkspaceTask[];
  artifacts: WorkspaceArtifact[];
  agentRuns: WorkspaceAgentRun[];
  agentRunEvents: WorkspaceAgentRunEvent[];
  agentApprovals: WorkspaceAgentApproval[];
  agentMemories: WorkspaceAgentMemory[];
  agentConnections: WorkspaceAgentConnection[];
  persisted: boolean;
};

export type WorkspaceAgentRunResult = {
  messages: WorkspaceMessage[];
  runs: WorkspaceAgentRun[];
  events: WorkspaceAgentRunEvent[];
  agentEvents?: AgentEvent[];
  agentSignals?: AgentSignal[];
  approvals?: WorkspaceAgentApproval[];
  memories?: WorkspaceAgentMemory[];
  artifacts?: WorkspaceArtifact[];
  task?: WorkspaceTask;
};

export type WorkspaceAgentApprovalDecisionResult = {
  approval: WorkspaceAgentApproval;
  approvals?: WorkspaceAgentApproval[];
  run: WorkspaceAgentRun;
  events: WorkspaceAgentRunEvent[];
  agentEvents?: AgentEvent[];
  agentSignals?: AgentSignal[];
  task?: WorkspaceTask;
  message?: WorkspaceMessage;
  artifact?: WorkspaceArtifact;
  memory?: WorkspaceAgentMemory;
};

export type CancelWorkspaceAgentRunInput = {
  workspaceId: string;
  runId: string;
  reason?: string;
  cancelledBy?: string;
};

export type WorkspaceAgentRunCancelResult = {
  run: WorkspaceAgentRun;
  events: WorkspaceAgentRunEvent[];
  agentEvents?: AgentEvent[];
  agentSignals?: AgentSignal[];
  approvals: WorkspaceAgentApproval[];
};

export type RetryWorkspaceAgentRunInput = {
  workspaceId: string;
  runId: string;
};

export type WorkspaceAgentRunPage = {
  runs: WorkspaceAgentRun[];
  events: WorkspaceAgentRunEvent[];
  agentEvents?: AgentEvent[];
  agentSignals?: AgentSignal[];
  approvals: WorkspaceAgentApproval[];
};

export type WorkspaceAgentRunDetail = {
  run: WorkspaceAgentRun;
  events: WorkspaceAgentRunEvent[];
  agentEvents?: AgentEvent[];
  agentSignals?: AgentSignal[];
  approvals: WorkspaceAgentApproval[];
  inputMessage?: WorkspaceMessage;
  outputMessage?: WorkspaceMessage;
  task?: WorkspaceTask;
  artifacts?: WorkspaceArtifact[];
  memories?: WorkspaceAgentMemory[];
};

export type WorkspaceMessagePage = {
  messages: WorkspaceMessage[];
  hasMore: boolean;
};

export type CreateWorkspaceMessageInput = {
  workspaceId: string;
  threadId: string;
  content: string;
  senderName?: string;
  senderKind?: WorkspaceSenderKind;
  artifact?: WorkspaceMessageArtifact;
};

export type CreateWorkspaceInput = {
  name: string;
  ownerName?: string;
};

export type CreateWorkspaceMemberInput = {
  workspaceId: string;
  displayName: string;
  role?: string;
  status?: string;
  agentProfileId?: string;
};

export type CreateWorkspaceAgentProfileInput = {
  workspaceId: string;
  templateKey?: string;
  displayName?: string;
  description?: string;
  systemPrompt?: string;
  visibility?: WorkspaceAgentProfile["visibility"];
  memoryScope?: WorkspaceAgentProfile["memoryScope"];
  capabilities?: WorkspaceAgentCapabilityInput[];
};

export type UpdateWorkspaceAgentProfileInput = {
  workspaceId: string;
  profileId: string;
  displayName?: string;
  description?: string;
  systemPrompt?: string;
  visibility?: WorkspaceAgentProfile["visibility"];
  memoryScope?: WorkspaceAgentProfile["memoryScope"];
  capabilities?: WorkspaceAgentCapabilityInput[];
};

export type DeleteWorkspaceAgentProfileInput = {
  workspaceId: string;
  profileId: string;
};

export type CreateWorkspaceAgentMemberInput = {
  workspaceId: string;
  profileId: string;
};

export type CreateWorkspaceAgentConnectionInput = {
  workspaceId: string;
  scope: WorkspaceAgentConnectionScope;
  displayName: string;
  transport: WorkspaceAgentConnectionTransport;
  configRef: string;
  allowedToolNames: string[];
};

export type UpdateWorkspaceAgentConnectionInput = {
  workspaceId: string;
  connectionId: string;
  displayName?: string;
  configRef?: string;
  allowedToolNames?: string[];
  status?: WorkspaceAgentConnectionStatus;
};

export type JoinWorkspaceInput = {
  inviteCode: string;
  displayName?: string;
};

export type CreateWorkspaceThreadInput = {
  workspaceId: string;
  type: WorkspaceThreadType;
  name: string;
  description?: string;
  agentTriggerMode?: WorkspaceThreadAgentTriggerMode;
  allowedAgentProfileIds?: string[];
  participantIds?: string[];
};

export type UpdateWorkspaceThreadInput = {
  workspaceId: string;
  threadId: string;
  agentTriggerMode?: WorkspaceThreadAgentTriggerMode;
  allowedAgentProfileIds?: string[] | null;
};

export type CreateWorkspaceTaskInput = {
  workspaceId: string;
  threadId: string;
  title: string;
  scope?: string;
  progress?: string;
  assigneeId?: string;
  dueAt?: string;
  sourceArtifactId?: string;
  sourceRunId?: string;
};

export type UpdateWorkspaceTaskInput = {
  workspaceId: string;
  taskId: string;
  status: string;
  progress?: string;
  assigneeId?: string;
  resultSummary?: string;
};

export type DecideWorkspaceAgentApprovalInput = {
  workspaceId: string;
  approvalId: string;
  decision: "approved" | "denied";
  decidedBy?: string;
  reason?: string;
};

export type CreateWorkspaceAgentMemoryInput = {
  workspaceId: string;
  agentProfileId: string;
  scope: WorkspaceAgentMemoryScope;
  title: string;
  summary: string;
  threadId?: string;
  userId?: string;
  sourceRunId?: string;
  sourceMessageId?: string;
};

export type ArchiveWorkspaceAgentMemoryInput = {
  workspaceId: string;
  memoryId: string;
};

export type RestoreWorkspaceAgentMemoryInput = {
  workspaceId: string;
  memoryId: string;
};

export type DeleteWorkspaceAgentMemoryInput = {
  workspaceId: string;
  memoryId: string;
};

export type ArchiveWorkspaceAgentMemoriesInput = {
  workspaceId: string;
  memoryIds: string[];
};

export type ListWorkspaceAgentMemoriesInput = {
  workspaceId: string;
  includeArchived?: boolean;
};

export type WorkspaceAgentMemoryPage = {
  memories: WorkspaceAgentMemory[];
};
