import { NextResponse } from "next/server";

import { PUBLIC_LANDING_PATH } from "@/lib/auth/routes";
import { signOutCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await signOutCurrentSession();
  return NextResponse.redirect(new URL(PUBLIC_LANDING_PATH, request.url), { status: 303 });
}
