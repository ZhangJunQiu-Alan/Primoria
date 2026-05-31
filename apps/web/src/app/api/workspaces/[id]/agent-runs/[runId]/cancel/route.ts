import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { cancelWorkspaceAgentRun, getWorkspaceView } from "@/lib/workspaces/store";

const CancelAgentRunSchema = z.object({
  reason: z.string().max(500).optional(),
});

function cancelAgentRunErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Agent run could not be cancelled.";
  if (message.includes("not found")) return NextResponse.json({ error: "Agent run not found." }, { status: 404 });
  return NextResponse.json({ error: message || "Agent run could not be cancelled." }, { status: 400 });
}

export async function POST(request: Request, context: { params: Promise<{ id: string; runId: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id, runId } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const parsed = CancelAgentRunSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Agent run cancel request is invalid." }, { status: 400 });
  try {
    const result = await cancelWorkspaceAgentRun(ownerId, {
      workspaceId: id,
      runId,
      cancelledBy: user?.displayName ?? "You",
      reason: parsed.data.reason,
    });
    return NextResponse.json({
      run: result.run,
      agentRunEvents: result.events,
      agentApprovals: result.approvals,
    });
  } catch (error) {
    return cancelAgentRunErrorResponse(error);
  }
}
