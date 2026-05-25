import { NextResponse, type NextRequest } from "next/server";
import { WORKSPACE_LOCAL_OWNER_COOKIE } from "@/lib/workspaces/owner-cookie";

export function middleware(request: NextRequest) {
  const existingOwnerId = request.cookies.get(WORKSPACE_LOCAL_OWNER_COOKIE)?.value;
  if (existingOwnerId) return NextResponse.next();

  const ownerId = `local_${crypto.randomUUID().replace(/-/g, "")}`;
  const requestHeaders = new Headers(request.headers);
  const currentCookie = requestHeaders.get("cookie");
  requestHeaders.set("cookie", currentCookie ? `${currentCookie}; ${WORKSPACE_LOCAL_OWNER_COOKIE}=${ownerId}` : `${WORKSPACE_LOCAL_OWNER_COOKIE}=${ownerId}`);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set(WORKSPACE_LOCAL_OWNER_COOKIE, ownerId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export const config = {
  matcher: ["/workspace", "/api/workspaces/:path*"],
};
