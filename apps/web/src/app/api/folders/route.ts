import { NextResponse } from "next/server";

import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { createFolder, FolderInputError, listFolders } from "@/lib/materials/folders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { denied, user } = await requireConfiguredAuthUser("folders");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ folders: await listFolders(user.id) });
  } catch (error) {
    console.error("[folders] list failed", error);
    return NextResponse.json({ error: "Failed to load folders." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const { denied, user } = await requireConfiguredAuthUser("folders");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  try {
    const folder = await createFolder(user.id, body?.name);
    return NextResponse.json({ folder: { id: folder.id, name: folder.name, kind: folder.kind } }, { status: 201 });
  } catch (error) {
    if (error instanceof FolderInputError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === "duplicate_name" ? 409 : 400 });
    }
    console.error("[folders] create failed", error);
    return NextResponse.json({ error: "Folder creation failed. Please retry." }, { status: 503 });
  }
}
