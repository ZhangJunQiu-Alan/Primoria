import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { getWorkspaceView, updateWorkspaceArtifactReview } from "@/lib/workspaces/store";

const ArtifactReviewSchema = z.object({
  reviewStatus: z.enum(["needs_review", "reviewed"]),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string; artifactId: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id, artifactId } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const parsed = ArtifactReviewSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Artifact review request is invalid." }, { status: 400 });
  try {
    const artifact = await updateWorkspaceArtifactReview(ownerId, {
      workspaceId: id,
      artifactId,
      reviewStatus: parsed.data.reviewStatus,
    });
    return NextResponse.json({ artifact });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Artifact review status could not be updated.";
    const status = message.includes("not found") ? 404 : message.includes("Invalid") ? 400 : 500;
    return NextResponse.json({ error: message || "Artifact review status could not be updated." }, { status });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string; artifactId: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id, artifactId } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const form = await request.formData();
  const parsed = ArtifactReviewSchema.safeParse({ reviewStatus: String(form.get("reviewStatus") ?? "") });
  if (!parsed.success) return NextResponse.json({ error: "Artifact review request is invalid." }, { status: 400 });
  try {
    await updateWorkspaceArtifactReview(ownerId, {
      workspaceId: id,
      artifactId,
      reviewStatus: parsed.data.reviewStatus,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Artifact review status could not be updated.";
    const status = message.includes("not found") ? 404 : message.includes("Invalid") ? 400 : 500;
    return NextResponse.json({ error: message || "Artifact review status could not be updated." }, { status });
  }
  return NextResponse.redirect(new URL("/workspace/review?tab=artifacts", request.url));
}
