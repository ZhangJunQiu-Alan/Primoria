import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { validateRequestOrigin } from "@/lib/auth/origin";
import { LOGIN_PATH, isPublicPath } from "@/lib/auth/routes";

// Next.js 16 "proxy" convention (formerly middleware). Page navigation is gated
// by the app-owned session cookie; API routes validate the session against DB.
export default function proxy(request: NextRequest) {
  const originCheck = validateRequestOrigin(
    {
      method: request.method,
      pathname: request.nextUrl.pathname,
      url: request.url,
      headers: request.headers,
    },
    {
      appBaseUrl: process.env.APP_BASE_URL,
      publicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    },
  );
  if (!originCheck.ok) {
    return NextResponse.json(
      { error: originCheck.message },
      { status: originCheck.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.next({ request });
  if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next({ request });
  if (request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next({ request });

  const url = request.nextUrl.clone();
  url.pathname = LOGIN_PATH;
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/api/:path*",
    // Page routes except Next internals and static assets; API routes are matched above.
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?)$).*)",
  ],
};
