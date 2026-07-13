import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { validateRequestOrigin } from "@/lib/auth/origin";
import { LOGIN_PATH, isPublicPath } from "@/lib/auth/routes";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

function requestIdFor(request: NextRequest) {
  const incoming = request.headers.get("x-request-id")?.trim();
  return incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : crypto.randomUUID();
}

function continueWithRequestId(request: NextRequest, requestId: string) {
  const headers = new Headers(request.headers);
  headers.set("x-request-id", requestId);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("x-request-id", requestId);
  return response;
}

// Next.js 16 "proxy" convention (formerly middleware). Page navigation is gated
// by the app-owned session cookie; API routes validate the session against DB.
export default function proxy(request: NextRequest) {
  const requestId = requestIdFor(request);
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
      { status: originCheck.status, headers: { "Cache-Control": "no-store", "x-request-id": requestId } },
    );
  }

  if (request.nextUrl.pathname.startsWith("/api/")) return continueWithRequestId(request, requestId);
  if (isPublicPath(request.nextUrl.pathname)) return continueWithRequestId(request, requestId);
  if (request.cookies.get(SESSION_COOKIE)?.value) return continueWithRequestId(request, requestId);

  const url = request.nextUrl.clone();
  url.pathname = LOGIN_PATH;
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const response = NextResponse.redirect(url);
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    // Page routes except Next internals and static assets; API routes are matched above.
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?)$).*)",
  ],
};
