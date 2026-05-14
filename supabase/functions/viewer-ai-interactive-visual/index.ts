import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function agentServiceUrl(path: string) {
  const baseUrl = Deno.env.get('AGENT_SERVICE_URL')?.trim().replace(/\/$/, '') ?? '';
  if (!baseUrl) {
    throw new Error('AGENT_SERVICE_URL is required. Model API calls are centralized in agent-service.');
  }
  return `${baseUrl}${path}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get('Authorization') ?? '';
    const response = await fetch(agentServiceUrl('/v1/llm/interactive-visual'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: await req.text(),
    });

    return new Response(await response.text(), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': response.headers.get('Content-Type') ?? 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
