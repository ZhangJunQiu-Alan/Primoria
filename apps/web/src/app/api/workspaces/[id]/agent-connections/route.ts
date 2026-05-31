import { NextResponse } from "next/server";
import { desc, eq, or } from "drizzle-orm";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { workspaceAgentConnections } from "@/lib/db/schema";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { rowToWorkspaceAgentConnection } from "@/lib/workspaces/agent-profile-persistence";
import { requireDbWorkspace, usesDatabase } from "@/lib/workspaces/workspace-access-service";
import {
  createWorkspaceAgentConnection,
  getWorkspaceView,
  updateWorkspaceAgentConnection,
} from "@/lib/workspaces/store";

const ConnectionSchema = z.object({
  scope: z.enum(["user", "workspace"]).default("user"),
  displayName: z.string().min(1).max(100),
  transport: z.enum(["stdio", "http", "sse"]),
  configRef: z.string().min(1).max(260),
  allowedToolNames: z.array(z.string().min(1).max(160)).min(1).max(80),
});

const ConnectionPatchSchema = z.object({
  connectionId: z.string().min(1).max(160),
  displayName: z.string().min(1).max(100).optional(),
  configRef: z.string().min(1).max(260).optional(),
  allowedToolNames: z.array(z.string().min(1).max(160)).min(1).max(80).optional(),
  status: z.enum(["available", "disabled"]).optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  if (usesDatabase(ownerId)) {
    try {
      await requireDbWorkspace(ownerId, id);
    } catch {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }
    const rows = await getDb()
      .select()
      .from(workspaceAgentConnections)
      .where(or(eq(workspaceAgentConnections.workspaceId, id), eq(workspaceAgentConnections.ownerId, ownerId)))
      .orderBy(desc(workspaceAgentConnections.updatedAt));
    return NextResponse.json({ connections: rows.map(rowToWorkspaceAgentConnection) });
  }
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  return NextResponse.json({ connections: view.agentConnections });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const parsed = ConnectionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Connection request is invalid." }, { status: 400 });
  const body = parsed.data;
  if (body.scope === "user" && !ownerId) return NextResponse.json({ error: "User connection owner is required" }, { status: 400 });
  try {
    const connection = await createWorkspaceAgentConnection(ownerId, {
      workspaceId: id,
      scope: body.scope,
      displayName: body.displayName,
      transport: body.transport,
      configRef: body.configRef,
      allowedToolNames: body.allowedToolNames,
    });
    return NextResponse.json({ connection });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection could not be saved.";
    const status = message.includes("not found") ? 404 : message.includes("required") ? 400 : 500;
    return NextResponse.json({ error: message || "Connection could not be saved." }, { status });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const parsed = ConnectionPatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Connection update request is invalid." }, { status: 400 });
  const body = parsed.data;
  try {
    const connection = await updateWorkspaceAgentConnection(ownerId, {
      workspaceId: id,
      connectionId: body.connectionId,
      displayName: body.displayName,
      configRef: body.configRef,
      allowedToolNames: body.allowedToolNames,
      status: body.status,
    });
    return NextResponse.json({ connection });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection could not be updated.";
    const status = message.includes("not found") ? 404 : message.includes("required") ? 400 : 500;
    return NextResponse.json({ error: message || "Connection could not be updated." }, { status });
  }
}
