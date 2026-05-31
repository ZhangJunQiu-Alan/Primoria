import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { archiveWorkspaceAgentMemory, deleteWorkspaceAgentMemory, getWorkspaceView, restoreWorkspaceAgentMemory } from "@/lib/workspaces/store";

function memoryActionErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Agent memory could not be updated.";
  if (message.includes("not found")) return NextResponse.json({ error: "Agent memory not found." }, { status: 404 });
  const status = 500;
  return NextResponse.json({ error: message || "Agent memory could not be updated." }, { status });
}

export async function POST(request: Request, context: { params: Promise<{ id: string; memoryId: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id, memoryId } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const url = new URL(request.url);
  const contentType = request.headers.get("content-type") ?? "";
  let intent = url.searchParams.get("intent") ?? "";
  if (!intent && contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as { intent?: string };
    intent = body.intent ?? "";
  }
  if (intent !== "restore" && intent !== "delete") return NextResponse.json({ error: "Unsupported memory action." }, { status: 400 });
  let memory;
  try {
    memory = intent === "restore"
      ? await restoreWorkspaceAgentMemory(ownerId, {
          workspaceId: id,
          memoryId,
        })
      : await deleteWorkspaceAgentMemory(ownerId, {
          workspaceId: id,
          memoryId,
        });
  } catch (error) {
    return memoryActionErrorResponse(error);
  }
  const isForm = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
  const acceptsHtml = (request.headers.get("accept") ?? "").includes("text/html");
  if (isForm || acceptsHtml) {
    return NextResponse.redirect(new URL("/workspace/review?tab=memories", request.url));
  }
  return NextResponse.json({ memory });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; memoryId: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id, memoryId } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  let memory;
  try {
    memory = await archiveWorkspaceAgentMemory(ownerId, {
      workspaceId: id,
      memoryId,
    });
  } catch (error) {
    return memoryActionErrorResponse(error);
  }
  return NextResponse.json({ memory });
}
