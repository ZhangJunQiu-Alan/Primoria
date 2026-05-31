import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { decideWorkspaceAgentApproval, getWorkspaceView } from "@/lib/workspaces/store";

const ApprovalDecisionSchema = z.object({
  decision: z.enum(["approved", "denied"]),
  reason: z.string().max(500).optional(),
});

function approvalDecisionErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Agent approval could not be updated.";
  if (message.includes("not found")) return NextResponse.json({ error: "Agent approval not found." }, { status: 404 });
  return NextResponse.json({ error: message || "Agent approval could not be updated." }, { status: 400 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string; approvalId: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id, approvalId } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const parsed = ApprovalDecisionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Approval decision request is invalid." }, { status: 400 });
  try {
    const result = await decideWorkspaceAgentApproval(ownerId, {
      workspaceId: id,
      approvalId,
      decision: parsed.data.decision,
      decidedBy: user?.displayName ?? "You",
      reason: parsed.data.reason,
    });
    return NextResponse.json({
      approval: result.approval,
      approvals: result.approvals,
      run: result.run,
      agentRunEvents: result.events,
      task: result.task,
      message: result.message,
      artifact: result.artifact,
      memory: result.memory,
    });
  } catch (error) {
    return approvalDecisionErrorResponse(error);
  }
}
