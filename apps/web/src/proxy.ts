import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

const PUBLIC_PATTERNS = [
  /^\/login(\/|$)/,
  /^\/signup(\/|$)/,
  /^\/auth\/sign-in(\/|$)/,
  /^\/auth\/sign-up(\/|$)/,
  /^\/auth\/callback(\/|$)/,
  /^\/forgot(\/|$)/,
  /^\/reset-password(\/|$)/,
  /^\/dev\/onboarding(\/|$)/,
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATTERNS.some((re) => re.test(pathname));
}

// Next.js 16 "proxy" convention (formerly middleware). Page navigation is gated
// by the app-owned session cookie; API routes validate the session against DB.
export default function proxy(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next({ request });
  if (request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next({ request });

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Everything except Next internals, the API (guarded separately), and static assets.
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?)$).*)",
  ],
};
