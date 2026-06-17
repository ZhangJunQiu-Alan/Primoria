import { isLocalWorkspaceAgentMemoryVisibleToOwner } from "./agent-memory-service";
import { limitMessagesPerThread, MESSAGE_WINDOW_PER_THREAD } from "./workspace-message-service";
import type { WorkspaceView } from "./types";

export function withVisibleAgentMemories(view: WorkspaceView, ownerId?: string | null) {
  return {
    ...view,
    agentMemories: view.agentMemories.filter((memory) => !memory.archivedAt && isLocalWorkspaceAgentMemoryVisibleToOwner(memory, ownerId)),
  };
}

export function withMessageWindow(view: WorkspaceView) {
  return {
    ...view,
    messages: limitMessagesPerThread(view.messages, MESSAGE_WINDOW_PER_THREAD),
  };
}

export function withWorkspaceList(view: WorkspaceView, views: WorkspaceView[]) {
  return {
    ...view,
    workspaces: views.map((entry) => entry.workspace).sort((a, b) => b.updatedAt - a.updatedAt),
  };
}

export function withPersonalAgentLibrary(view: WorkspaceView, views: WorkspaceView[], ownerId?: string | null) {
  const currentProfileIds = new Set(view.agentProfiles.map((profile) => profile.id));
  const personalProfiles = views.flatMap((entry) =>
    entry.agentProfiles.filter((profile) => profile.visibility === "private" && profile.ownerId === (ownerId ?? undefined) && !currentProfileIds.has(profile.id)),
  );
  if (!personalProfiles.length) return view;
  return {
    ...view,
    agentProfiles: [...view.agentProfiles, ...personalProfiles].sort((a, b) => a.createdAt - b.createdAt),
  };
}
