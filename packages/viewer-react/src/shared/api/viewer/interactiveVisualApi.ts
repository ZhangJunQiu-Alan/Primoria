import { supabase, viewerSupabaseAnonKey, viewerSupabaseUrl } from '@/shared/api/supabase';
import { usesViewerFixtures } from '@/shared/api/viewer/core';
import {
  createInteractiveVisualFallback,
  normalizeInteractiveVisualArtifact,
  type InteractiveVisualArtifact,
} from '@/shared/interactive/interactiveVisual';
import type { InteractiveVisualMode } from '@/shared/interactive/interactiveVisualModes';

export type InteractiveVisualGenerationJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type InteractiveVisualGenerationErrorEntry = {
  at: string;
  attempt: number;
  kind: 'transient' | 'validation' | 'fatal';
  message: string;
  retryable: boolean;
  nextAttemptAt?: string;
  httpStatus?: number;
};

export type InteractiveVisualGenerationJob = {
  id: string;
  status: InteractiveVisualGenerationJobStatus;
  prompt: string;
  requestPayload: Record<string, unknown>;
  resultArtifact?: unknown;
  lastError?: string;
  errorHistory: InteractiveVisualGenerationErrorEntry[];
  attemptCount: number;
  nextAttemptAt?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
};

export type CreateInteractiveVisualRequest = {
  prompt: string;
  template?: string;
  experienceMode?: InteractiveVisualMode;
  title?: string;
  description?: string;
  language?: 'en' | 'zh-CN';
  surface?: 'builder' | 'ai-tutor';
  allowFallback?: boolean;
  onJobUpdate?: (job: InteractiveVisualGenerationJob) => void;
  timeoutMs?: number;
};

const DEFAULT_JOB_TIMEOUT_MS = 180_000;
const DEFAULT_JOB_POLL_MS = 1_500;

function postDevDebugLog(payload: unknown) {
  if (!import.meta.env.DEV) return;
  try {
    void fetch('/__dev/iv-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generation: payload }, null, 2),
    }).catch(() => {});
  } catch {
    // best-effort logging only
  }
}

export function postDevHealthLog(snapshot: unknown) {
  if (!import.meta.env.DEV) return;
  try {
    void fetch('/__dev/iv-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ health: snapshot }, null, 2),
    }).catch(() => {});
  } catch {
    // best-effort logging only
  }
}

async function getInteractiveVisualAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session?.access_token ?? null;
}

function buildInteractiveVisualFunctionUrl() {
  if (!viewerSupabaseUrl || viewerSupabaseUrl.includes('placeholder')) {
    throw new Error('Interactive visual generation requires Supabase configuration.');
  }
  if (!viewerSupabaseAnonKey || viewerSupabaseAnonKey === 'placeholder') {
    throw new Error('Interactive visual generation requires Supabase configuration.');
  }

  if (viewerSupabaseUrl.includes('.supabase.co')) {
    return `${viewerSupabaseUrl.replace('.supabase.co', '.functions.supabase.co')}/viewer-ai-interactive-visual`;
  }

  return `${viewerSupabaseUrl.replace(/\/$/, '')}/functions/v1/viewer-ai-interactive-visual`;
}

function parseErrorPayload(raw: string): { message?: unknown; error?: unknown; code?: unknown } | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as { message?: unknown; error?: unknown; code?: unknown }) : null;
  } catch {
    return null;
  }
}

function errorTextFromPayload(payload: { message?: unknown; error?: unknown; code?: unknown } | null, fallback: string) {
  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message;
  }
  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error;
  }
  if (typeof payload?.code === 'string' && payload.code.trim()) {
    return payload.code;
  }
  return fallback;
}

async function buildInteractiveVisualError(response: Response) {
  const raw = await response.text();
  const payload = parseErrorPayload(raw);
  const normalizedText = `${response.status} ${raw} ${errorTextFromPayload(payload, '')}`.toLowerCase();

  if (response.status === 404 && (normalizedText.includes('not_found') || normalizedText.includes('not found'))) {
    return new Error('Interactive visual generation function is not deployed.');
  }

  if (response.status === 401 || response.status === 403) {
    return new Error('Please sign in before generating an interactive visual.');
  }

  if (response.status >= 500) {
    return new Error('Interactive visual generation service is temporarily unavailable.');
  }

  return new Error(errorTextFromPayload(payload, raw || 'AI interactive visual generation failed.'));
}

function normalizeErrorHistory(value: unknown): InteractiveVisualGenerationErrorEntry[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is InteractiveVisualGenerationErrorEntry => Boolean(entry && typeof entry === 'object'))
    : [];
}

function normalizeGenerationJob(value: unknown): InteractiveVisualGenerationJob | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : '';
  const status = typeof record.status === 'string' ? record.status : '';
  if (!id || !['queued', 'running', 'succeeded', 'failed'].includes(status)) {
    return null;
  }

  return {
    id,
    status: status as InteractiveVisualGenerationJobStatus,
    prompt: typeof record.prompt === 'string' ? record.prompt : '',
    requestPayload: record.requestPayload && typeof record.requestPayload === 'object'
      ? (record.requestPayload as Record<string, unknown>)
      : {},
    resultArtifact: record.resultArtifact,
    lastError: typeof record.lastError === 'string' ? record.lastError : undefined,
    errorHistory: normalizeErrorHistory(record.errorHistory),
    attemptCount: typeof record.attemptCount === 'number' ? record.attemptCount : 0,
    nextAttemptAt: typeof record.nextAttemptAt === 'string' ? record.nextAttemptAt : undefined,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : undefined,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
    completedAt: typeof record.completedAt === 'string' ? record.completedAt : undefined,
  };
}

async function fetchInteractiveVisualFunction(body: Record<string, unknown>, accessToken: string) {
  const response = await fetch(buildInteractiveVisualFunctionUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: viewerSupabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw await buildInteractiveVisualError(response);
  }

  return (await response.json()) as unknown;
}

export async function createInteractiveVisualJob(
  request: CreateInteractiveVisualRequest,
): Promise<InteractiveVisualGenerationJob> {
  const accessToken = await getInteractiveVisualAccessToken();
  if (!accessToken) {
    throw new Error('Please sign in before generating an interactive visual.');
  }

  const data = await fetchInteractiveVisualFunction(
    {
      action: 'create',
      prompt: request.prompt.trim(),
      template: request.template,
      experienceMode: request.experienceMode,
      title: request.title,
      description: request.description,
      language: request.language ?? 'en',
      surface: request.surface ?? 'builder',
    },
    accessToken,
  );
  const job = normalizeGenerationJob((data as { job?: unknown }).job);
  if (!job) {
    throw new Error('Interactive visual generation did not return a job.');
  }
  return job;
}

export async function getInteractiveVisualJob(jobId: string): Promise<InteractiveVisualGenerationJob> {
  const accessToken = await getInteractiveVisualAccessToken();
  if (!accessToken) {
    throw new Error('Please sign in before generating an interactive visual.');
  }

  const data = await fetchInteractiveVisualFunction({ action: 'status', jobId }, accessToken);
  const job = normalizeGenerationJob((data as { job?: unknown }).job);
  if (!job) {
    throw new Error('Interactive visual generation job was not found.');
  }
  return job;
}

function nextPollDelay(job: InteractiveVisualGenerationJob) {
  if (!job.nextAttemptAt) {
    return DEFAULT_JOB_POLL_MS;
  }
  const waitForNextAttempt = Date.parse(job.nextAttemptAt) - Date.now();
  if (!Number.isFinite(waitForNextAttempt) || waitForNextAttempt <= 0) {
    return DEFAULT_JOB_POLL_MS;
  }
  return Math.min(Math.max(waitForNextAttempt, DEFAULT_JOB_POLL_MS), 5_000);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForInteractiveVisualJob(
  job: InteractiveVisualGenerationJob,
  request: CreateInteractiveVisualRequest,
): Promise<InteractiveVisualArtifact> {
  const startedAt = Date.now();
  let current = job;
  request.onJobUpdate?.(current);

  while (Date.now() - startedAt < (request.timeoutMs ?? DEFAULT_JOB_TIMEOUT_MS)) {
    if (current.status === 'succeeded') {
      const artifact = normalizeInteractiveVisualArtifact(current.resultArtifact, {
        prompt: request.prompt,
        template: request.template,
        experienceMode: request.experienceMode,
      });
      if (!artifact) {
        throw new Error('AI interactive visual generation returned an empty result.');
      }
      return artifact;
    }

    if (current.status === 'failed') {
      throw new Error(current.lastError ?? 'AI interactive visual generation failed.');
    }

    await delay(nextPollDelay(current));
    current = await getInteractiveVisualJob(current.id);
    request.onJobUpdate?.(current);
  }

  throw new Error('Interactive visual generation timed out. Please check the generation job later.');
}

export async function createInteractiveVisual(
  request: CreateInteractiveVisualRequest,
): Promise<InteractiveVisualArtifact> {
  const prompt = request.prompt.trim();
  if (!prompt) {
    throw new Error('An AI element prompt is required.');
  }

  if (usesViewerFixtures()) {
    return createInteractiveVisualFallback(request);
  }

  let lastJob: InteractiveVisualGenerationJob | null = null;
  const userOnJobUpdate = request.onJobUpdate;
  const wrapped: CreateInteractiveVisualRequest = {
    ...request,
    prompt,
    onJobUpdate: (job) => {
      lastJob = job;
      userOnJobUpdate?.(job);
    },
  };

  try {
    const job = await createInteractiveVisualJob(wrapped);
    lastJob = job;
    const artifact = await waitForInteractiveVisualJob(job, wrapped);
    postDevDebugLog({
      ok: true,
      at: new Date().toISOString(),
      request: { prompt, template: request.template, experienceMode: request.experienceMode, surface: request.surface, language: request.language },
      job: lastJob,
      artifact,
    });
    return artifact;
  } catch (error) {
    postDevDebugLog({
      ok: false,
      at: new Date().toISOString(),
      request: { prompt, template: request.template, experienceMode: request.experienceMode, surface: request.surface, language: request.language },
      job: lastJob,
      error: error instanceof Error ? error.message : String(error),
    });
    if (request.allowFallback === false) {
      throw error;
    }
    return createInteractiveVisualFallback(request);
  }
}
