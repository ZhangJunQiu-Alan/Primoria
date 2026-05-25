import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { createWorkspace, getWorkspaceView } from "@/lib/workspaces/store";

const WorkspaceSchema = z.object({
  name: z.string().min(1).max(80),
});

export async function GET() {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  return NextResponse.json(await getWorkspaceView(ownerId));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const body = WorkspaceSchema.parse(await request.json());
  const view = await createWorkspace(ownerId, {
    name: body.name,
    ownerName: user?.displayName ?? "You",
  });
  return NextResponse.json(view);
}
