import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listApps } from "@/lib/capability-library/store";

export async function GET() {
  const user = await getCurrentUser();
  const apps = await listApps(user?.id);
  return NextResponse.json({ apps });
}
