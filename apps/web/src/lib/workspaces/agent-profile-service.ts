import { and, eq, inArray, or } from "drizzle-orm";
import { getDb } from "../db/client";
import { workspaceAgentCapabilities, workspaceAgentConnections, workspaceAgentProfiles, workspaceMembers } from "../db/schema";
import {
  filterAgentCapabilitiesByVisibleConnections,
  groupAgentCapabilitiesByProfileId,
  hiddenReferenceCapabilityInputs,
  rowToWorkspaceAgentConnection,
  rowToWorkspaceAgentProfile,
} from "./agent-profile-persistence";
import type { WorkspaceAgentCapabilityInput, WorkspaceAgentProfile, WorkspaceView } from "./types";

export type WorkspaceAgentProfileServiceContext = {
  usesDatabase(ownerId?: string | null): ownerId is string;
  getLocalViews(ownerId?: string | null): WorkspaceView[];
  ensureSeedWorkspace(ownerId: string): Promise<void>;
  requireDbWorkspace(ownerId: string, workspaceId: string): Promise<void>;
  requireDbWorkspaceOwner(ownerId: string, workspaceId: string): Promise<void>;
};

export async function listDbVisibleAgentProfileIds(ownerId: string, workspaceId: string) {
  const memberRows = await getDb().select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId));
  const memberProfileIds = new Set(memberRows.flatMap((member) => (member.agentProfileId ? [member.agentProfileId] : [])));
  const [workspaceProfileRows, memberProfileRows, personalProfileRows] = await Promise.all([
    getDb().select().from(workspaceAgentProfiles).where(eq(workspaceAgentProfiles.workspaceId, workspaceId)),
    memberProfileIds.size
      ? getDb()
          .select()
          .from(workspaceAgentProfiles)
          .where(inArray(workspaceAgentProfiles.id, Array.from(memberProfileIds)))
      : [],
    getDb().select().from(workspaceAgentProfiles).where(and(eq(workspaceAgentProfiles.ownerId, ownerId), eq(workspaceAgentProfiles.visibility, "private"))),
  ]);
  const visibleWorkspaceProfileRows = [...workspaceProfileRows, ...memberProfileRows].filter(
    (profile) => profile.visibility !== "private" || profile.ownerId === ownerId || memberProfileIds.has(profile.id),
  );
  return new Set(Array.from(new Map([...visibleWorkspaceProfileRows, ...personalProfileRows].map((profile) => [profile.id, profile])).keys()));
}

export async function mergeHiddenReferenceCapabilityInputsForDbUpdate(
  ownerId: string,
  workspaceId: string,
  profileId: string,
  visibleCapabilityInputs: WorkspaceAgentCapabilityInput[],
) {
  const [capabilityRows, connectionRows, visibleProfileIds] = await Promise.all([
    getDb().select().from(workspaceAgentCapabilities).where(eq(workspaceAgentCapabilities.profileId, profileId)),
    getDb()
      .select({ id: workspaceAgentConnections.id })
      .from(workspaceAgentConnections)
      .where(or(eq(workspaceAgentConnections.workspaceId, workspaceId), eq(workspaceAgentConnections.ownerId, ownerId))),
    listDbVisibleAgentProfileIds(ownerId, workspaceId),
  ]);
  const visibleConnectionIds = new Set(connectionRows.map((connection) => connection.id));
  const hiddenCapabilities = hiddenReferenceCapabilityInputs(
    groupAgentCapabilitiesByProfileId(capabilityRows).get(profileId) ?? [],
    visibleConnectionIds,
    visibleProfileIds,
  );
  return [...visibleCapabilityInputs, ...hiddenCapabilities];
}

export async function requireWorkspaceAgentProfile(
  context: WorkspaceAgentProfileServiceContext,
  ownerId: string | null | undefined,
  workspaceId: string,
  profileId: string,
) {
  if (!context.usesDatabase(ownerId)) {
    const profile = context
      .getLocalViews(ownerId)
      .flatMap((view) => view.agentProfiles)
      .find((entry) => entry.id === profileId && (entry.workspaceId === workspaceId || (entry.visibility === "private" && entry.ownerId === (ownerId ?? undefined))));
    if (!profile) throw new Error("Agent profile not found.");
    return profile;
  }

  await context.ensureSeedWorkspace(ownerId);
  await context.requireDbWorkspace(ownerId, workspaceId);
  const [profileRows, capabilityRows, connectionRows] = await Promise.all([
    getDb()
      .select()
      .from(workspaceAgentProfiles)
      .where(eq(workspaceAgentProfiles.id, profileId))
      .limit(1),
    getDb()
      .select()
      .from(workspaceAgentCapabilities)
      .where(eq(workspaceAgentCapabilities.profileId, profileId)),
    getDb()
      .select()
      .from(workspaceAgentConnections)
      .where(or(eq(workspaceAgentConnections.workspaceId, workspaceId), eq(workspaceAgentConnections.ownerId, ownerId))),
  ]);
  const profile = profileRows[0];
  if (!profile || !(await isDbAgentProfileResolvableInWorkspace(profile, ownerId, workspaceId))) throw new Error("Agent profile not found.");
  const visibleProfileIds = await listDbVisibleAgentProfileIds(ownerId, workspaceId);
  return rowToWorkspaceAgentProfile(
    profile,
    filterAgentCapabilitiesByVisibleConnections(
      groupAgentCapabilitiesByProfileId(capabilityRows),
      connectionRows.map(rowToWorkspaceAgentConnection),
      visibleProfileIds,
    ),
  );
}

export async function assertCanManageWorkspaceAgentProfile(
  context: WorkspaceAgentProfileServiceContext,
  ownerId: string | null | undefined,
  profile: WorkspaceAgentProfile,
) {
  if (!context.usesDatabase(ownerId)) return;
  if (ownerId && profile.ownerId === ownerId) return;
  await context.requireDbWorkspaceOwner(ownerId, profile.workspaceId);
}

async function isDbAgentProfileResolvableInWorkspace(
  profile: typeof workspaceAgentProfiles.$inferSelect,
  ownerId: string,
  workspaceId: string,
) {
  const memberRows = await getDb()
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.agentProfileId, profile.id)))
    .limit(1);
  if (memberRows[0]) return true;
  if (profile.visibility === "private") {
    return profile.ownerId === ownerId && (profile.workspaceId === workspaceId || profile.ownerId === ownerId);
  }
  return profile.workspaceId === workspaceId;
}
