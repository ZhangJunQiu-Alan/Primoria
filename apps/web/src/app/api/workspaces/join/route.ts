import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { joinWorkspace } from "@/lib/workspaces/store";

const JoinWorkspaceSchema = z.object({
  inviteCode: z.string().min(1).max(80),
  displayName: z.string().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const parsed = JoinWorkspaceSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Workspace join request is invalid." }, { status: 400 });
  let view;
  try {
    view = await joinWorkspace(ownerId, {
      inviteCode: parsed.data.inviteCode,
      displayName: parsed.data.displayName ?? user?.displayName ?? "Guest",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workspace could not be joined.";
    if (message.includes("not found")) return NextResponse.json({ error: "Invite code not found." }, { status: 404 });
    const status = message.includes("required") ? 400 : 500;
    return NextResponse.json({ error: message || "Workspace could not be joined." }, { status });
  }
  return NextResponse.json(view);
}
