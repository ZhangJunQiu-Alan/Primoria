import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { WORKSPACE_LOCAL_OWNER_COOKIE } from "@/lib/workspaces/owner-cookie";

// Next.js 16 "proxy" convention (formerly middleware). Refreshes the Supabase
// session on every request, gates non-public routes, and manages local workspace owner cookies.
export default async function proxy(request: NextRequest) {
  // 1. Run the Supabase updateSession first
  const response = await updateSession(request);

  // If updateSession redirected, return it immediately
  if (response.headers.get("location")) {
    return response;
  }

  // 2. Run the local owner cookie initialization for workspace routes
  const pathname = request.nextUrl.pathname;
  const isWorkspaceRoute = pathname === "/workspace" || pathname.startsWith("/api/workspaces/");

  if (isWorkspaceRoute) {
    const existingOwnerId = request.cookies.get(WORKSPACE_LOCAL_OWNER_COOKIE)?.value;
    if (!existingOwnerId) {
      const ownerId = `local_${crypto.randomUUID().replace(/-/g, "")}`;

      // Update request headers for downstream routes/API handlers
      const requestHeaders = new Headers(request.headers);
      const currentCookie = requestHeaders.get("cookie");
      requestHeaders.set(
        "cookie",
        currentCookie ? `${currentCookie}; ${WORKSPACE_LOCAL_OWNER_COOKIE}=${ownerId}` : `${WORKSPACE_LOCAL_OWNER_COOKIE}=${ownerId}`
      );

      // Create a new response with the updated request headers
      const newResponse = NextResponse.next({ request: { headers: requestHeaders } });

      // Copy headers/cookies from the original response to the new response
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== "content-type") {
          newResponse.headers.set(key, value);
        }
      });

      response.cookies.getAll().forEach((cookie) => {
        newResponse.cookies.set(cookie.name, cookie.value);
      });

      // Set the local owner cookie
      newResponse.cookies.set(WORKSPACE_LOCAL_OWNER_COOKIE, ownerId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });

      return newResponse;
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals, the API (guarded separately), and static assets.
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?)$).*)",
    // Plus the workspace and workspace API routes
    "/workspace",
    "/api/workspaces/:path*",
  ],
};
