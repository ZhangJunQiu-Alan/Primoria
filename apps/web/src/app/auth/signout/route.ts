import { NextResponse } from "next/server";

import { signOutCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await signOutCurrentSession();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
