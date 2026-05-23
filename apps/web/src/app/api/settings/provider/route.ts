import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { getProviderSettings, saveProviderSettings } from "@/lib/settings/user-settings";

const SettingsSchema = z.object({
  provider: z.enum(["openai-compatible", "anthropic-compatible"]).optional(),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
});

export async function GET() {
  if (!isAuthEnabled()) return NextResponse.json({ authEnabled: false, settings: {} });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ authEnabled: true, settings: {} });
  return NextResponse.json({ authEnabled: true, settings: await getProviderSettings(user.id) });
}

export async function PUT(request: Request) {
  if (!isAuthEnabled()) return NextResponse.json({ ok: false, error: "Auth is not configured" }, { status: 503 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const settings = SettingsSchema.parse(await request.json());
  return NextResponse.json({ ok: true, settings: await saveProviderSettings(user.id, settings) });
}
