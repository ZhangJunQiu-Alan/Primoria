import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import {
  createWorkspaceAgentSkillBackend,
  runWorkspaceAgentSkillStorageMaintenanceOnce,
  type WorkspaceAgentSkillBackendSkill,
  type WorkspaceAgentSkillBackendVersion,
} from "@/lib/workspaces/agent-skill-storage";
import { getWorkspaceView } from "@/lib/workspaces/store";
import { requireDbWorkspace, usesDatabase } from "@/lib/workspaces/workspace-access-service";

const SkillSchema = z.object({
  source: z.enum(["workspace", "user"]).default("workspace"),
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(400),
  instructions: z.string().min(1).max(4000),
});

const SkillPatchSchema = z.object({
  path: z.string().min(1).max(260),
  name: z.string().min(1).max(80).optional(),
  description: z.string().min(1).max(400).optional(),
  instructions: z.string().min(1).max(4000).optional(),
  restoreVersion: z.number().int().min(1).optional(),
});

const SkillDeleteSchema = z.object({
  path: z.string().min(1).max(260),
});

async function hasWorkspaceAccess(ownerId: string | null | undefined, workspaceId: string) {
  if (usesDatabase(ownerId)) {
    try {
      await requireDbWorkspace(ownerId, workspaceId);
      return true;
    } catch {
      return false;
    }
  }
  const view = await getWorkspaceView(ownerId, workspaceId);
  return view.workspace.id === workspaceId;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  runWorkspaceAgentSkillStorageMaintenanceOnce();
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  if (!(await hasWorkspaceAccess(ownerId, id))) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const url = new URL(_request.url);
  const skillPath = url.searchParams.get("path");
  const backend = createWorkspaceAgentSkillBackend();
  if (skillPath) {
    return NextResponse.json({
      versions: (await backend.versions({ workspaceId: id, ownerId: ownerId ?? undefined, path: skillPath })).map(serializeStoredWorkspaceAgentSkillVersion),
    });
  }
  return NextResponse.json({ skills: (await backend.list({ workspaceId: id, ownerId: ownerId ?? undefined })).map(serializeStoredWorkspaceAgentSkill) });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  runWorkspaceAgentSkillStorageMaintenanceOnce();
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  if (!(await hasWorkspaceAccess(ownerId, id))) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const url = new URL(request.url);
  const contentType = request.headers.get("content-type") ?? "";
  if (url.searchParams.get("intent") === "restore") {
    const form = await request.formData();
    const parsed = SkillPatchSchema.safeParse({
      path: String(form.get("path") ?? ""),
      restoreVersion: Number(form.get("restoreVersion")),
    });
    if (!parsed.success) return NextResponse.json({ error: "Skill update request is invalid." }, { status: 400 });
    const body = parsed.data;
    const backend = createWorkspaceAgentSkillBackend();
    let skill: WorkspaceAgentSkillBackendSkill | undefined;
    try {
      skill = await backend.restore({
        workspaceId: id,
        ownerId: ownerId ?? undefined,
        path: body.path,
        version: body.restoreVersion!,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Skill could not be updated.";
      return NextResponse.json({ error: message || "Skill could not be updated." }, { status: 400 });
    }
    if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    const acceptsHtml = (request.headers.get("accept") ?? "").includes("text/html");
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data") || acceptsHtml) {
      return NextResponse.redirect(new URL("/workspace/review?tab=skills", request.url));
    }
    return NextResponse.json({ skill: serializeStoredWorkspaceAgentSkill(skill) });
  }
  const parsed = SkillSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Skill request is invalid." }, { status: 400 });
  const body = parsed.data;
  if (body.source === "user" && !ownerId) return NextResponse.json({ error: "User skill owner is required" }, { status: 400 });
  const backend = createWorkspaceAgentSkillBackend();
  try {
    const skill = await backend.store({
      workspaceId: id,
      ownerId: ownerId ?? undefined,
      source: body.source,
      name: body.name,
      description: body.description,
      instructions: body.instructions,
    });
    return NextResponse.json({ skill: serializeStoredWorkspaceAgentSkill(skill) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Skill could not be saved.";
    return NextResponse.json({ error: message || "Skill could not be saved." }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  runWorkspaceAgentSkillStorageMaintenanceOnce();
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  if (!(await hasWorkspaceAccess(ownerId, id))) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const parsed = SkillPatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Skill update request is invalid." }, { status: 400 });
  const body = parsed.data;
  const backend = createWorkspaceAgentSkillBackend();
  let skill: WorkspaceAgentSkillBackendSkill | undefined;
  try {
    skill = body.restoreVersion
      ? await backend.restore({
          workspaceId: id,
          ownerId: ownerId ?? undefined,
          path: body.path,
          version: body.restoreVersion,
        })
      : await backend.update({
          workspaceId: id,
          ownerId: ownerId ?? undefined,
          path: body.path,
          name: body.name,
          description: body.description,
          instructions: body.instructions,
        });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Skill could not be updated.";
    return NextResponse.json({ error: message || "Skill could not be updated." }, { status: 400 });
  }
  if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  return NextResponse.json({ skill: serializeStoredWorkspaceAgentSkill(skill) });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  runWorkspaceAgentSkillStorageMaintenanceOnce();
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  if (!(await hasWorkspaceAccess(ownerId, id))) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const parsed = SkillDeleteSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Skill delete request is invalid." }, { status: 400 });
  const body = parsed.data;
  const backend = createWorkspaceAgentSkillBackend();
  let deleted: boolean;
  try {
    deleted = await backend.delete({ workspaceId: id, ownerId: ownerId ?? undefined, path: body.path });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Skill could not be deleted.";
    return NextResponse.json({ error: message || "Skill could not be deleted." }, { status: 400 });
  }
  if (!deleted) return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  return NextResponse.json({ deleted: true, path: body.path });
}

function serializeStoredWorkspaceAgentSkill(skill: WorkspaceAgentSkillBackendSkill) {
  return {
    source: skill.source,
    name: skill.name,
    slug: skill.slug,
    path: skill.path,
    description: skill.description,
    instructions: skill.instructions,
    version: skill.version,
  };
}

function serializeStoredWorkspaceAgentSkillVersion(skill: WorkspaceAgentSkillBackendVersion) {
  return serializeStoredWorkspaceAgentSkill(skill);
}
