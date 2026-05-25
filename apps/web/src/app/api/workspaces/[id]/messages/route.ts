import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getApp } from "@/lib/capability-library/store";
import { createWorkspaceMessage, getWorkspaceView } from "@/lib/workspaces/store";
import type { WorkspaceMessageArtifact } from "@/lib/workspaces/types";

const ArtifactSchema = z.union([
  z.object({
    type: z.literal("app"),
    appId: z.string().min(1).max(160).optional(),
    version: z.number().int().positive().optional(),
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(240),
    primaryAction: z.string().min(1).max(40),
    secondaryAction: z.string().min(1).max(40).optional(),
  }),
  z.object({
    type: z.literal("task"),
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(240),
    groups: z.array(z.string().min(1).max(80)).max(6),
  }),
]);

const MessageSchema = z.object({
  threadId: z.string().min(1),
  content: z.string().min(1).max(4000),
  senderName: z.string().min(1).max(80).optional(),
  artifact: ArtifactSchema.optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;
  const view = await getWorkspaceView(user?.id, id);
  if (view.workspace.id !== id) return NextResponse.json({ messages: [] }, { status: 404 });
  return NextResponse.json({ messages: view.messages });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;
  const view = await getWorkspaceView(user?.id, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const body = MessageSchema.parse(await request.json());
  const artifact = await enrichMessageArtifact(user?.id, body.artifact);
  const message = await createWorkspaceMessage(user?.id, {
    workspaceId: id,
    threadId: body.threadId,
    content: body.content,
    senderName: body.senderName ?? user?.displayName ?? "You",
    senderKind: "human",
    artifact,
  });
  return NextResponse.json({ message });
}

async function enrichMessageArtifact(
  ownerId: string | null | undefined,
  artifact: z.infer<typeof ArtifactSchema> | undefined,
): Promise<WorkspaceMessageArtifact | undefined> {
  if (!artifact || artifact.type !== "app" || !artifact.appId) return artifact;
  const app = await getApp(artifact.appId, ownerId);
  if (!app) return artifact;
  return {
    ...artifact,
    version: artifact.version ?? app.version,
    template: app.template,
  };
}
