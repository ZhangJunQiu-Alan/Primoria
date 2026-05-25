import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createWorkspaceThread, getWorkspaceView } from "@/lib/workspaces/store";

const ThreadSchema = z.object({
  type: z.enum(["room", "direct"]),
  name: z.string().min(1).max(80),
  description: z.string().max(140).optional(),
  participantIds: z.array(z.string().min(1).max(160)).max(8).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;
  const view = await getWorkspaceView(user?.id, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const body = ThreadSchema.parse(await request.json());
  const thread = await createWorkspaceThread(user?.id, {
    workspaceId: id,
    type: body.type,
    name: body.name,
    description: body.description,
    participantIds: body.participantIds,
  });
  return NextResponse.json({ thread });
}
