import { NextResponse } from "next/server";
import {
  buildWorkspaceDeepAgentRuntimeHealth,
  isWorkspaceDeepAgentOperatorAuthorized,
} from "@/lib/workspaces/agent-runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isWorkspaceDeepAgentOperatorAuthorized(request.headers)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const health = buildWorkspaceDeepAgentRuntimeHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
