import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { dismissFact, listActiveFacts } from "@/lib/learner-facts/store";

// Settings "Facts About You": the learner sees the active facts the Extractor
// distilled and can delete inaccurate ones. Deleting marks the fact dismissed (a
// permanent tombstone the Extractor will not re-create). v1 has no manual
// add/edit.

export async function GET() {
  if (!isAuthEnabled()) return NextResponse.json({ facts: [] });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ facts: [] });
  const facts = await listActiveFacts(user.id);
  return NextResponse.json({
    facts: facts.map((f) => ({ id: f.id, text: f.text, category: f.category })),
  });
}

const DeleteSchema = z.object({ factId: z.string().min(1) });

export async function DELETE(request: Request) {
  if (!isAuthEnabled()) return NextResponse.json({ ok: false, error: "Auth is not configured" }, { status: 503 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { factId } = DeleteSchema.parse(await request.json());
  await dismissFact(user.id, factId);
  return NextResponse.json({ ok: true });
}
