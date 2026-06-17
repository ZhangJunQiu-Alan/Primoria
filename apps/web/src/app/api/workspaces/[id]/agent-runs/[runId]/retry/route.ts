import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { getWorkspaceView, retryWorkspaceAgentRun } from "@/lib/workspaces/store";

export async function POST(_request: Request, context: { params: Promise<{ id: string; runId: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id, runId } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  try {
    const result = await retryWorkspaceAgentRun(ownerId, { workspaceId: id, runId });
    return NextResponse.json({
      agentMessages: result.messages,
      agentRuns: result.runs,
      agentRunEvents: result.events,
      agentEvents: result.agentEvents ?? [],
      agentSignals: result.agentSignals ?? [],
      agentApprovals: result.approvals ?? [],
      agentMemories: result.memories ?? [],
      agentArtifacts: result.artifacts ?? [],
      task: result.task,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent run could not be retried.";
    const status = message === "Agent run not found." ? 404 : message.includes("Only failed or cancelled") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
