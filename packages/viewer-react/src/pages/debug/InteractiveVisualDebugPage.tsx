import { useMemo, useState, type ReactNode } from 'react';
import { InteractiveVisualEmbed } from '@/shared/interactive-visual/InteractiveVisualEmbed';
import { supabase, viewerSupabaseAnonKey, viewerSupabaseUrl } from '@/shared/api/supabase';
import {
  normalizeInteractiveVisualArtifact,
  validateOfflineInteractiveHtml,
  type InteractiveVisualArtifact,
} from '@/shared/interactive/interactiveVisual';
import { useAppSelector } from '@/shared/state/store';

type DebugLanguage = 'auto' | 'en' | 'zh-CN';

type DebugResult = {
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  endpoint: string;
  requestHeaders: Record<string, string>;
  requestBody: Record<string, unknown>;
  auth: {
    userId?: string;
    email?: string;
    hasAccessToken: boolean;
    tokenLength?: number;
    expiresAt?: number;
  };
  status?: number;
  statusText?: string;
  ok?: boolean;
  responseHeaders?: Record<string, string>;
  rawText?: string;
  parsedJson?: unknown;
  events?: DebugHttpEvent[];
  job?: DebugJob;
  artifact?: InteractiveVisualArtifact;
  clientValidation?: string;
  error?: string;
};

type DebugHttpEvent = {
  label: string;
  at: string;
  status?: number;
  ok?: boolean;
  rawText?: string;
  parsedJson?: unknown;
};

type DebugJob = {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  lastError?: string;
  errorHistory: Array<Record<string, unknown>>;
  attemptCount: number;
  nextAttemptAt?: string;
  resultArtifact?: unknown;
};

const DEFAULT_PROMPT =
  '请做一个一次函数 y=ax+b 的交互式可视化。画面里要有坐标系和直线，学生可以拖动两个滑块改变 a 和 b，并实时看到斜率和截距如何变化。';
const PRE_CLASS =
  'overflow-auto whitespace-pre-wrap break-words rounded-md border border-[#e0d7cc] bg-[#f8f5f0] p-3 font-mono text-xs leading-5 text-[#2f2a25]';

function containsChineseText(value: string) {
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(value);
}

function resolveLanguage(prompt: string, language: DebugLanguage) {
  if (language !== 'auto') {
    return language;
  }
  return containsChineseText(prompt) ? 'zh-CN' : 'en';
}

function buildFunctionUrl() {
  if (viewerSupabaseUrl.includes('.supabase.co')) {
    return `${viewerSupabaseUrl.replace('.supabase.co', '.functions.supabase.co')}/viewer-ai-interactive-visual`;
  }
  return `${viewerSupabaseUrl.replace(/\/$/, '')}/functions/v1/viewer-ai-interactive-visual`;
}

function stringify(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function responseHeadersToRecord(headers: Headers) {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

function normalizeDebugJob(value: unknown): DebugJob | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : '';
  const status = typeof record.status === 'string' ? record.status : '';
  if (!id || !['queued', 'running', 'succeeded', 'failed'].includes(status)) {
    return undefined;
  }
  return {
    id,
    status: status as DebugJob['status'],
    lastError: typeof record.lastError === 'string' ? record.lastError : undefined,
    errorHistory: Array.isArray(record.errorHistory) ? (record.errorHistory as Array<Record<string, unknown>>) : [],
    attemptCount: typeof record.attemptCount === 'number' ? record.attemptCount : 0,
    nextAttemptAt: typeof record.nextAttemptAt === 'string' ? record.nextAttemptAt : undefined,
    resultArtifact: record.resultArtifact,
  };
}

function eventFromResponse(label: string, response: Response, rawText: string, parsedJson: unknown): DebugHttpEvent {
  return {
    label,
    at: new Date().toISOString(),
    status: response.status,
    ok: response.ok,
    rawText,
    parsedJson,
  };
}

async function parseDebugResponse(response: Response) {
  const rawText = await response.text();
  let parsedJson: unknown;
  let parseError: string | undefined;
  try {
    parsedJson = rawText ? JSON.parse(rawText) : null;
  } catch (error) {
    parseError = error instanceof Error ? error.message : 'JSON parse failed';
  }
  return { rawText, parsedJson, parseError };
}

export function InteractiveVisualDebugPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [language, setLanguage] = useState<DebugLanguage>('auto');
  const [template, setTemplate] = useState('generic');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);

  const endpoint = useMemo(buildFunctionUrl, []);
  const resolvedLanguage = resolveLanguage(prompt, language);

  async function sendRequest() {
    const started = performance.now();
    const startedAt = new Date().toISOString();
    const trimmedPrompt = prompt.trim();
    const requestBody = {
      action: 'create',
      prompt: trimmedPrompt,
      template: template.trim() || 'generic',
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      language: resolvedLanguage,
      surface: 'builder',
    };

    setIsSending(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const session = sessionData.session;
      const accessToken = session?.access_token ?? '';
      const baseResult: DebugResult = {
        startedAt,
        endpoint,
        requestHeaders: {
          'Content-Type': 'application/json',
          apikey: viewerSupabaseAnonKey ? '[present]' : '[missing]',
          Authorization: accessToken ? `Bearer [redacted, ${accessToken.length} chars]` : '[missing]',
        },
        requestBody,
        auth: {
          userId: user?.id,
          email: user?.email,
          hasAccessToken: Boolean(accessToken),
          tokenLength: accessToken ? accessToken.length : undefined,
          expiresAt: session?.expires_at,
        },
      };

      if (sessionError) {
        setResult({
          ...baseResult,
          endedAt: new Date().toISOString(),
          durationMs: Math.round(performance.now() - started),
          error: sessionError.message,
        });
        return;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: viewerSupabaseAnonKey,
          Authorization: accessToken ? `Bearer ${accessToken}` : `Bearer ${viewerSupabaseAnonKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      const { rawText, parsedJson, parseError } = await parseDebugResponse(response);
      const events = [eventFromResponse('create', response, rawText, parsedJson)];
      let job = normalizeDebugJob((parsedJson as { job?: unknown } | null)?.job);
      let statusResponseHeaders = responseHeadersToRecord(response.headers);
      let currentRawText = rawText;
      let currentParsedJson = parsedJson;
      let currentStatus = response.status;
      let currentStatusText = response.statusText;
      let currentOk = response.ok;

      setResult({
        ...baseResult,
        endedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - started),
        status: currentStatus,
        statusText: currentStatusText,
        ok: currentOk,
        responseHeaders: statusResponseHeaders,
        rawText: currentRawText,
        parsedJson: currentParsedJson,
        events,
        job,
        clientValidation: job?.resultArtifact ? 'pending normalization' : 'no generatedHtml',
        error: parseError,
      });

      const pollStarted = Date.now();
      while (job && job.status !== 'succeeded' && job.status !== 'failed' && Date.now() - pollStarted < 180_000) {
        const nextAttemptDelay = job.nextAttemptAt ? Date.parse(job.nextAttemptAt) - Date.now() : Number.NaN;
        const waitMs = Number.isFinite(nextAttemptDelay)
          ? Math.min(Math.max(nextAttemptDelay, 1500), 5000)
          : 1500;
        await new Promise((resolve) => setTimeout(resolve, waitMs));

        const statusResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: viewerSupabaseAnonKey,
            Authorization: accessToken ? `Bearer ${accessToken}` : `Bearer ${viewerSupabaseAnonKey}`,
          },
          body: JSON.stringify({ action: 'status', jobId: job.id }),
        });
        const statusParsed = await parseDebugResponse(statusResponse);
        const statusEvent = eventFromResponse('status', statusResponse, statusParsed.rawText, statusParsed.parsedJson);
        events.push(statusEvent);
        job = normalizeDebugJob((statusParsed.parsedJson as { job?: unknown } | null)?.job) ?? job;
        statusResponseHeaders = responseHeadersToRecord(statusResponse.headers);
        currentRawText = statusParsed.rawText;
        currentParsedJson = statusParsed.parsedJson;
        currentStatus = statusResponse.status;
        currentStatusText = statusResponse.statusText;
        currentOk = statusResponse.ok;

        setResult({
          ...baseResult,
          endedAt: new Date().toISOString(),
          durationMs: Math.round(performance.now() - started),
          status: currentStatus,
          statusText: currentStatusText,
          ok: currentOk,
          responseHeaders: statusResponseHeaders,
          rawText: currentRawText,
          parsedJson: currentParsedJson,
          events: [...events],
          job,
          clientValidation: job?.resultArtifact ? 'pending normalization' : 'no generatedHtml',
          error: statusParsed.parseError,
        });
      }

      let artifact: InteractiveVisualArtifact | undefined;
      let clientValidation: string | undefined;
      let normalizationError: string | undefined;
      if (job?.resultArtifact) {
        try {
          const normalized = normalizeInteractiveVisualArtifact(job.resultArtifact, {
            prompt: trimmedPrompt,
            template: requestBody.template,
          });
          artifact = normalized ?? undefined;
          clientValidation = artifact?.generatedHtml
            ? validateOfflineInteractiveHtml(artifact.generatedHtml) ?? 'passed'
            : 'no generatedHtml';
        } catch (error) {
          normalizationError = error instanceof Error ? error.message : 'artifact normalization failed';
        }
      }

      setResult({
        ...baseResult,
        endedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - started),
        status: currentStatus,
        statusText: currentStatusText,
        ok: currentOk,
        responseHeaders: statusResponseHeaders,
        rawText: currentRawText,
        parsedJson: currentParsedJson,
        events,
        job,
        artifact,
        clientValidation: clientValidation ?? (job?.resultArtifact ? 'normalization failed' : 'no generatedHtml'),
        error: normalizationError ?? job?.lastError,
      });
    } catch (error) {
      setResult({
        startedAt,
        endedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - started),
        endpoint,
        requestHeaders: {
          'Content-Type': 'application/json',
          apikey: viewerSupabaseAnonKey ? '[present]' : '[missing]',
          Authorization: '[unknown]',
        },
        requestBody,
        auth: {
          userId: user?.id,
          email: user?.email,
          hasAccessToken: false,
        },
        error: error instanceof Error ? error.message : 'Request failed',
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="min-h-full bg-[#f6f3ef] px-4 py-5 text-[#2f2a25] md:px-8">
      <div className="mx-auto max-w-[1440px] space-y-5">
        <header className="flex flex-col gap-2 border-b border-[#ded5ca] pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6f65]">Interactive Visual Debug</p>
            <h1 className="mt-1 text-2xl font-bold">AI 生成调试台</h1>
            <p className="mt-1 text-sm text-[#6f665e]">
              直接调用 Edge Function，展示请求、认证、HTTP、原始响应、解析结果和 iframe 预览。
            </p>
          </div>
          <div className="rounded-md border border-[#d8cec2] bg-white px-3 py-2 text-xs text-[#5f554b]">
            <div>Endpoint</div>
            <code className="break-all text-[#3b6f9f]">{endpoint}</code>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <div className="rounded-lg border border-[#d8cec2] bg-white p-4 shadow-sm">
              <div className="grid gap-3">
                <label className="grid gap-1 text-sm font-semibold">
                  Prompt
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    rows={8}
                    className="min-h-40 rounded-md border border-[#d7cec3] bg-[#fffdf9] px-3 py-2 text-sm font-normal leading-6 outline-none focus:border-[#7c9d72]"
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="grid gap-1 text-sm font-semibold">
                    Language
                    <select
                      value={language}
                      onChange={(event) => setLanguage(event.target.value as DebugLanguage)}
                      className="rounded-md border border-[#d7cec3] bg-[#fffdf9] px-3 py-2 text-sm font-normal"
                    >
                      <option value="auto">auto ({resolvedLanguage})</option>
                      <option value="zh-CN">zh-CN</option>
                      <option value="en">en</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    Template
                    <input
                      value={template}
                      onChange={(event) => setTemplate(event.target.value)}
                      className="rounded-md border border-[#d7cec3] bg-[#fffdf9] px-3 py-2 text-sm font-normal"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void sendRequest()}
                    disabled={isSending || prompt.trim().length < 8}
                    className="self-end rounded-md bg-[#466d4f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#385b40] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSending ? 'Generating...' : 'Send to Edge Function'}
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold">
                    Suggested title
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className="rounded-md border border-[#d7cec3] bg-[#fffdf9] px-3 py-2 text-sm font-normal"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    Suggested description
                    <input
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      className="rounded-md border border-[#d7cec3] bg-[#fffdf9] px-3 py-2 text-sm font-normal"
                    />
                  </label>
                </div>
              </div>
            </div>

            <DebugPanel title="Auth">
              <KeyValueRows
                rows={[
                  ['user.id', user?.id ?? '[none]'],
                  ['user.email', user?.email ?? '[none]'],
                  ['session token', result?.auth.hasAccessToken ? `present (${result.auth.tokenLength} chars)` : '[missing]'],
                  ['expires_at', result?.auth.expiresAt ? String(result.auth.expiresAt) : '[unknown]'],
                ]}
              />
            </DebugPanel>

            <DebugPanel title="Request">
              <pre className={PRE_CLASS}>{stringify({
                endpoint,
                headers: result?.requestHeaders ?? {
                  'Content-Type': 'application/json',
                  apikey: viewerSupabaseAnonKey ? '[present]' : '[missing]',
                  Authorization: '[available after send]',
                },
                body: result?.requestBody ?? {
                  action: 'create',
                  prompt: prompt.trim(),
                  template,
                  language: resolvedLanguage,
                  surface: 'builder',
                },
              })}</pre>
            </DebugPanel>
          </div>

          <div className="space-y-4">
            <DebugPanel title="HTTP Feedback">
              <KeyValueRows
                rows={[
                  ['started_at', result?.startedAt ?? '[not sent]'],
                  ['duration_ms', result?.durationMs == null ? '[not sent]' : String(result.durationMs)],
                  ['status', result?.status == null ? '[not sent]' : `${result.status} ${result.statusText ?? ''}`.trim()],
                  ['ok', result?.ok == null ? '[not sent]' : String(result.ok)],
                  ['job_id', result?.job?.id ?? '[none]'],
                  ['job_status', result?.job?.status ?? '[none]'],
                  ['attempt_count', result?.job ? String(result.job.attemptCount) : '[none]'],
                  ['next_attempt_at', result?.job?.nextAttemptAt ?? '[none]'],
                  ['client_validation', result?.clientValidation ?? '[not run]'],
                  ['error', result?.error ?? result?.job?.lastError ?? '[none]'],
                ]}
              />
            </DebugPanel>

            <DebugPanel title="Job Error History">
              <pre className={`${PRE_CLASS} max-h-[280px]`}>{stringify(result?.job?.errorHistory ?? [])}</pre>
            </DebugPanel>

            <DebugPanel title="HTTP Events">
              <pre className={`${PRE_CLASS} max-h-[280px]`}>{stringify(
                (result?.events ?? []).map((event) => ({
                  label: event.label,
                  at: event.at,
                  status: event.status,
                  ok: event.ok,
                  parsedJson: event.parsedJson,
                })),
              )}</pre>
            </DebugPanel>

            <DebugPanel title="Response Headers">
              <pre className={PRE_CLASS}>{stringify(result?.responseHeaders ?? {})}</pre>
            </DebugPanel>

            <DebugPanel title="Parsed JSON">
              <pre className={PRE_CLASS}>{stringify(result?.parsedJson ?? '[not available]')}</pre>
            </DebugPanel>

            <DebugPanel title="Raw Response Body">
              <pre className={`${PRE_CLASS} max-h-[420px]`}>{result?.rawText ?? '[not available]'}</pre>
            </DebugPanel>
          </div>
        </section>

        {result?.artifact ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <DebugPanel title="Normalized Artifact">
              <pre className={`${PRE_CLASS} max-h-[520px]`}>{stringify({
                version: result.artifact.version,
                engine: result.artifact.engine,
                template: result.artifact.template,
                title: result.artifact.title,
                description: result.artifact.description,
                experienceMode: result.artifact.experienceMode,
                themeTone: result.artifact.themeTone,
                generatedHtmlLength: result.artifact.generatedHtml.length,
                generatedHtmlPreview: result.artifact.generatedHtml.slice(0, 1200),
              })}</pre>
            </DebugPanel>

            <div className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#6f665e]">Iframe Preview</h2>
              <InteractiveVisualEmbed
                title={result.artifact.title}
                description={result.artifact.description}
                generatedHtml={result.artifact.generatedHtml}
                frameClassName="h-[680px]"
              />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function DebugPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-[#d8cec2] bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-[#6f665e]">{title}</h2>
      {children}
    </section>
  );
}

function KeyValueRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid gap-2 text-sm">
      {rows.map(([key, value]) => (
        <div key={key} className="grid gap-1 rounded-md bg-[#f8f5f0] px-3 py-2 md:grid-cols-[150px_minmax(0,1fr)]">
          <dt className="font-semibold text-[#6f665e]">{key}</dt>
          <dd className="break-all font-mono text-xs text-[#2f2a25]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
