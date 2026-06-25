import { NextResponse } from "next/server";
import { z } from "zod";
import { saveCodeBlockSource, updateBlock } from "@/lib/courses/store";
import { getCurrentUser } from "@/lib/auth/session";
import { requireAuth } from "@/lib/auth/guard";
import type { MindMapBlock, MindMapNode } from "@/lib/courses/types";

const PatchSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("mind_map"), root: z.unknown() }),
  z.object({ type: z.literal("code"), code: z.string() }),
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; blockId: string }> },
) {
  const { id: courseId, blockId } = await context.params;

  // When auth is enabled, an expired/absent session must read as 401, not as a
  // 404 from the owner-scoped course lookup below. No-op when auth is disabled.
  const denied = await requireAuth();
  if (denied) return denied;

  const body = PatchSchema.parse(await request.json());

  const user = await getCurrentUser();
  const ownerId = user?.id ?? null;

  if (body.type === "code") {
    // Single-read read-modify-write (preserves other fields, backfills originalCode).
    const result = await saveCodeBlockSource(courseId, blockId, body.code, ownerId);
    if (!result.ok) {
      return result.reason === "not_code"
        ? NextResponse.json({ error: "Block is not a code block" }, { status: 400 })
        : NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  const next: MindMapBlock = {
    id: blockId,
    type: "mind_map",
    root: body.root as MindMapNode,
  };
  const course = await updateBlock(courseId, blockId, next, ownerId);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
