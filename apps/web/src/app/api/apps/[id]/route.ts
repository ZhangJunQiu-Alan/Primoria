import { NextResponse } from "next/server";
import { z } from "zod";
import { archiveApp, getApp, unarchiveApp } from "@/lib/capability-library/store";

const PatchSchema = z.object({
  archived: z.boolean(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const app = await getApp(id);
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });
  return NextResponse.json({ app });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = PatchSchema.parse(await request.json());
  const app = body.archived ? await archiveApp(id) : await unarchiveApp(id);
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });
  return NextResponse.json({ app });
}
