import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { getWorkspaceAgentRunDetail, getWorkspaceView } from "@/lib/workspaces/store";

export async function GET(_request: Request, context: { params: Promise<{ id: string; runId: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id, runId } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  try {
    const detail = await getWorkspaceAgentRunDetail(ownerId, { workspaceId: id, runId });
    return NextResponse.json(detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent run could not be loaded.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
