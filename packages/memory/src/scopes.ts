import type { MemoryScope } from "./types";

export function memoryScopeMetadata(scope: MemoryScope): Record<string, string> {
  if (scope.type === "user") return { scope: "user", user_id: scope.userId };
  if (scope.type === "user_course") {
    return {
      scope: "user_course",
      user_id: scope.userId,
      course_id: scope.courseId,
    };
  }
  if (scope.type === "agent") return { scope: "agent", agent_id: scope.agentId };
  if (scope.type === "workspace") return { scope: "workspace", workspace_id: scope.workspaceId };
  return { scope: "system" };
}

export function memoryScopeUserId(scope: MemoryScope): string | undefined {
  if (scope.type === "user" || scope.type === "user_course") return scope.userId;
  return undefined;
}

export function memoryScopeRunId(scope: MemoryScope, fallback?: string): string | undefined {
  if (scope.type === "user_course") return `course:${scope.courseId}`;
  if (scope.type === "agent") return `agent:${scope.agentId}`;
  if (scope.type === "workspace") return `workspace:${scope.workspaceId}`;
  return fallback;
}

export function memoryScopeFilters(scope: MemoryScope): Record<string, string> {
  const metadata = memoryScopeMetadata(scope);
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [`metadata.${key}`, value]));
}
