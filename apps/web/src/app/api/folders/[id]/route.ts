import { NextResponse } from "next/server";

import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { deleteFolder, FolderInputError, getFolder, listFolderMaterials, renameFolder } from "@/lib/materials/folders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

function inputErrorResponse(error: FolderInputError) {
  const status = error.code === "duplicate_name" ? 409 : error.code === "unsorted_locked" ? 403 : 400;
  return NextResponse.json({ error: error.message, code: error.code }, { status });
}

export async function GET(_request: Request, context: Context) {
  const { denied, user } = await requireConfiguredAuthUser("folders");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    const folder = await getFolder(user.id, id);
    if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    return NextResponse.json({
      folder: { id: folder.id, name: folder.name, kind: folder.kind },
      materials: await listFolderMaterials(user.id, id),
    });
  } catch (error) {
    console.error("[folders] read failed", error);
    return NextResponse.json({ error: "Failed to load folder." }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: Context) {
  const { denied, user } = await requireConfiguredAuthUser("folders");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  try {
    const folder = await renameFolder(user.id, id, body?.name);
    if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    return NextResponse.json({ folder: { id: folder.id, name: folder.name, kind: folder.kind } });
  } catch (error) {
    if (error instanceof FolderInputError) return inputErrorResponse(error);
    console.error("[folders] rename failed", error);
    return NextResponse.json({ error: "Rename failed. Please retry." }, { status: 503 });
  }
}

// Deleting a subject folder keeps its files: they move to the unsorted inbox.
export async function DELETE(_request: Request, context: Context) {
  const { denied, user } = await requireConfiguredAuthUser("folders");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    if (!(await deleteFolder(user.id, id))) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof FolderInputError) return inputErrorResponse(error);
    console.error("[folders] delete failed", error);
    return NextResponse.json({ error: "Delete failed. Please retry." }, { status: 503 });
  }
}
