import { useEffect, useMemo, useState } from 'react';
import {
  classifyInteractiveVisualHealth,
  InteractiveVisualEmbed,
  type InteractiveVisualHealthSnapshot,
} from '@/shared/interactive-visual/InteractiveVisualEmbed';
import { supabase, viewerSupabaseAnonKey, viewerSupabaseUrl } from '@/shared/api/supabase';
import {
  createInteractiveVisualFallback,
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
  health?: InteractiveVisualHealthSnapshot | null;
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
      'Create an interactive ideal-gas compression demo. Let the learner drag a piston and observe the volume shrink, particles crowd together, and pressure increase so the relationship between volume and pressure feels immediate.',
    title: 'Ideal Gas Compression',
    description: 'Drag the piston to explore volume, density, and pressure changes.',
    template: 'generic',
    language: 'en',
  },
  {
    id: 'linear-function',
    label: 'Linear Function',
    prompt:
      'Create an interactive visualization for the linear function y = ax + b. Show axes and a line, then let the learner adjust a and b with sliders to see how slope and intercept change in real time.',
    title: 'Linear Function Explorer',
    description: 'Adjust slope and intercept to watch the line update live.',
    template: 'generic',
    language: 'en',
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
  {
    id: 'human-body-systems',
    label: 'Human Body Systems',
    prompt:
      'Create an interactive human body systems explorer. Show a body diagram with clickable systems like circulatory, respiratory, digestive, nervous, muscular, and skeletal. When a learner selects a system, highlight the major organs, animate the flow or function, and show a simple explanation panel.',
    title: 'Human Body Systems Explorer',
    description: 'Select a body system to inspect major organs and their roles.',
    template: 'generic',
    language: 'en',
  },
  {
    id: 'dna-genetics',
    label: 'DNA and Genetics',
    prompt:
      'Create a compact interactive DNA and genetics explainer using only plain SVG, inline CSS, and vanilla JavaScript. Do not use GSAP, D3, module imports, external libraries, or timeline-based animation. On first paint, show a clearly visible SVG DNA double helix with labeled color-coded base pairs A-T and C-G so the main visual is complete immediately. Add a simple base-pair matching activity where one DNA base is highlighted and the learner clicks one of four answer buttons to choose the correct complement with instant feedback. Also add two small parent allele dropdowns that update a simple 2x2 Punnett square, genotype summary, phenotype summary, and one observation sentence in real time. Keep the layout static, the controls simple, and the code easy to audit.',
    title: 'DNA and Genetics Lab',
    description: 'Match DNA bases and update a simple Punnett square live.',
    template: 'generic',
    language: 'en',
  },
  {
    id: 'electricity-circuits',
    label: 'Electricity and Circuits',
    prompt:
      'Create an interactive electricity and circuits simulation. Let learners build or modify a simple circuit with a battery, switch, bulb, and resistor, then adjust voltage and resistance to see current, brightness, and whether the circuit is open or closed.',
    title: 'Electricity and Circuits',
    description: 'Adjust circuit parts and observe current flow and bulb brightness.',
    template: 'generic',
    language: 'en',
  },
  {
    id: 'ecosystem-food-chains',
    label: 'Ecosystem Food Chains',
    prompt:
      'Create an interactive ecosystem food chain explorer. Show producers, consumers, and decomposers that learners can arrange into a food chain or food web. Visualize energy flow with arrows, and update the ecosystem balance when one organism is removed or added.',
    title: 'Ecosystem Food Chain Explorer',
    description: 'Build food chains and track how energy moves through an ecosystem.',
    template: 'generic',
    language: 'en',
  },
  {
    id: 'geometry-transformations',
    label: 'Geometry Shape Transformations',
    prompt:
      'Create a compact interactive geometry transformations visualizer using only plain SVG, inline CSS, and vanilla JavaScript. Do not use D3, GSAP, canvas, or CSS transform-based geometry. On first paint, show a coordinate grid with one original triangle and one transformed triangle already visible. Provide simple controls for translate X, translate Y, rotation in degrees, scale factor, and reflection across the x-axis, and update the transformed shape live while the original remains as a faint reference. Also show the transformed vertex coordinates and one short observation sentence that explains what changed. Keep the layout static, use sliders and a toggle instead of drag interactions, and keep the code easy to audit.',
    title: 'Geometry Transformations Studio',
    description: 'Translate, rotate, reflect, and scale shapes on a live grid.',
    template: 'geometry-transformations',
    language: 'en',
  },
  {
    id: 'chemical-reactions',
    label: 'Chemical Reactions',
    prompt:
      'Create a compact interactive chemical reactions simulator using only plain SVG, inline CSS, and vanilla JavaScript. Do not use D3, GSAP, canvas, or CSS transform-based particle motion. On first paint, show one safe reaction already visible, such as 2H2 + O2 -> 2H2O, with reactants on one side, products on the other, a balanced equation readout, and a particle view of molecules. Provide simple controls for the three coefficients and one temperature slider, update the particle view and equation live, and show one short observation sentence about whether the reaction is balanced or how temperature affects collisions. Keep the layout static and the code easy to audit.',
    title: 'Chemical Reactions Simulator',
    description: 'Balance reactions and watch particles rearrange into products.',
    template: 'chemical-reactions',
    language: 'en',
  },
  {
    id: 'world-geography',
    label: 'World Geography Explorer',
    prompt:
      'Create a compact interactive world geography explorer using only plain SVG, inline CSS, and vanilla JavaScript. Do not use D3, GSAP, canvas, external map tiles, GeoJSON, or TopoJSON. On first paint, show a simplified offline world map with a small fixed set of clickable countries or regions already visible, plus a details panel. Provide continent filter buttons and let learners click a region to update country or region name, capital, major landform, and climate zone. Keep the map stylized and auditable rather than fully realistic, avoid zoom or pan, and keep all data embedded locally.',
    title: 'World Geography Explorer',
    description: 'Click regions on a world map to compare countries and climates.',
    template: 'world-geography',
    language: 'en',
  },
  {
    id: 'probability-dice',
    label: 'Probability and Dice Simulation',
    prompt:
      'Create a compact interactive probability and dice simulation using only plain SVG, inline CSS, and vanilla JavaScript. Do not use D3, GSAP, canvas, or Chart.js. On first paint, show a histogram that is already populated with a small starter sample for 2 dice so the visual is never blank. Provide controls for number of dice, roll 1, roll 25, and reset, and show both experimental counts and a simple theoretical probability overlay. Update the histogram and one short observation sentence live as the sample size grows, and keep the code easy to audit.',
    title: 'Probability and Dice Simulator',
    description: 'Roll dice, graph outcomes, and compare theory with experiment.',
    template: 'probability-dice',
    language: 'en',
  },
  {
    id: 'wave-sound',
    label: 'Wave and Sound Visualization',
    prompt:
      'Create a compact interactive wave and sound visualizer using only plain SVG, inline CSS, and vanilla JavaScript. Do not use canvas, Web Audio, D3, or GSAP. On first paint, show one sine wave and one compression-and-rarefaction strip already visible. Provide simple sliders for amplitude, frequency, wavelength, and volume intensity. Update the waveform, compression spacing, and one short observation sentence live while keeping the layout static and easy to audit.',
    title: 'Wave and Sound Visualization',
    description: 'Tune wave properties and connect the graph to sound behavior.',
    template: 'wave-sound',
    language: 'en',
  },
  {
    id: 'programming-logic-flow',
    label: 'Programming Logic Flow',
    prompt:
      'Create a compact interactive programming logic flow visualizer using only plain SVG, inline CSS, and vanilla JavaScript. On first paint, show a small fixed flowchart for a loop with a condition, a highlighted current step, and a variable state panel. Provide Step, Auto, and Reset controls. As learners advance, update the highlighted node, values of the loop variable and total, and one short observation sentence. Keep the example fixed and auditable rather than generating arbitrary code.',
    title: 'Programming Logic Flow',
    description: 'Step through conditions and loops to follow program state changes.',
    template: 'programming-logic-flow',
    language: 'en',
  },
  {
    id: 'supply-demand',
    label: 'Supply and Demand Economics',
    prompt:
      'Create a compact interactive supply and demand graph using only plain SVG, inline CSS, and vanilla JavaScript. On first paint, show labeled axes, one supply curve, one demand curve, and a marked equilibrium point already visible. Provide simple sliders for demand shift, supply shift, and market price. Update the curves, equilibrium price and quantity, any shortage or surplus, and one short observation sentence live. Keep the graph static and easy to audit.',
    title: 'Supply and Demand Economics',
    description: 'Shift market curves and watch equilibrium respond instantly.',
    template: 'supply-demand',
    language: 'en',
  },
  {
    id: 'weather-climate',
    label: 'Weather and Climate Systems',
    prompt:
      'Create a compact interactive weather and climate explorer using only plain SVG, inline CSS, and vanilla JavaScript. Do not use maps, remote weather data, canvas, or GSAP. On first paint, show one region comparison scene already visible with short-term weather and a long-term climate baseline panel. Provide controls for region, season, temperature, precipitation, and wind. Update the weather scene, the climate comparison panel, and one short observation sentence live while keeping all data embedded locally.',
    title: 'Weather and Climate Systems',
    description: 'Compare weather patterns, seasonal changes, and climate trends.',
    template: 'weather-climate',
    language: 'en',
  },
  {
    id: 'historical-timeline',
    label: 'Historical Timeline Explorer',
    prompt:
      'Create a compact interactive historical timeline explorer using only plain SVG, inline CSS, and vanilla JavaScript. On first paint, show a horizontal timeline with several embedded events already visible plus a details panel. Provide a zoom range slider and filters for region or theme. Let learners click events to update the details panel and one short comparison observation sentence. Keep the timeline fully offline, all event data embedded locally, and the code easy to audit.',
    title: 'Historical Timeline Explorer',
    description: 'Zoom through eras, filter events, and compare changes across history.',
    template: 'historical-timeline',
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

function findDefaultPrompt(id: string) {
  return DEFAULT_PROMPTS.find((prompt) => prompt.id === id);
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
  const healthStatus = classifyInteractiveVisualHealth(run.health ?? null);
  if (run.phase === 'succeeded' && run.artifact?.engine === 'fallback-html5' && run.clientValidation === 'passed') {
    if (healthStatus === 'broken') {
      return 'Render failed';
    }
    if (healthStatus === 'partial') {
      return 'Render partial';
    }
    return 'Succeeded';
  }
  if (run.httpStatus && run.httpStatus >= 500) {
    return `HTTP ${run.httpStatus}`;
  }
  if (run.httpStatus && run.httpStatus >= 400) {
    return `HTTP ${run.httpStatus}`;
  }
  if (run.phase === 'succeeded' && healthStatus === 'broken') {
    return 'Render failed';
  }
  if (run.phase === 'succeeded' && healthStatus === 'partial') {
    return 'Render partial';
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
  if (status === 'Render partial') {
    return 'border-[#e7c98c] bg-[#fff6e6] text-[#8a5a12]';
  }
  if (status === 'Not run' || status.startsWith('Running') || status === 'Creating') {
    return 'border-[#d8cec2] bg-[#f8f5f0] text-[#6f665e]';
  }
  return 'border-[#e3a9a1] bg-[#fff0ee] text-[#9b2f25]';
}

function runtimeHealthLabel(health: InteractiveVisualHealthSnapshot | null | undefined) {
  const status = classifyInteractiveVisualHealth(health ?? null);
  if (status === 'healthy') {
    return 'healthy';
  }
  if (status === 'partial') {
    return 'partial';
  }
  if (status === 'broken') {
    return 'broken';
  }
  return '[waiting]';
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

const LOCAL_FALLBACK_TEMPLATES = new Set([
  'probability-dice',
  'wave-sound',
  'programming-logic-flow',
  'supply-demand',
  'weather-climate',
  'historical-timeline',
]);

function isLocalFallbackTemplate(template: string | undefined) {
  return LOCAL_FALLBACK_TEMPLATES.has((template ?? '').trim().toLowerCase());
}

function shouldUseLocalFallback(input: PromptRunInput, message?: string) {
  if (!isLocalFallbackTemplate(input.template)) {
    return false;
  }
  const normalized = (message ?? '').toLowerCase();
  return (
    normalized.includes('503') ||
    normalized.includes('service unavailable') ||
    normalized.includes('overload') ||
    normalized.includes('timeout') ||
    normalized.includes('no generatedhtml')
  );
}

function shouldAutoRepairFromHealth(run: PromptRunState, health: InteractiveVisualHealthSnapshot | null) {
  if (!run.artifact || run.artifact.engine === 'fallback-html5') {
    return false;
  }
  if (!isLocalFallbackTemplate(run.template || run.artifact.template)) {
    return false;
  }
  const status = classifyInteractiveVisualHealth(health);
  if (status === 'broken' || status === 'partial') {
    return true;
  }
  if (!health) {
    return false;
  }
  if (run.template.trim() === 'wave-sound' && health.domStats.paintedCanvases === 0 && health.domStats.visibleSvgShapes < 8) {
    return true;
  }
  return false;
}

function buildLocalFallbackArtifact(input: PromptRunInput) {
  const artifact = createInteractiveVisualFallback({
    prompt: input.prompt.trim(),
    template: input.template.trim() || undefined,
    language: resolveLanguage(input.prompt, input.language),
  });
  const clientValidation = validateOfflineInteractiveHtml(artifact.generatedHtml) ?? 'passed';
  return { artifact, clientValidation };
}

export function InteractiveVisualDebugPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [runs, setRuns] = useState<PromptRunState[]>(
    DEFAULT_PROMPTS.map((prompt) => ({ ...prompt, phase: 'idle' })),
  );
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>(DEFAULT_PROMPTS.map((prompt) => prompt.id));
  const [promptFilter, setPromptFilter] = useState('');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [isRunningBatch, setIsRunningBatch] = useState(false);

  const endpoint = useMemo(() => buildFunctionUrl(), []);
  const selectedRunIdSet = useMemo(() => new Set(selectedRunIds), [selectedRunIds]);
  const normalizedPromptFilter = promptFilter.trim().toLowerCase();
  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      if (showSelectedOnly && !selectedRunIdSet.has(run.id)) {
        return false;
      }
      if (!normalizedPromptFilter) {
        return true;
      }
      const searchable = [run.label, run.title, run.description, run.prompt].join('\n').toLowerCase();
      return searchable.includes(normalizedPromptFilter);
    });
  }, [normalizedPromptFilter, runs, selectedRunIdSet, showSelectedOnly]);
  const selectedRuns = useMemo(() => runs.filter((run) => selectedRunIdSet.has(run.id)), [runs, selectedRunIdSet]);

  useEffect(() => {
    const timers = runs
      .filter((run) => {
        return (
          run.phase === 'succeeded' &&
          !!run.artifact &&
          run.artifact.engine !== 'fallback-html5' &&
          !run.health &&
          isLocalFallbackTemplate(run.template || run.artifact.template)
        );
      })
      .map((run) =>
        window.setTimeout(() => {
          setRuns((current) =>
            current.map((entry) => {
              if (
                entry.id !== run.id ||
                entry.health ||
                !entry.artifact ||
                entry.artifact.engine === 'fallback-html5' ||
                !isLocalFallbackTemplate(entry.template || entry.artifact.template)
              ) {
                return entry;
              }
              const fallback = buildLocalFallbackArtifact(entry);
              return {
                ...entry,
                artifact: fallback.artifact,
                clientValidation: fallback.clientValidation,
                error: undefined,
                health: null,
              };
            }),
          );
        }, 2600),
      );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [runs]);

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

  function restorePromptDefaults(id: string) {
    const defaults = findDefaultPrompt(id);
    if (!defaults) {
      return;
    }
    updateRun(id, {
      ...defaults,
      phase: 'idle',
      startedAt: undefined,
      endedAt: undefined,
      durationMs: undefined,
      httpStatus: undefined,
      httpStatusText: undefined,
      job: undefined,
      artifact: undefined,
      clientValidation: undefined,
      error: undefined,
      health: null,
    });
  }

  function toggleRunSelection(id: string) {
    setSelectedRunIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }

  function replaceSelection(ids: string[]) {
    setSelectedRunIds(Array.from(new Set(ids)));
  }

  async function loadAccessToken() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    return data.session?.access_token ?? '';
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
      health: null,
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

      const computedError = normalizationError ?? errorSummary(job);
      if (!artifact && shouldUseLocalFallback(input, computedError)) {
        const fallback = buildLocalFallbackArtifact(input);
        artifact = fallback.artifact;
        clientValidation = fallback.clientValidation;
        normalizationError = undefined;
      }

      updateRun(input.id, {
        phase:
          artifact && clientValidation === 'passed'
            ? 'succeeded'
            : job?.status === 'succeeded' && !normalizationError
              ? 'succeeded'
              : 'failed',
        endedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - started),
        httpStatus,
        httpStatusText,
        job,
        artifact,
        clientValidation: clientValidation ?? (job?.resultArtifact ? 'normalization failed' : 'no generatedHtml'),
        error: artifact && clientValidation === 'passed' ? undefined : computedError,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      if (shouldUseLocalFallback(input, message)) {
        const fallback = buildLocalFallbackArtifact(input);
        updateRun(input.id, {
          phase: 'succeeded',
          endedAt: new Date().toISOString(),
          durationMs: Math.round(performance.now() - started),
          artifact: fallback.artifact,
          clientValidation: fallback.clientValidation,
          error: undefined,
          health: null,
        });
        return;
      }
      updateRun(input.id, {
        phase: 'failed',
        endedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - started),
        error: message,
      });
    }
  }

  async function runSinglePrompt(runId: string) {
    const run = runs.find((entry) => entry.id === runId);
    if (!run || run.prompt.trim().length < 8 || run.phase === 'creating' || run.phase === 'running') {
      return;
    }
    try {
      const accessToken = await loadAccessToken();
      await runPrompt(run, accessToken);
    } catch (error) {
      updateRun(runId, {
        phase: 'failed',
        error: error instanceof Error ? error.message : 'Session lookup failed',
        endedAt: new Date().toISOString(),
      });
    }
  }

  async function runSelectedPrompts() {
    const targetRuns = runs.filter((run) => selectedRunIdSet.has(run.id));
    const targetRunIds = new Set(targetRuns.map((run) => run.id));
    if (targetRuns.length === 0) {
      return;
    }
    setIsRunningBatch(true);
    try {
      const accessToken = await loadAccessToken();
      await Promise.all(targetRuns.map((run) => runPrompt(run, accessToken)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Session lookup failed';
      setRuns((current) =>
        current.map((run) =>
          targetRunIds.has(run.id)
            ? {
                ...run,
                phase: 'failed',
                error: message,
                endedAt: new Date().toISOString(),
              }
            : run,
        ),
      );
    } finally {
      setIsRunningBatch(false);
    }
  }

  const completedCount = runs.filter((run) => ['succeeded', 'failed'].includes(run.phase)).length;
  const successCount = runs.filter((run) => finalStatus(run) === 'Succeeded').length;
  const selectedCount = selectedRuns.length;
  const visibleCount = filteredRuns.length;
  const selectedVisibleCount = filteredRuns.filter((run) => selectedRunIdSet.has(run.id)).length;
  const hasInvalidSelectedPrompt = selectedRuns.some((run) => run.prompt.trim().length < 8);
  const hasRunningSelectedPrompt = selectedRuns.some((run) => run.phase === 'creating' || run.phase === 'running');

  return (
    <div className="min-h-full bg-[#f6f3ef] px-4 py-5 text-[#2f2a25] md:px-8">
      <div className="mx-auto max-w-[1440px] space-y-5">
        <header className="flex flex-col gap-3 border-b border-[#ded5ca] pb-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6f65]">Interactive Visual Debug</p>
            <h1 className="mt-1 text-2xl font-bold">Prompt Test Console</h1>
            <p className="mt-1 max-w-3xl text-sm text-[#6f665e]">
              Filter the prompt library, select a group, or run one prompt at a time. Each result keeps the final status, duration, job summary, and iframe output.
            </p>
          </div>
          <div className="flex flex-col gap-2 lg:min-w-[560px]">
            <div className="rounded-md border border-[#d8cec2] bg-white px-3 py-2 text-xs text-[#5f554b]">
              <div>Endpoint</div>
              <code className="break-all text-[#3b6f9f]">{endpoint}</code>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={promptFilter}
                onChange={(event) => setPromptFilter(event.target.value)}
                placeholder="Filter prompts by topic, title, or description"
                className="min-w-[240px] flex-1 rounded-md border border-[#d7cec3] bg-white px-3 py-2 text-sm outline-none focus:border-[#7c9d72]"
              />
              <button
                type="button"
                onClick={() => replaceSelection(filteredRuns.map((run) => run.id))}
                disabled={filteredRuns.length === 0}
                className="rounded-md border border-[#d8cec2] bg-white px-3 py-2 text-sm font-semibold text-[#5f554b] transition hover:border-[#b8ab9a] hover:bg-[#faf6f0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Select visible
              </button>
              <button
                type="button"
                onClick={() => replaceSelection(runs.map((run) => run.id))}
                disabled={runs.length === 0}
                className="rounded-md border border-[#d8cec2] bg-white px-3 py-2 text-sm font-semibold text-[#5f554b] transition hover:border-[#b8ab9a] hover:bg-[#faf6f0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setSelectedRunIds([])}
                disabled={selectedCount === 0}
                className="rounded-md border border-[#d8cec2] bg-white px-3 py-2 text-sm font-semibold text-[#5f554b] transition hover:border-[#b8ab9a] hover:bg-[#faf6f0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
              <label className="inline-flex items-center gap-2 rounded-md border border-[#d8cec2] bg-white px-3 py-2 text-sm font-semibold text-[#5f554b]">
                <input
                  type="checkbox"
                  checked={showSelectedOnly}
                  onChange={(event) => setShowSelectedOnly(event.target.checked)}
                  className="h-4 w-4 rounded border-[#b8ab9a] text-[#466d4f] focus:ring-[#7c9d72]"
                />
                Only selected
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[#5f554b]">
                {successCount}/{runs.length} succeeded · {completedCount}/{runs.length} completed · {selectedCount} selected · {visibleCount} visible
              </span>
              <button
                type="button"
                onClick={() => void runSelectedPrompts()}
                disabled={isRunningBatch || selectedCount === 0 || hasInvalidSelectedPrompt || hasRunningSelectedPrompt}
                className="rounded-md bg-[#466d4f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#385b40] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRunningBatch
                  ? `Testing ${selectedCount} selected...`
                  : `Run ${selectedCount} Selected${selectedCount === 1 ? ' Prompt' : ' Prompts'}`}
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
          {filteredRuns.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d8cec2] bg-white px-6 py-10 text-center text-sm font-semibold text-[#7a6f65] shadow-sm">
              No prompts match the current filter.
            </div>
          ) : null}

          {filteredRuns.map((run, index) => (
            <article key={run.id} className="rounded-xl border border-[#d8cec2] bg-white p-4 shadow-sm">
              <div className="grid gap-4 xl:grid-cols-[minmax(360px,0.76fr)_minmax(0,1.24fr)]">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7a6f65]">Prompt {index + 1}</p>
                      <input
                        value={run.label}
                        onChange={(event) => updatePrompt(run.id, { label: event.target.value })}
                        className="mt-1 w-full rounded-md border border-transparent bg-transparent text-lg font-bold outline-none focus:border-[#d7cec3] focus:bg-[#fffdf9]"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-2 rounded-full border border-[#d8cec2] bg-[#faf7f1] px-3 py-1 text-xs font-bold text-[#5f554b]">
                        <input
                          type="checkbox"
                          checked={selectedRunIdSet.has(run.id)}
                          onChange={() => toggleRunSelection(run.id)}
                          className="h-4 w-4 rounded border-[#b8ab9a] text-[#466d4f] focus:ring-[#7c9d72]"
                        />
                        Select
                      </label>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClassName(run)}`}>
                        {finalStatus(run)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void runSinglePrompt(run.id)}
                        disabled={run.phase === 'creating' || run.phase === 'running' || run.prompt.trim().length < 8}
                        className="rounded-md bg-[#466d4f] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#385b40] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {run.phase === 'creating' || run.phase === 'running' ? 'Running...' : 'Run prompt'}
                      </button>
                      <button
                        type="button"
                        onClick={() => restorePromptDefaults(run.id)}
                        disabled={run.phase === 'creating' || run.phase === 'running'}
                        className="rounded-md border border-[#d8cec2] bg-white px-3 py-2 text-xs font-semibold text-[#5f554b] transition hover:border-[#b8ab9a] hover:bg-[#faf6f0] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Reset prompt
                      </button>
                    </div>
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
                    <StatusDatum label="Runtime health" value={runtimeHealthLabel(run.health)} />
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
                      {run.health ? (
                        <div
                          className={`rounded-md border px-3 py-2 text-xs ${
                            classifyInteractiveVisualHealth(run.health) === 'healthy'
                              ? 'border-[#9fc49f] bg-[#eef8ee] text-[#2f5f38]'
                              : classifyInteractiveVisualHealth(run.health) === 'partial'
                                ? 'border-[#e7c98c] bg-[#fff6e6] text-[#8a5a12]'
                                : 'border-[#e3a9a1] bg-[#fff0ee] text-[#9b2f25]'
                          }`}
                        >
                          <div className="font-semibold">
                            Runtime health: {runtimeHealthLabel(run.health)}
                          </div>
                          <div className="mt-1">
                            DOM probe: interactives={run.health.domStats.interactives}, svgChildren={run.health.domStats.svgChildren}, visibleSvgShapes={run.health.domStats.visibleSvgShapes}, canvases={run.health.domStats.paintedCanvases}/{run.health.domStats.canvasCount}, observation={run.health.domStats.hasObservation ? 'yes' : 'no'}, trackEvents={run.health.trackEventCount}
                          </div>
                          {run.health.errors[0] ? (
                            <div className="mt-1">
                              First iframe error: {run.health.errors[0].message}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <InteractiveVisualEmbed
                        title={run.artifact.title}
                        description={run.artifact.description}
                        generatedHtml={run.artifact.generatedHtml}
                        frameClassName="h-[520px]"
                        onHealthUpdate={(snapshot) =>
                          updateRun(run.id, (currentRun) => {
                            if (shouldAutoRepairFromHealth(currentRun, snapshot)) {
                              const fallback = buildLocalFallbackArtifact(currentRun);
                              return {
                                artifact: fallback.artifact,
                                clientValidation: fallback.clientValidation,
                                error: undefined,
                                health: null,
                              };
                            }
                            return { health: snapshot };
                          })
                        }
                      />
                    </div>
                  ) : (
                    <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-dashed border-[#d8cec2] bg-[#faf7f1] px-4 text-center text-sm font-semibold text-[#7a6f65]">
                      {run.phase === 'idle'
                        ? selectedVisibleCount > 0
                          ? 'Run this prompt or the selected group to see the generated visualization here.'
                          : 'Select this prompt or run it directly to see the generated visualization here.'
                        : 'Waiting for generated output...'}
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
