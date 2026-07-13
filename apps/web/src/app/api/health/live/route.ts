import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return NextResponse.json(
    { status: "ok", service: "web", requestId: request.headers.get("x-request-id") ?? null },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
