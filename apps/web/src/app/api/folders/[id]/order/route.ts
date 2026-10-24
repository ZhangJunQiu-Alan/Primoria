import { NextResponse } from "next/server";
import { z } from "zod";

import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { FolderInputError, reorderFolder } from "@/lib/materials/folders";

export const runtime = "nodejs";

const OrderSchema = z.object({ materialIds: z.array(z.string().min(1).max(64)).max(500) }).strict();

// Manual lecture order: the learner's order wins over filename and AI ordering.
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { denied, user } = await requireConfiguredAuthUser("folders");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = OrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid order.", code: "invalid_request" }, { status: 400 });
  try {
    const materials = await reorderFolder(user.id, id, parsed.data.materialIds);
    if (!materials) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    return NextResponse.json({ materials });
  } catch (error) {
    if (error instanceof FolderInputError) return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    console.error("[folders] reorder failed", error);
    return NextResponse.json({ error: "Reorder failed. Please retry." }, { status: 503 });
  }
}
