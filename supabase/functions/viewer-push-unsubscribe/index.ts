import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getSupabaseUrl() {
  const value = Deno.env.get('SUPABASE_URL') ?? '';
  if (!value) {
    throw new Error('SUPABASE_URL is required.');
  }
  return value;
}

function getSupabaseAnonKey() {
  const value = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (!value) {
    throw new Error('SUPABASE_ANON_KEY is required.');
  }
  return value;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get('Authorization') ?? '';
    const client = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    });

    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const payload = await req.json().catch(() => ({}));
    const endpoint = typeof payload?.endpoint === 'string' ? payload.endpoint.trim() : '';
    const permissionState =
      payload?.permission_state === 'granted' ||
      payload?.permission_state === 'denied' ||
      payload?.permission_state === 'unsupported'
        ? payload.permission_state
        : 'default';

    let query = client
      .from('web_push_subscriptions')
      .update({ active: false, permission_state: permissionState })
      .eq('user_id', authData.user.id);

    if (endpoint) {
      query = query.eq('endpoint', endpoint);
    }

    const { error } = await query;
    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
