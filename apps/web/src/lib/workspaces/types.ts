import type { LearningAppTemplate } from "@/lib/capability-library/types";

export type WorkspaceThreadType = "room" | "direct";
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
};

export type WorkspaceThread = {
  id: string;
  workspaceId: string;
  type: WorkspaceThreadType;
  name: string;
  description?: string;
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
  dueAt?: string;
  createdAt: number;
  updatedAt: number;
};

export type WorkspaceView = {
  workspace: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
  members: WorkspaceMember[];
  threads: WorkspaceThread[];
  messages: WorkspaceMessage[];
  tasks: WorkspaceTask[];
  persisted: boolean;
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
  participantIds?: string[];
};

export type CreateWorkspaceTaskInput = {
  workspaceId: string;
  threadId: string;
  title: string;
  scope?: string;
  progress?: string;
  assigneeId?: string;
  dueAt?: string;
};

export type UpdateWorkspaceTaskInput = {
  workspaceId: string;
  taskId: string;
  status: string;
  progress?: string;
  assigneeId?: string;
  resultSummary?: string;
};
