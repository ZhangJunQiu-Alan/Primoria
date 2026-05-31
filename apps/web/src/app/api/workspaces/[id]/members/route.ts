import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { createWorkspaceMember, getWorkspaceView } from "@/lib/workspaces/store";

const MemberSchema = z.object({
  displayName: z.string().min(1).max(80),
  role: z.string().min(1).max(80).optional(),
  status: z.string().max(120).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const parsed = MemberSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Member request is invalid." }, { status: 400 });
  let member;
  try {
    member = await createWorkspaceMember(ownerId, {
      workspaceId: id,
      displayName: parsed.data.displayName,
      role: parsed.data.role,
      status: parsed.data.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Member could not be created.";
    const status = message.includes("not found") ? 404 : message.includes("required") ? 400 : 500;
    return NextResponse.json({ error: message || "Member could not be created." }, { status });
  }
  return NextResponse.json({ member });
}
