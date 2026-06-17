import { NextResponse } from "next/server";
import { z } from "zod";
import { updateBlock } from "@/lib/courses/store";
import type { MindMapBlock, MindMapNode } from "@/lib/courses/types";

const PatchSchema = z.object({
  type: z.literal("mind_map"),
  root: z.unknown(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; blockId: string }> },
) {
  const { id: courseId, blockId } = await context.params;
  const body = PatchSchema.parse(await request.json());

  const next: MindMapBlock = {
    id: blockId,
    type: "mind_map",
    root: body.root as MindMapNode,
  };

  const course = await updateBlock(courseId, blockId, next);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
