import { NextResponse } from "next/server";

import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { resolveUiLanguageForUser } from "@/lib/i18n/server";
import { loadFolderOverview } from "@/lib/materials/folder-overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The folder's assembled KG grouped by lecture, with per-concept mastery.
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { denied, user } = await requireConfiguredAuthUser("folders");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    const language = await resolveUiLanguageForUser(user.id).catch(() => "zh");
    const overview = await loadFolderOverview(user.id, id, language);
    if (!overview) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    return NextResponse.json({ overview });
  } catch (error) {
    console.error("[folders] graph read failed", error);
    return NextResponse.json({ error: "Failed to load the knowledge graph." }, { status: 503 });
  }
}
