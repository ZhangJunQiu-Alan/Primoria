import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { joinWorkspace } from "@/lib/workspaces/store";

const JoinWorkspaceSchema = z.object({
  inviteCode: z.string().min(1).max(80),
  displayName: z.string().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = JoinWorkspaceSchema.parse(await request.json());
  const view = await joinWorkspace(user?.id, {
    inviteCode: body.inviteCode,
    displayName: body.displayName ?? user?.displayName ?? "Guest",
  });
  return NextResponse.json(view);
}
