import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { listCopilotThreads, upsertCopilotThread } from "@/lib/copilot/thread-repository";

const ThreadSchema = z.object({
  id: z.string(),
  title: z.string().default("New tutor chat"),
  preview: z.string().optional(),
  messageCount: z.number().int().min(0).default(0),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export async function GET() {
  if (!isAuthEnabled()) return NextResponse.json({ threads: [] });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ threads: [] });
  return NextResponse.json({ threads: await listCopilotThreads(user.id) });
}

export async function POST(request: Request) {
  if (!isAuthEnabled()) return NextResponse.json({ ok: false, error: "Auth is not configured" }, { status: 503 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = ThreadSchema.parse(await request.json());
  await upsertCopilotThread(user.id, body);
  return NextResponse.json({ ok: true });
}
