import { NextResponse } from "next/server";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";

export async function GET() {
  return NextResponse.json({ authEnabled: isAuthEnabled(), user: await getCurrentUser() });
}
