import { createClient } from '@supabase/supabase-js';
import { isFixtureModeEnabled } from '@/shared/utils/demoMode';

const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const rawSupabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

// In fixture/demo mode (VITE_VIEWER_DEMO_MODE=1 or test), env vars are not required —
// all API calls are intercepted by fixture handlers so the client is never actually used.
// Outside fixture mode, the Vite plugin `require-supabase-env` ensures both vars are
// present at build time, so the runtime fallback below is only reachable in fixture mode.
const supabaseUrl = rawSupabaseUrl ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = rawSupabaseAnonKey ?? 'placeholder';

if ((!rawSupabaseUrl || !rawSupabaseAnonKey) && !isFixtureModeEnabled()) {
  console.error(
    '[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set outside fixture mode. ' +
      'This should have been caught at build time by require-supabase-env.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
