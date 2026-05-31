import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { getWorkspaceView, seedWorkspaceAgentRunForTest } from "@/lib/workspaces/store";
import type { WorkspaceMessageArtifact } from "@/lib/workspaces/types";

const RuntimeEventSchema = z.object({
  type: z.enum(["status", "todo", "tool_start", "tool_end", "subagent_start", "subagent_end", "approval_request", "artifact", "message_delta"]),
  label: z.string().min(1).max(160),
  payload: z.unknown().optional(),
  createdAt: z.number().optional(),
});

const SeedRunSchema = z.object({
  run: z.object({
    workspaceId: z.string().min(1),
    threadId: z.string().min(1),
    agentProfileId: z.string().min(1),
    agentMemberId: z.string().min(1),
    trigger: z.enum(["mention", "direct_chat", "task_assignment", "coordinator", "manual"]),
    status: z.enum(["queued", "running", "waiting_for_approval", "completed", "failed", "cancelled"]),
    inputMessageId: z.string().optional(),
    outputMessageId: z.string().optional(),
    taskId: z.string().optional(),
    error: z.string().optional(),
  }),
  events: z.array(RuntimeEventSchema),
  outputMessage: z.object({
    workspaceId: z.string().min(1),
    threadId: z.string().min(1),
    senderName: z.string().min(1),
    senderKind: z.enum(["human", "agent", "system"]),
    content: z.string().min(1),
    artifact: z.unknown().optional(),
  }).optional(),
  createApprovals: z.boolean().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const body = SeedRunSchema.parse(await request.json());
  if (body.run.workspaceId !== id) return NextResponse.json({ error: "Workspace mismatch" }, { status: 400 });
  const result = await seedWorkspaceAgentRunForTest(ownerId, {
    run: body.run,
    events: body.events,
    outputMessage: body.outputMessage
      ? { ...body.outputMessage, artifact: body.outputMessage.artifact as WorkspaceMessageArtifact | undefined }
      : undefined,
    createApprovals: body.createApprovals,
  });
  return NextResponse.json(result);
}
