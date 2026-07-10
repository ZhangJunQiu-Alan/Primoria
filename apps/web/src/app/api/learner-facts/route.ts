import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalAuthUser, requireConfiguredAuthUser } from "@/lib/auth/guard";
import { addManualFact, dismissFact, listActiveFacts, updateFact } from "@/lib/learner-facts/store";
import { FACT_CATEGORIES } from "@/lib/learner-profile/types";

// Settings "Facts About You": the learner sees the active facts the Extractor
// distilled and can manage manual corrections. Deleting marks the fact dismissed
// (a permanent tombstone the Extractor will not re-create unless the learner
// manually adds the same fact again).

export async function GET() {
  const { denied, user } = await getOptionalAuthUser("learner-facts");
  if (denied) return denied;
  if (!user) return NextResponse.json({ facts: [] });
  const facts = await listActiveFacts(user.id);
  return NextResponse.json({
    facts: facts.map((f) => ({ id: f.id, text: f.text, category: f.category })),
  });
}

const DeleteSchema = z.object({ factId: z.string().min(1) });
const FactPayloadSchema = z.object({
  text: z.string().trim().min(2).max(240),
  category: z.enum(FACT_CATEGORIES).default("preference"),
});
const PatchSchema = FactPayloadSchema.extend({ factId: z.string().min(1) });

export async function POST(request: Request) {
  const { denied, user } = await requireConfiguredAuthUser("learner-facts");
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = FactPayloadSchema.parse(await request.json());
  const fact = await addManualFact(user.id, payload.text, payload.category);
  return NextResponse.json({ ok: true, fact: fact ? { id: fact.id, text: fact.text, category: fact.category } : null });
}

export async function PATCH(request: Request) {
  const { denied, user } = await requireConfiguredAuthUser("learner-facts");
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = PatchSchema.parse(await request.json());
  const fact = await updateFact(user.id, payload.factId, { text: payload.text, category: payload.category });
  return NextResponse.json({ ok: true, fact: fact ? { id: fact.id, text: fact.text, category: fact.category } : null });
}

export async function DELETE(request: Request) {
  const { denied, user } = await requireConfiguredAuthUser("learner-facts");
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { factId } = DeleteSchema.parse(await request.json());
  await dismissFact(user.id, factId);
  return NextResponse.json({ ok: true });
}
