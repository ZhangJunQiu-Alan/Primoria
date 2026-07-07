export type SupabaseEnv = { url: string; anonKey: string };

// Returns the public Supabase config, or null when not yet configured.
// Phase 1 supports staged rollout: until these are set, auth is treated as
// disabled (middleware/API guards pass through) so the app stays runnable.
export function supabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

// The unauthenticated pass-through is a dev/staging convenience only.
// In production a missing Supabase config must fail closed, not open.
export function isAuthBypassAllowed(): boolean {
  return !supabaseEnv() && process.env.NODE_ENV !== "production";
}

export function requireSupabaseEnv(): SupabaseEnv {
  const env = supabaseEnv();
  if (!env) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return env;
}
