import { supabase } from '@/shared/api/supabase';

const rawAgentServiceUrl = (import.meta.env.VITE_AGENT_SERVICE_URL as string | undefined)?.trim() ?? '';

export function agentServiceUrl(path: string) {
  if (!rawAgentServiceUrl) {
    throw new Error('Agent service requires VITE_AGENT_SERVICE_URL.');
  }
  return `${rawAgentServiceUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function getAgentAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error('Agent service requires a signed-in learner session.');
  }
  return accessToken;
}

export async function fetchAgentJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = await getAgentAccessToken();
  const headers = new Headers(init.headers ?? {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (!headers.has('Content-Type') && init.body != null) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(agentServiceUrl(path), {
    ...init,
    headers,
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T | { detail?: string }) : ({} as T | { detail?: string });
  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && 'detail' in payload && typeof payload.detail === 'string'
        ? payload.detail
        : `Agent service failed with HTTP ${response.status}.`;
    throw new Error(detail);
  }
  return payload as T;
}
