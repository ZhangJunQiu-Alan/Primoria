import { workspaceArtifacts } from "../db/schema";
import type {
  WorkspaceArtifact,
  WorkspaceArtifactKind,
  WorkspaceArtifactReviewStatus,
  WorkspaceMessage,
  WorkspaceMessageArtifact,
} from "./types";

export type WorkspaceArtifactSeedInput = {
  workspaceId: string;
  threadId: string;
  title: string;
  description: string;
  kind?: WorkspaceArtifactKind;
  reviewStatus?: WorkspaceArtifactReviewStatus;
  payload: WorkspaceMessageArtifact;
  sourceRunId?: string;
  now?: number;
};

export type WorkspaceArtifactMessageBundle = {
  message: WorkspaceMessage;
  artifact: WorkspaceArtifact;
};

export function inferWorkspaceArtifactKind(artifact: WorkspaceMessageArtifact): WorkspaceArtifactKind {
  const groups = new Set(artifact.groups.map((group) => group.trim().toLowerCase()).filter(Boolean));
  if (groups.has("course")) return "course";
  if (groups.has("task result")) return "task_result";
  return "saved_artifact";
}

export function defaultWorkspaceArtifactReviewStatus(kind: WorkspaceArtifactKind): WorkspaceArtifactReviewStatus {
  return "needs_review";
}

export function buildWorkspaceArtifactRecord(input: WorkspaceArtifactSeedInput & { sourceMessageId: string }): WorkspaceArtifact {
  const kind = input.kind ?? inferWorkspaceArtifactKind(input.payload);
  return {
    id: `wart_${input.sourceMessageId}`,
    workspaceId: input.workspaceId,
    threadId: input.threadId,
    kind,
    title: input.title,
    description: input.description,
    reviewStatus: input.reviewStatus ?? defaultWorkspaceArtifactReviewStatus(kind),
    sourceMessageId: input.sourceMessageId,
    sourceRunId: input.sourceRunId,
    payload: input.payload,
    createdAt: input.now ?? Date.now(),
    updatedAt: input.now ?? Date.now(),
  };
}

export function alignWorkspaceArtifactCompatibilitySnapshot(artifact: WorkspaceMessageArtifact, title: string, description: string): WorkspaceMessageArtifact {
  return {
    ...artifact,
    title,
    description,
  };
}

export function buildWorkspaceArtifactFromMessage(message: WorkspaceMessage, sourceRunId?: string): WorkspaceArtifact | undefined {
  if (!message.artifact) return undefined;
  return buildWorkspaceArtifactRecord({
    workspaceId: message.workspaceId,
    threadId: message.threadId,
    title: message.artifact.title,
    description: message.artifact.description,
    sourceMessageId: message.id,
    sourceRunId,
    payload: message.artifact,
    now: message.createdAt,
  });
}

export function upsertWorkspaceArtifact(artifacts: WorkspaceArtifact[], artifact: WorkspaceArtifact) {
  return [artifact, ...artifacts.filter((entry) => entry.id !== artifact.id)].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function dbWorkspaceArtifactValues(artifact: WorkspaceArtifact, ownerId: string) {
  return {
    id: artifact.id,
    workspaceId: artifact.workspaceId,
    threadId: artifact.threadId,
    ownerId,
    kind: artifact.kind,
    title: artifact.title,
    description: artifact.description,
    reviewStatus: artifact.reviewStatus,
    sourceMessageId: artifact.sourceMessageId,
    sourceRunId: artifact.sourceRunId ?? null,
    payload: artifact.payload,
    createdAt: new Date(artifact.createdAt),
    updatedAt: new Date(artifact.updatedAt),
  };
}

export function rowToWorkspaceArtifact(artifact: typeof workspaceArtifacts.$inferSelect): WorkspaceArtifact {
  return {
    id: artifact.id,
    workspaceId: artifact.workspaceId,
    threadId: artifact.threadId,
    kind: artifact.kind as WorkspaceArtifact["kind"],
    title: artifact.title,
    description: artifact.description,
    reviewStatus: (artifact.reviewStatus as WorkspaceArtifactReviewStatus | undefined) ?? defaultWorkspaceArtifactReviewStatus(artifact.kind as WorkspaceArtifactKind),
    sourceMessageId: artifact.sourceMessageId,
    sourceRunId: artifact.sourceRunId ?? undefined,
    payload: artifact.payload as WorkspaceMessageArtifact,
    createdAt: artifact.createdAt.getTime(),
    updatedAt: artifact.updatedAt.getTime(),
  };
}
