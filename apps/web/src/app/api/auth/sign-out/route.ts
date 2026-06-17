import { NextResponse } from "next/server";
import { signOutCurrentSession } from "@/lib/auth/session";

export async function POST() {
  await signOutCurrentSession();
  return NextResponse.json({ ok: true });
}
