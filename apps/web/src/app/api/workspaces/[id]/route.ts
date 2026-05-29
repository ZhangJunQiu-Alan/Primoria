import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { getWorkspaceView } from "@/lib/workspaces/store";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  return NextResponse.json(view);
}
