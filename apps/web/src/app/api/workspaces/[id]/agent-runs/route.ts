import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { listWorkspaceAgentRuns } from "@/lib/workspaces/store";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;

  const url = new URL(request.url);
  const threadId = url.searchParams.get("threadId") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? "");
  try {
    const page = await listWorkspaceAgentRuns(ownerId, {
      workspaceId: id,
      threadId,
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    });
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ runs: [], events: [], approvals: [] }, { status: 404 });
  }
}
