import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceView } from "@/lib/workspaces/store";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json(await getWorkspaceView(user?.id));
}
