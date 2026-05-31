type WorkspaceChangeListener = () => void;

const listeners = new Map<string, Set<WorkspaceChangeListener>>();

export function subscribeWorkspaceChanges(workspaceId: string, listener: WorkspaceChangeListener) {
  const workspaceListeners = listeners.get(workspaceId) ?? new Set<WorkspaceChangeListener>();
  workspaceListeners.add(listener);
  listeners.set(workspaceId, workspaceListeners);
  return () => {
    workspaceListeners.delete(listener);
    if (workspaceListeners.size === 0) listeners.delete(workspaceId);
  };
}

export function notifyWorkspaceChanged(workspaceId: string) {
  const workspaceListeners = listeners.get(workspaceId);
  if (!workspaceListeners?.size) return;
  for (const listener of Array.from(workspaceListeners)) {
    listener();
  }
}
