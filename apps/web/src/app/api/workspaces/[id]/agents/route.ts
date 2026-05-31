import { NextResponse } from "next/server";
import { and, asc, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { workspaceAgentCapabilities, workspaceAgentConnections, workspaceAgentProfiles, workspaceMembers } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import {
  filterAgentCapabilitiesByVisibleConnections,
  groupAgentCapabilitiesByProfileId,
  rowToWorkspaceAgentConnection,
  rowToWorkspaceAgentProfile,
} from "@/lib/workspaces/agent-profile-persistence";
import { rowToWorkspaceMember } from "@/lib/workspaces/workspace-member-service";
import { requireDbWorkspace, usesDatabase } from "@/lib/workspaces/workspace-access-service";
import {
  createWorkspaceAgentMember,
  createWorkspaceAgentProfile,
  getWorkspaceView,
  listWorkspaceAgentTemplates,
  updateWorkspaceAgentProfile,
} from "@/lib/workspaces/store";

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

const AgentSchema = z.object({
  profileId: z.string().min(1).max(160).optional(),
  templateKey: z.string().min(1).max(120).optional(),
  displayName: z.string().min(1).max(80).optional(),
  description: z.string().min(1).max(400).optional(),
  systemPrompt: z.string().min(1).max(6000).optional(),
  visibility: z.enum(["private", "workspace", "public_template"]).optional(),
  memoryScope: z.enum(["none", "user", "workspace", "thread"]).optional(),
  capabilities: z.array(CapabilitySchema).max(40).optional(),
});

const AgentPatchSchema = z.object({
  profileId: z.string().min(1).max(160),
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
    const [memberRows, workspaceProfileRows, personalProfileRows, connectionRows] = await Promise.all([
      getDb().select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, id)).orderBy(asc(workspaceMembers.createdAt)),
      getDb().select().from(workspaceAgentProfiles).where(eq(workspaceAgentProfiles.workspaceId, id)).orderBy(asc(workspaceAgentProfiles.createdAt)),
      getDb()
        .select()
        .from(workspaceAgentProfiles)
        .where(and(eq(workspaceAgentProfiles.ownerId, ownerId), eq(workspaceAgentProfiles.visibility, "private")))
        .orderBy(asc(workspaceAgentProfiles.createdAt)),
      getDb()
        .select()
        .from(workspaceAgentConnections)
        .where(or(eq(workspaceAgentConnections.workspaceId, id), eq(workspaceAgentConnections.ownerId, ownerId)))
        .orderBy(asc(workspaceAgentConnections.createdAt)),
    ]);
    const memberProfileIds = new Set(memberRows.flatMap((member) => (member.agentProfileId ? [member.agentProfileId] : [])));
    const memberProfileRows = memberProfileIds.size
      ? await getDb()
          .select()
          .from(workspaceAgentProfiles)
          .where(inArray(workspaceAgentProfiles.id, Array.from(memberProfileIds)))
          .orderBy(asc(workspaceAgentProfiles.createdAt))
      : [];
    const visibleWorkspaceProfileRows = [...workspaceProfileRows, ...memberProfileRows].filter(
      (profile) => profile.visibility !== "private" || profile.ownerId === ownerId || memberProfileIds.has(profile.id),
    );
    const profileRows = Array.from(new Map([...visibleWorkspaceProfileRows, ...personalProfileRows].map((profile) => [profile.id, profile])).values());
    const profileIds = profileRows.map((profile) => profile.id);
    const capabilityRows = profileIds.length
      ? await getDb()
          .select()
          .from(workspaceAgentCapabilities)
          .where(inArray(workspaceAgentCapabilities.profileId, profileIds))
          .orderBy(asc(workspaceAgentCapabilities.createdAt))
      : [];
    const visibleConnections = connectionRows.map(rowToWorkspaceAgentConnection);
    const capabilitiesByProfileId = filterAgentCapabilitiesByVisibleConnections(
      groupAgentCapabilitiesByProfileId(capabilityRows),
      visibleConnections,
      new Set(profileIds),
    );
    return NextResponse.json({
      templates: listWorkspaceAgentTemplates(),
      agentProfiles: profileRows.map((profile) => rowToWorkspaceAgentProfile(profile, capabilitiesByProfileId)),
      agentMembers: memberRows.map(rowToWorkspaceMember).filter((member) => member.agentProfileId),
    });
  }
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  return NextResponse.json({
    templates: listWorkspaceAgentTemplates(),
    agentProfiles: view.agentProfiles,
    agentMembers: view.members.filter((member) => member.agentProfileId),
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const parsed = AgentSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Agent request is invalid." }, { status: 400 });
  const body = parsed.data;
  try {
    if (body.profileId) {
      const existingProfile = view.agentProfiles.find((profile) => profile.id === body.profileId);
      if (!existingProfile) return NextResponse.json({ error: "Agent profile not found" }, { status: 404 });
      const existingMember = view.members.find((member) => member.agentProfileId === existingProfile.id);
      if (existingMember) return NextResponse.json({ profile: existingProfile, member: existingMember });
      const member = await createWorkspaceAgentMember(ownerId, {
        workspaceId: id,
        profileId: existingProfile.id,
      });
      return NextResponse.json({ profile: existingProfile, member });
    }
    const profile = await createWorkspaceAgentProfile(ownerId, {
      workspaceId: id,
      templateKey: body.templateKey,
      displayName: body.displayName,
      description: body.description,
      systemPrompt: body.systemPrompt,
      visibility: body.visibility,
      memoryScope: body.memoryScope,
      capabilities: body.capabilities,
    });
    if (profile.visibility === "private") return NextResponse.json({ profile });
    const member = await createWorkspaceAgentMember(ownerId, {
      workspaceId: id,
      profileId: profile.id,
    });
    return NextResponse.json({ profile, member });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent could not be saved.";
    const status = agentRouteErrorStatus(message);
    return NextResponse.json({ error: message || "Agent could not be saved." }, { status });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  const view = await getWorkspaceView(ownerId, id);
  if (view.workspace.id !== id) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const parsed = AgentPatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Agent update request is invalid." }, { status: 400 });
  const body = parsed.data;
  try {
    const profile = await updateWorkspaceAgentProfile(ownerId, {
      workspaceId: id,
      profileId: body.profileId,
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
