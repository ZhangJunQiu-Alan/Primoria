import { NextResponse } from "next/server";

import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { deleteMaterial } from "@/lib/materials/store";

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { denied, user } = await requireConfiguredAuthUser("materials");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    const result = await deleteMaterial(user.id, id);
    if (result.ok) return NextResponse.json({ ok: true });
    if (result.reason === "not_found") return NextResponse.json({ error: "Material not found" }, { status: 404 });
    return NextResponse.json(
      {
        error: "This material is used by a course. Delete the course first.",
        code: "material_in_use",
        courses: result.courses,
      },
      { status: 409 },
    );
  } catch (error) {
    console.error("[materials] delete failed", error);
    return NextResponse.json({ error: "Delete failed. Please retry." }, { status: 503 });
  }
}
