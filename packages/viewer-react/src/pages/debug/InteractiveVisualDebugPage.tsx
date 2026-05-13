import { useMemo, useState } from 'react';
import { InteractiveVisualEmbed } from '@/shared/interactive-visual/InteractiveVisualEmbed';
import { supabase, viewerSupabaseAnonKey, viewerSupabaseUrl } from '@/shared/api/supabase';
import {
  normalizeInteractiveVisualArtifact,
  validateOfflineInteractiveHtml,
  type InteractiveVisualArtifact,
} from '@/shared/interactive/interactiveVisual';
import { useAppSelector } from '@/shared/state/store';

type DebugLanguage = 'auto' | 'en' | 'zh-CN';
type DebugJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';
type RunPhase = 'idle' | 'creating' | 'running' | 'succeeded' | 'failed';

type PromptRunInput = {
  id: string;
  label: string;
  prompt: string;
  template: string;
  title: string;
  description: string;
  language: DebugLanguage;
};

type DebugJob = {
  id: string;
  status: DebugJobStatus;
  lastError?: string;
  errorHistory: Array<Record<string, unknown>>;
  attemptCount: number;
  nextAttemptAt?: string;
  resultArtifact?: unknown;
};

type PromptRunState = PromptRunInput & {
  phase: RunPhase;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  httpStatus?: number;
  httpStatusText?: string;
  job?: DebugJob;
  artifact?: InteractiveVisualArtifact;
  clientValidation?: string;
  error?: string;
};

type ParsedDebugResponse = {
  rawText: string;
  parsedJson: unknown;
  parseError?: string;
};

const DEFAULT_PROMPTS: PromptRunInput[] = [
  {
    id: 'gas-compression',
    label: 'Gas Compression',
    prompt:
      '我想讲理想气体压缩过程。请做一个活塞压缩气体的交互动画，用户可以拖动活塞位置，并看到体积变小、粒子更密集、压强变化更明显。希望学生通过拖动直接感受到“体积减小会影响分子状态和压强表现”。',
    title: '理想气体压缩过程',
    description: '拖动活塞，观察气体体积、密度与压强的变化。',
    template: 'generic',
    language: 'zh-CN',
  },
  {
    id: 'linear-function',
    label: 'Linear Function',
    prompt:
      '请做一个一次函数 y=ax+b 的交互式可视化。画面里要有坐标系和直线，学生可以拖动两个滑块改变 a 和 b，并实时看到斜率和截距如何变化。',
    title: '一次函数探索',
    description: '调整斜率和截距，观察直线如何变化。',
    template: 'generic',
    language: 'zh-CN',
  },
  {
    id: 'fractions',
    label: 'Fractions',
    prompt:
      'Create an interactive visualization for fractions. Show a full pie chart that changes with the value, display the decimal conversion below it, and provide numerator and denominator controls that update live.',
    title: 'Fraction Visual Explorer',
    description: 'Explore fractions with live pie charts and decimal conversion.',
    template: 'generic',
    language: 'en',
  },
  {
    id: 'wave-motion',
    label: 'Wave Motion',
    prompt:
      'Create an interactive wave visualization. Students can adjust amplitude, frequency, and phase, and the graph should animate so they can see how each parameter changes the wave.',
    title: 'Wave Motion Lab',
    description: 'Adjust wave parameters and observe the animated graph.',
    template: 'generic',
    language: 'en',
  },
  {
    id: 'projectile',
    label: 'Projectile',
    prompt:
      'Create an interactive projectile motion visualization. Let students change launch angle and speed, then show the trajectory, range, height, and a short observation that updates live.',
    title: 'Projectile Motion',
    description: 'Change launch conditions and inspect the trajectory.',
    template: 'generic',
    language: 'en',
  },
];

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

async function parseDebugResponse(response: Response): Promise<ParsedDebugResponse> {
  const rawText = await response.text();
  try {
    return { rawText, parsedJson: rawText ? JSON.parse(rawText) : null };
  } catch (error) {
    return {
      rawText,
      parsedJson: null,
      parseError: error instanceof Error ? error.message : 'JSON parse failed',
    };
  }
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
    status: status as DebugJobStatus,
    lastError: typeof record.lastError === 'string' ? record.lastError : undefined,
    errorHistory: Array.isArray(record.errorHistory) ? (record.errorHistory as Array<Record<string, unknown>>) : [],
    attemptCount: typeof record.attemptCount === 'number' ? record.attemptCount : 0,
    nextAttemptAt: typeof record.nextAttemptAt === 'string' ? record.nextAttemptAt : undefined,
    resultArtifact: record.resultArtifact,
  };
}

function finalStatus(run: PromptRunState) {
  if (run.phase === 'idle') {
    return 'Not run';
  }
  if (run.httpStatus && run.httpStatus >= 500) {
    return `HTTP ${run.httpStatus}`;
  }
  if (run.httpStatus && run.httpStatus >= 400) {
    return `HTTP ${run.httpStatus}`;
  }
  if (run.phase === 'succeeded' && run.clientValidation === 'passed') {
    return 'Succeeded';
  }
  if (run.phase === 'succeeded' && run.clientValidation && run.clientValidation !== 'passed') {
    return 'Client validation failed';
  }
  if (run.job?.status === 'failed') {
    return 'Job failed';
  }
  if (run.phase === 'creating') {
    return 'Creating';
  }
  if (run.phase === 'running') {
    return `Running${run.job ? ` #${run.job.attemptCount}` : ''}`;
  }
  return run.error ? 'Failed' : 'Unknown';
}

function statusClassName(run: PromptRunState) {
  const status = finalStatus(run);
  if (status === 'Succeeded') {
    return 'border-[#9fc49f] bg-[#eef8ee] text-[#2f5f38]';
  }
  if (status === 'Not run' || status.startsWith('Running') || status === 'Creating') {
    return 'border-[#d8cec2] bg-[#f8f5f0] text-[#6f665e]';
  }
  return 'border-[#e3a9a1] bg-[#fff0ee] text-[#9b2f25]';
}

function nextPollDelay(job: DebugJob) {
  if (!job.nextAttemptAt) {
    return 1500;
  }
  const waitForNextAttempt = Date.parse(job.nextAttemptAt) - Date.now();
  if (!Number.isFinite(waitForNextAttempt) || waitForNextAttempt <= 0) {
    return 1500;
  }
  return Math.min(Math.max(waitForNextAttempt, 1500), 5000);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorSummary(job?: DebugJob, fallback?: string) {
  if (fallback) {
    return fallback;
  }
  if (job?.lastError) {
    return job.lastError;
  }
  const latest = job?.errorHistory.at(-1);
  const message = latest?.message;
  return typeof message === 'string' ? message : undefined;
}

export function InteractiveVisualDebugPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [runs, setRuns] = useState<PromptRunState[]>(
    DEFAULT_PROMPTS.map((prompt) => ({ ...prompt, phase: 'idle' })),
  );
  const [isRunningAll, setIsRunningAll] = useState(false);

  const endpoint = useMemo(() => buildFunctionUrl(), []);

  function updateRun(id: string, patch: Partial<PromptRunState> | ((run: PromptRunState) => Partial<PromptRunState>)) {
    setRuns((current) =>
      current.map((run) => {
        if (run.id !== id) {
          return run;
        }
        const resolvedPatch = typeof patch === 'function' ? patch(run) : patch;
        return { ...run, ...resolvedPatch };
      }),
    );
  }

  function updatePrompt(id: string, patch: Partial<PromptRunInput>) {
    updateRun(id, patch);
  }

  async function callFunction(body: Record<string, unknown>, accessToken: string) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: viewerSupabaseAnonKey,
        Authorization: accessToken ? `Bearer ${accessToken}` : `Bearer ${viewerSupabaseAnonKey}`,
      },
      body: JSON.stringify(body),
    });
    return { response, parsed: await parseDebugResponse(response) };
  }

  async function runPrompt(input: PromptRunState, accessToken: string) {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const requestBody = {
      action: 'create',
      prompt: input.prompt.trim(),
      template: input.template.trim() || 'generic',
      title: input.title.trim() || undefined,
      description: input.description.trim() || undefined,
      language: resolveLanguage(input.prompt, input.language),
      surface: 'builder',
    };

    updateRun(input.id, {
      phase: 'creating',
      startedAt,
      endedAt: undefined,
      durationMs: undefined,
      httpStatus: undefined,
      httpStatusText: undefined,
      job: undefined,
      artifact: undefined,
      clientValidation: undefined,
      error: undefined,
    });

    try {
      const { response, parsed } = await callFunction(requestBody, accessToken);
      let job = normalizeDebugJob((parsed.parsedJson as { job?: unknown } | null)?.job);
      let httpStatus = response.status;
      let httpStatusText = response.statusText;

      updateRun(input.id, {
        phase: job?.status === 'queued' || job?.status === 'running' ? 'running' : response.ok ? 'running' : 'failed',
        httpStatus,
        httpStatusText,
        job,
        durationMs: Math.round(performance.now() - started),
        error: parsed.parseError,
      });

      const pollStarted = Date.now();
      while (job && job.status !== 'succeeded' && job.status !== 'failed' && Date.now() - pollStarted < 180_000) {
        await wait(nextPollDelay(job));
        const statusResult = await callFunction({ action: 'status', jobId: job.id }, accessToken);
        httpStatus = statusResult.response.status;
        httpStatusText = statusResult.response.statusText;
        job = normalizeDebugJob((statusResult.parsed.parsedJson as { job?: unknown } | null)?.job) ?? job;

        updateRun(input.id, {
          phase: job.status === 'failed' ? 'failed' : 'running',
          httpStatus,
          httpStatusText,
          job,
          durationMs: Math.round(performance.now() - started),
          error: statusResult.parsed.parseError,
        });
      }

      let artifact: InteractiveVisualArtifact | undefined;
      let clientValidation: string | undefined;
      let normalizationError: string | undefined;
      if (job?.resultArtifact) {
        try {
          const normalized = normalizeInteractiveVisualArtifact(job.resultArtifact, {
            prompt: input.prompt.trim(),
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

      updateRun(input.id, {
        phase: job?.status === 'succeeded' && !normalizationError ? 'succeeded' : 'failed',
        endedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - started),
        httpStatus,
        httpStatusText,
        job,
        artifact,
        clientValidation: clientValidation ?? (job?.resultArtifact ? 'normalization failed' : 'no generatedHtml'),
        error: normalizationError ?? errorSummary(job),
      });
    } catch (error) {
      updateRun(input.id, {
        phase: 'failed',
        endedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - started),
        error: error instanceof Error ? error.message : 'Request failed',
      });
    }
  }

  async function runAllPrompts() {
    setIsRunningAll(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setRuns((current) =>
          current.map((run) => ({
            ...run,
            phase: 'failed',
            error: error.message,
            endedAt: new Date().toISOString(),
          })),
        );
        return;
      }
      const accessToken = data.session?.access_token ?? '';
      await Promise.all(runs.map((run) => runPrompt(run, accessToken)));
    } finally {
      setIsRunningAll(false);
    }
  }

  const completedCount = runs.filter((run) => ['succeeded', 'failed'].includes(run.phase)).length;
  const successCount = runs.filter((run) => finalStatus(run) === 'Succeeded').length;

  return (
    <div className="min-h-full bg-[#f6f3ef] px-4 py-5 text-[#2f2a25] md:px-8">
      <div className="mx-auto max-w-[1440px] space-y-5">
        <header className="flex flex-col gap-3 border-b border-[#ded5ca] pb-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6f65]">Interactive Visual Debug</p>
            <h1 className="mt-1 text-2xl font-bold">Batch Prompt Test Console</h1>
            <p className="mt-1 max-w-3xl text-sm text-[#6f665e]">
              Test five prompts in parallel. Each result keeps only the final status, duration, job summary, and iframe output.
            </p>
          </div>
          <div className="flex flex-col gap-2 lg:min-w-[460px]">
            <div className="rounded-md border border-[#d8cec2] bg-white px-3 py-2 text-xs text-[#5f554b]">
              <div>Endpoint</div>
              <code className="break-all text-[#3b6f9f]">{endpoint}</code>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[#5f554b]">
                {successCount}/{runs.length} succeeded · {completedCount}/{runs.length} completed
              </span>
              <button
                type="button"
                onClick={() => void runAllPrompts()}
                disabled={isRunningAll || runs.some((run) => run.prompt.trim().length < 8)}
                className="rounded-md bg-[#466d4f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#385b40] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRunningAll ? 'Testing all...' : 'Run 5 Prompts'}
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-lg border border-[#d8cec2] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#6f665e]">Auth</h2>
          <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
            <StatusDatum label="user.id" value={user?.id ?? '[none]'} />
            <StatusDatum label="user.email" value={user?.email ?? '[none]'} />
            <StatusDatum label="apikey" value={viewerSupabaseAnonKey ? '[present]' : '[missing]'} />
          </div>
        </section>

        <section className="grid gap-4">
          {runs.map((run, index) => (
            <article key={run.id} className="rounded-xl border border-[#d8cec2] bg-white p-4 shadow-sm">
              <div className="grid gap-4 xl:grid-cols-[minmax(360px,0.76fr)_minmax(0,1.24fr)]">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7a6f65]">Prompt {index + 1}</p>
                      <input
                        value={run.label}
                        onChange={(event) => updatePrompt(run.id, { label: event.target.value })}
                        className="mt-1 w-full rounded-md border border-transparent bg-transparent text-lg font-bold outline-none focus:border-[#d7cec3] focus:bg-[#fffdf9]"
                      />
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClassName(run)}`}>
                      {finalStatus(run)}
                    </span>
                  </div>

                  <textarea
                    value={run.prompt}
                    onChange={(event) => updatePrompt(run.id, { prompt: event.target.value })}
                    rows={6}
                    className="min-h-36 w-full rounded-md border border-[#d7cec3] bg-[#fffdf9] px-3 py-2 text-sm leading-6 outline-none focus:border-[#7c9d72]"
                  />

                  <div className="grid gap-2 md:grid-cols-2">
                    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-[#6f665e]">
                      Title
                      <input
                        value={run.title}
                        onChange={(event) => updatePrompt(run.id, { title: event.target.value })}
                        className="rounded-md border border-[#d7cec3] bg-[#fffdf9] px-3 py-2 text-sm font-normal normal-case tracking-normal"
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-[#6f665e]">
                      Description
                      <input
                        value={run.description}
                        onChange={(event) => updatePrompt(run.id, { description: event.target.value })}
                        className="rounded-md border border-[#d7cec3] bg-[#fffdf9] px-3 py-2 text-sm font-normal normal-case tracking-normal"
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-[#6f665e]">
                      Template
                      <input
                        value={run.template}
                        onChange={(event) => updatePrompt(run.id, { template: event.target.value })}
                        className="rounded-md border border-[#d7cec3] bg-[#fffdf9] px-3 py-2 text-sm font-normal normal-case tracking-normal"
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-[#6f665e]">
                      Language
                      <select
                        value={run.language}
                        onChange={(event) => updatePrompt(run.id, { language: event.target.value as DebugLanguage })}
                        className="rounded-md border border-[#d7cec3] bg-[#fffdf9] px-3 py-2 text-sm font-normal normal-case tracking-normal"
                      >
                        <option value="auto">auto ({resolveLanguage(run.prompt, run.language)})</option>
                        <option value="zh-CN">zh-CN</option>
                        <option value="en">en</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-2 text-sm md:grid-cols-2">
                    <StatusDatum label="HTTP" value={run.httpStatus ? `${run.httpStatus} ${run.httpStatusText ?? ''}`.trim() : '[not sent]'} />
                    <StatusDatum label="Duration" value={run.durationMs == null ? '[not sent]' : `${run.durationMs}ms`} />
                    <StatusDatum label="Job" value={run.job ? `${run.job.status} · ${run.job.id}` : '[none]'} />
                    <StatusDatum label="Attempts" value={run.job ? String(run.job.attemptCount) : '[none]'} />
                    <StatusDatum label="Client validation" value={run.clientValidation ?? '[not run]'} />
                    <StatusDatum label="Error" value={errorSummary(run.job, run.error) ?? '[none]'} />
                  </div>
                </div>

                <div className="min-w-0">
                  {run.artifact ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[#6f665e]">Output</h3>
                        <span className="text-xs font-semibold text-[#6f665e]">
                          {run.artifact.title} · {run.artifact.generatedHtml.length.toLocaleString()} chars
                        </span>
                      </div>
                      <InteractiveVisualEmbed
                        title={run.artifact.title}
                        description={run.artifact.description}
                        generatedHtml={run.artifact.generatedHtml}
                        frameClassName="h-[520px]"
                      />
                    </div>
                  ) : (
                    <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-dashed border-[#d8cec2] bg-[#faf7f1] px-4 text-center text-sm font-semibold text-[#7a6f65]">
                      {run.phase === 'idle' ? 'Run this batch to see the generated visualization here.' : 'Waiting for generated output...'}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

function StatusDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-[#f8f5f0] px-3 py-2">
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#7a6f65]">{label}</div>
      <div className="mt-1 break-words font-mono text-xs text-[#2f2a25]">{value}</div>
    </div>
  );
}
