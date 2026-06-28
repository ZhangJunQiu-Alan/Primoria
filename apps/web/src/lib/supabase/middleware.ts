import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseEnv } from "./env";

const PUBLIC_PATTERNS = [
  /^\/login(\/|$)/,
  /^\/signup(\/|$)/,
  /^\/forgot(\/|$)/,
  /^\/auth(\/|$)/,
  /^\/dev\/onboarding(\/|$)/,
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATTERNS.some((re) => re.test(pathname));
}

export async function updateSession(request: NextRequest) {
  const env = supabaseEnv();
  // Staged rollout: until Supabase is configured, do not gate anything.
  if (!env) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
