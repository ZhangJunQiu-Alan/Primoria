import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { archiveWorkspaceAgentMemories, getWorkspaceView } from "@/lib/workspaces/store";

const BulkArchiveSchema = z.object({
  memoryIds: z.array(z.string().min(1).max(160)).min(1).max(100),
});

function memoryArchiveErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Agent memories could not be archived.";
  if (message.includes("not found")) return NextResponse.json({ error: "Agent memory not found." }, { status: 404 });
  const status = 500;
  return NextResponse.json({ error: message || "Agent memories could not be archived." }, { status });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const contentType = request.headers.get("content-type") ?? "";
  const isForm = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
  const parsed = BulkArchiveSchema.safeParse(
    isForm
      ? { memoryIds: (await request.formData()).getAll("memoryIds").flatMap((value) => (typeof value === "string" ? [value] : [])) }
      : await request.json().catch(() => ({})),
  );
  if (!parsed.success) return NextResponse.json({ error: "Memory archive request is invalid." }, { status: 400 });
  let memories;
  try {
    memories = await archiveWorkspaceAgentMemories(ownerId, {
      workspaceId: id,
      memoryIds: parsed.data.memoryIds,
    });
  } catch (error) {
    return memoryArchiveErrorResponse(error);
  }
  if (isForm) return NextResponse.redirect(new URL("/workspace/review?tab=memories", request.url));
  return NextResponse.json({ memories });
}
