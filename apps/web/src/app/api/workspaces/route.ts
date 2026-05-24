import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createWorkspace, getWorkspaceView } from "@/lib/workspaces/store";

const WorkspaceSchema = z.object({
  name: z.string().min(1).max(80),
});

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json(await getWorkspaceView(user?.id));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = WorkspaceSchema.parse(await request.json());
  const view = await createWorkspace(user?.id, {
    name: body.name,
    ownerName: user?.displayName ?? "You",
  });
  return NextResponse.json(view);
}
