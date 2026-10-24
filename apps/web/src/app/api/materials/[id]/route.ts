import { NextResponse } from "next/server";
import { z } from "zod";

import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { updateMaterialPlacement } from "@/lib/materials/folders";
import { deleteMaterial } from "@/lib/materials/store";

export const runtime = "nodejs";

const PatchSchema = z
  .object({
    folderId: z.string().min(1).max(64).optional(),
    role: z.enum(["lecture", "reference"]).optional(),
  })
  .strict()
  .refine((value) => value.folderId !== undefined || value.role !== undefined, "nothing to update");

// Move a file to another of the owner's folders and/or change its role.
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { denied, user } = await requireConfiguredAuthUser("materials");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = PatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update.", code: "invalid_request" }, { status: 400 });
  try {
    const material = await updateMaterialPlacement(user.id, id, parsed.data);
    if (!material) return NextResponse.json({ error: "Material or folder not found" }, { status: 404 });
    return NextResponse.json({ material });
  } catch (error) {
    console.error("[materials] update failed", error);
    return NextResponse.json({ error: "Update failed. Please retry." }, { status: 503 });
  }
}

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
