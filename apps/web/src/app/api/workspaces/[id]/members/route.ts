import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createWorkspaceMember, getWorkspaceView } from "@/lib/workspaces/store";

const MemberSchema = z.object({
  displayName: z.string().min(1).max(80),
  role: z.string().min(1).max(80).optional(),
  status: z.string().max(120).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;
  const view = await getWorkspaceView(user?.id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const body = MemberSchema.parse(await request.json());
  const member = await createWorkspaceMember(user?.id, {
    workspaceId: id,
    displayName: body.displayName,
    role: body.role,
    status: body.status,
  });
  return NextResponse.json({ member });
}
