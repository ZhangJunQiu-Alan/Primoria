import { readinessResponse } from "@/lib/health/readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return readinessResponse(request);
}
