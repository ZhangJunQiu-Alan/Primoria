import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { buildWorkspaceArtifactFromMessage, createWorkspaceMessage, getWorkspaceView, listWorkspaceMessages, runWorkspaceAgentTurn } from "@/lib/workspaces/store";
import type { WorkspaceMessageArtifact } from "@/lib/workspaces/types";

const ArtifactSchema = z.object({
  type: z.literal("task"),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(240),
  groups: z.array(z.string().min(1).max(80)).max(6),
});

const MessageSchema = z.object({
  threadId: z.string().min(1),
  content: z.string().min(1).max(4000),
  senderName: z.string().min(1).max(80).optional(),
  artifact: ArtifactSchema.optional(),
});

function messageErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Message could not be sent.";
  const status = message.includes("not found") ? 404 : message.includes("required") ? 400 : 500;
  return NextResponse.json({ error: message || "Message could not be sent." }, { status });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  const url = new URL(request.url);
  const threadId = url.searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ messages: [], hasMore: false });
  const before = Number(url.searchParams.get("before") ?? "");
  const limit = Number(url.searchParams.get("limit") ?? "");
  try {
    const page = await listWorkspaceMessages(ownerId, {
      workspaceId: id,
      threadId,
      before: Number.isFinite(before) && before > 0 ? before : undefined,
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    });
    return NextResponse.json(page);
  } catch (error) {
    return messageErrorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const parsed = MessageSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Message request is invalid." }, { status: 400 });
  let message;
  let agentRun;
  try {
    message = await createWorkspaceMessage(ownerId, {
      workspaceId: id,
      threadId: parsed.data.threadId,
      content: parsed.data.content,
      senderName: parsed.data.senderName ?? user?.displayName ?? "You",
      senderKind: "human",
      artifact: parsed.data.artifact as WorkspaceMessageArtifact | undefined,
    });
    agentRun = await runWorkspaceAgentTurn(ownerId, { workspaceId: id, threadId: parsed.data.threadId, message });
  } catch (error) {
    return messageErrorResponse(error);
  }
  return NextResponse.json({
    message,
    artifact: buildWorkspaceArtifactFromMessage(message),
    agentMessages: agentRun.messages,
    agentRuns: agentRun.runs,
    agentRunEvents: agentRun.events,
    agentEvents: agentRun.agentEvents ?? [],
    agentSignals: agentRun.agentSignals ?? [],
    agentApprovals: agentRun.approvals ?? [],
    agentMemories: agentRun.memories ?? [],
    agentArtifacts: agentRun.artifacts ?? [],
  });
}
