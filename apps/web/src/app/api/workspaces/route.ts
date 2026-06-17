import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { createWorkspace, getWorkspaceShellView, getWorkspaceView } from "@/lib/workspaces/store";

const WorkspaceSchema = z.object({
  name: z.string().min(1).max(80),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const url = new URL(request.url);
  return NextResponse.json(url.searchParams.get("view") === "shell" ? await getWorkspaceShellView(ownerId) : await getWorkspaceView(ownerId));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const parsed = WorkspaceSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Workspace request is invalid." }, { status: 400 });
  let view;
  try {
    view = await createWorkspace(ownerId, {
      name: parsed.data.name,
      ownerName: user?.displayName ?? "You",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workspace could not be created.";
    return NextResponse.json({ error: message || "Workspace could not be created." }, { status: 500 });
  }
  return NextResponse.json(view);
}
