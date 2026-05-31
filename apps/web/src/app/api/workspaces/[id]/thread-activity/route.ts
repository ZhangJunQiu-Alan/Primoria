import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { listWorkspaceThreadActivity } from "@/lib/workspaces/store";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  const url = new URL(request.url);
  const threadId = url.searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ messages: [], hasMore: false, runs: [], events: [], approvals: [] }, { status: 400 });
  const messageLimit = Number(url.searchParams.get("messageLimit") ?? "");
  const runLimit = Number(url.searchParams.get("runLimit") ?? "");
  try {
    const activity = await listWorkspaceThreadActivity(ownerId, {
      workspaceId: id,
      threadId,
      messageLimit: Number.isFinite(messageLimit) && messageLimit > 0 ? messageLimit : undefined,
      runLimit: Number.isFinite(runLimit) && runLimit > 0 ? runLimit : undefined,
    });
    return NextResponse.json(activity);
  } catch {
    return NextResponse.json({ messages: [], hasMore: false, runs: [], events: [], approvals: [] }, { status: 404 });
  }
}
