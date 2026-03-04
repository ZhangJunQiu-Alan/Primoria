/**
 * POST /functions/v1/get-gemini-key
 *
 * Returns the server-side GEMINI_API_KEY to any authenticated user.
 * The Flutter app fetches this once per session and uses it for direct
 * Gemini API calls (bypassing Edge Function timeouts).
 *
 * Response (success): { success: true, key: string }
 * Response (error):   { success: false, error: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey    = Deno.env.get('SUPABASE_ANON_KEY');
  const geminiKey  = Deno.env.get('GEMINI_API_KEY');

  if (!supabaseUrl || !anonKey) {
    return json({ success: false, error: 'Server misconfigured' }, 500);
  }
  if (!geminiKey) {
    return json({ success: false, error: 'GEMINI_API_KEY not set on server' }, 500);
  }

  // Verify the caller has a valid Supabase session
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  return json({ success: true, key: geminiKey });
});
