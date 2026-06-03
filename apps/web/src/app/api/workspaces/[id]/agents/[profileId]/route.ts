import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { deleteWorkspaceAgentProfile, getWorkspaceView, updateWorkspaceAgentProfile } from "@/lib/workspaces/store";

const CapabilitySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("skill"),
    source: z.enum(["system", "workspace", "user"]),
    path: z.string().min(1).max(240),
    enabled: z.boolean(),
  }),
  z.object({
    kind: z.literal("internal_tool"),
    toolName: z.string().min(1).max(120),
    approval: z.enum(["never", "on_risk", "always"]),
    enabled: z.boolean(),
  }),
  z.object({
    kind: z.literal("mcp_tool"),
    connectionId: z.string().min(1).max(160),
    toolName: z.string().min(1).max(160),
    approval: z.enum(["on_risk", "always"]),
    enabled: z.boolean(),
  }),
  z.object({
    kind: z.literal("subagent"),
    agentProfileId: z.string().min(1).max(160),
    enabled: z.boolean(),
  }),
]);

const AgentPatchSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  description: z.string().min(1).max(400).optional(),
  systemPrompt: z.string().min(1).max(6000).optional(),
  visibility: z.enum(["private", "workspace", "public_template"]).optional(),
  memoryScope: z.enum(["none", "user", "workspace", "thread"]).optional(),
  capabilities: z.array(CapabilitySchema).max(40).optional(),
});

function agentRouteErrorStatus(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("not found")) return 404;
  if (
    lower.includes("must") ||
    lower.includes("required") ||
    lower.includes("not allowed") ||
    lower.includes("approval") ||
    lower.includes("cannot") ||
    lower.includes("too long") ||
    lower.includes("blank") ||
    lower.includes("does not match") ||
    lower.includes("unknown") ||
    lower.includes("invalid")
  ) {
    return 400;
  }
  return 500;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string; profileId: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id, profileId } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const parsed = AgentPatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Agent update request is invalid." }, { status: 400 });
  const body = parsed.data;
  try {
    const profile = await updateWorkspaceAgentProfile(ownerId, {
      workspaceId: id,
      profileId,
      displayName: body.displayName,
      description: body.description,
      systemPrompt: body.systemPrompt,
      visibility: body.visibility,
      memoryScope: body.memoryScope,
      capabilities: body.capabilities,
    });
    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent could not be updated.";
    const status = agentRouteErrorStatus(message);
    return NextResponse.json({ error: message || "Agent could not be updated." }, { status });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; profileId: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id, profileId } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  try {
    const profile = await deleteWorkspaceAgentProfile(ownerId, { workspaceId: id, profileId });
    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent could not be deleted.";
    const status = agentRouteErrorStatus(message);
    return NextResponse.json({ error: message || "Agent could not be deleted." }, { status });
  }
}
