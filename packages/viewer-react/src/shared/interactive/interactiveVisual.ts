import {
  inferInteractiveVisualMode,
  type InteractiveVisualMode,
} from '@/shared/interactive/interactiveVisualModes';

export type InteractiveVisualArtifact = {
  version: string;
  engine: string;
  template: string;
  experienceMode: InteractiveVisualMode;
  title: string;
  description?: string;
  aiPrompt?: string;
  generatedHtml: string;
  themeTone?: string;
  runtime?: Record<string, unknown>;
};

type InteractiveVisualGenerationRequest = {
  prompt: string;
  template?: string;
  experienceMode?: InteractiveVisualMode;
  language?: 'en' | 'zh-CN';
};

const DEFAULT_HEIGHT = 430;
const MAX_HEIGHT = 900;
const MIN_HEIGHT = 320;
const EMBED_EVENT_TYPE = 'primoria:interactive-visual-height';
const ANALYTICS_EVENT_TYPE = 'primoria:interactive-visual-analytics';
const HEALTH_EVENT_TYPE = 'primoria:interactive-visual-health';

function trimOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function stripMarkdownFences(value: string) {
  const trimmed = value.trim();
  const fenced = /```(?:html)?\s*([\s\S]*?)```/i.exec(trimmed)?.[1];
  return (fenced ?? trimmed).trim();
}

function humanizePrompt(prompt: string) {
  return prompt
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[a-z]/, (value) => value.toUpperCase());
}

function summarizePrompt(prompt: string, fallback: string) {
  const normalized = humanizePrompt(prompt);
  if (!normalized) {
    return fallback;
  }
  return normalized.length > 72 ? `${normalized.slice(0, 69).trim()}...` : normalized;
}

export function inferInteractiveVisualTemplate(prompt: string, preferredTemplate?: string) {
  const normalizedPrompt = prompt.toLowerCase();
  const normalizedTemplate = preferredTemplate?.trim().toLowerCase();

  if (normalizedTemplate && normalizedTemplate !== 'generic') {
    return normalizedTemplate;
  }

  if (/(wave and sound|sound wave|compression|rarefaction|wavelength|pitch|volume intensity)/i.test(normalizedPrompt)) {
    return 'wave-sound';
  }
  if (/(cos|cosine|sine|sin|wave|curve|trig|frequency|amplitude|phase)/i.test(normalizedPrompt)) {
    return 'wave';
  }
  if (/(pendulum|swing|oscillat)/i.test(normalizedPrompt)) {
    return 'pendulum';
  }
  if (/(projectile|trajectory|parabola|launch angle|launch)/i.test(normalizedPrompt)) {
    return 'projectile';
  }
  if (/(newton|force|collision|momentum|action|reaction)/i.test(normalizedPrompt)) {
    return 'collision';
  }
  if (/(probability|statistics|dice|coin|spinner|distribution|histogram)/i.test(normalizedPrompt)) {
    return 'probability-dice';
  }
  if (/(programming logic|flowchart|pseudocode|variables|conditions|loops|code execution|algorithm)/i.test(normalizedPrompt)) {
    return 'programming-logic-flow';
  }
  if (/(supply and demand|equilibrium|shortage|surplus|market price|economics)/i.test(normalizedPrompt)) {
    return 'supply-demand';
  }
  if (/(weather|climate|precipitation|wind|storm|seasonal|temperature zones)/i.test(normalizedPrompt)) {
    return 'weather-climate';
  }
  if (/(historical timeline|timeline explorer|major events|eras|chronological|history timeline|civilization)/i.test(normalizedPrompt)) {
    return 'historical-timeline';
  }
  return 'generic';
}

export function shouldGenerateInteractiveVisualForPrompt(prompt: string) {
  const normalized = prompt.toLowerCase();
  return /(interactive|animate|animated|visual|visualise|visualize|simulation|simulator|graph|curve|wave|cosine|sine|trig|pendulum|projectile|collision|force|newton|orbit|diagram|probability|flowchart|timeline|history|weather|climate|economics)/i.test(
    normalized,
  );
}

function removeAllowedNamespaceUrls(html: string) {
  return html
    .replace(
      /\sxmlns(?::[A-Za-z][\w.-]*)?\s*=\s*(["'])https?:\/\/www\.w3\.org\/(?:2000\/svg|1999\/xlink)\1/gi,
      '',
    )
    .replace(
      /(["'])https?:\/\/www\.w3\.org\/(?:2000\/svg|1999\/xlink)\1/gi,
      '$1$1',
    );
}

const ALLOWED_CDN_PREFIX = /^https:\/\/(?:esm\.sh\/|cdn\.jsdelivr\.net\/npm\/)/;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectScriptSrcs(html: string): Array<{ src: string; isModule: boolean }> {
  const results: Array<{ src: string; isModule: boolean }> = [];
  const tagRe = /<script\b([^>]*)>/gi;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html))) {
    const attrs = match[1];
    const srcMatch = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
    if (!srcMatch) continue;
    const src = (srcMatch[1] ?? srcMatch[2] ?? '').trim();
    const isModule = /\btype\s*=\s*["']?module["']?/i.test(attrs);
    results.push({ src, isModule });
  }
  return results;
}

function collectImportSpecifiers(html: string): string[] {
  const results: string[] = [];
  const importRe = /\bimport\b[\s\S]*?\bfrom\s*(?:"([^"]+)"|'([^']+)')/g;
  let match: RegExpExecArray | null;
  while ((match = importRe.exec(html))) {
    results.push((match[1] ?? match[2] ?? '').trim());
  }
  const bareImportRe = /\bimport\s+(?:"([^"]+)"|'([^']+)')/g;
  while ((match = bareImportRe.exec(html))) {
    results.push((match[1] ?? match[2] ?? '').trim());
  }
  return results;
}

export function validateOfflineInteractiveHtml(html: string) {
  const normalized = stripMarkdownFences(html);
  if (!normalized) {
    return 'Interactive visual HTML is empty.';
  }

  if (/\bimport\s*\(/i.test(normalized)) {
    return 'Interactive visuals must not use dynamic import().';
  }
  if (/<link[^>]+href\s*=/i.test(normalized)) {
    return 'Interactive visuals must not load external stylesheets.';
  }
  if (/<(iframe|object|embed)\b/i.test(normalized)) {
    return 'Interactive visuals cannot embed external frames or objects.';
  }
  if (/\bfetch\s*\(/i.test(normalized) || /\bXMLHttpRequest\b/i.test(normalized) || /\bWebSocket\b/i.test(normalized)) {
    return 'Interactive visuals must run offline and cannot request network resources.';
  }

  const allowedUrls: string[] = [];
  for (const { src, isModule } of collectScriptSrcs(normalized)) {
    if (!isModule) {
      return 'Interactive visuals must use inline JavaScript only; <script src> must be type="module" on an allowlisted CDN.';
    }
    if (!ALLOWED_CDN_PREFIX.test(src)) {
      return `Interactive visuals can only load module scripts from esm.sh or cdn.jsdelivr.net/npm: got ${src}`;
    }
    allowedUrls.push(src);
  }
  for (const specifier of collectImportSpecifiers(normalized)) {
    if (!ALLOWED_CDN_PREFIX.test(specifier)) {
      return `Interactive visuals can only import modules from esm.sh or cdn.jsdelivr.net/npm: got ${specifier}`;
    }
    allowedUrls.push(specifier);
  }

  let stripped = removeAllowedNamespaceUrls(normalized);
  for (const url of allowedUrls) {
    stripped = stripped.replace(new RegExp(escapeRegExp(url), 'g'), '');
  }
  if (/\bhttps?:\/\//i.test(stripped)) {
    return 'Interactive visuals must run offline and cannot reference external URLs.';
  }

  return null;
}

export function normalizeInteractiveVisualArtifact(
  value: unknown,
  options: { prompt?: string; template?: string; experienceMode?: InteractiveVisualMode } = {},
): InteractiveVisualArtifact | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const generatedHtml = trimOptionalString(record.generatedHtml ?? record.html ?? record.generated_html);
  if (!generatedHtml) {
    return null;
  }

  const offlineError = validateOfflineInteractiveHtml(generatedHtml);
  if (offlineError) {
    throw new Error(offlineError);
  }

  const prompt = trimOptionalString(record.aiPrompt) ?? options.prompt;
  const template = trimOptionalString(record.template) ?? inferInteractiveVisualTemplate(prompt ?? '', options.template);
  const experienceMode = inferInteractiveVisualMode(
    prompt ?? '',
    trimOptionalString(record.experienceMode ?? record.experience_mode) ?? options.experienceMode ?? null,
  );

  return {
    version: trimOptionalString(record.version) ?? '1',
    engine: trimOptionalString(record.engine) ?? 'interactive-html5',
    template,
    experienceMode,
    title:
      trimOptionalString(record.title) ??
      summarizePrompt(prompt ?? '', template === 'generic' ? 'AI Element' : `${template[0]?.toUpperCase() ?? ''}${template.slice(1)} Explorer`),
    description: trimOptionalString(record.description),
    aiPrompt: prompt,
    generatedHtml: stripMarkdownFences(generatedHtml),
    themeTone: trimOptionalString(record.themeTone ?? record.theme_tone),
    runtime: record.runtime && typeof record.runtime === 'object' ? (record.runtime as Record<string, unknown>) : undefined,
  };
}

function escapeAttribute(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function buildInteractiveVisualSrcDoc(html: string, title: string) {
  const fragment = stripMarkdownFences(html);
  const safeTitle = escapeAttribute(title || 'Interactive visual');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      :root {
        color-scheme: light;
      }
      html, body {
        margin: 0;
        padding: 0;
        background: transparent;
        overflow-x: hidden;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      body {
        min-height: 100vh;
      }
      *, *::before, *::after {
        box-sizing: border-box;
      }
    </style>
  </head>
  <body>
    ${fragment}
    <script>
      (function () {
        const EVENT_TYPE = '${EMBED_EVENT_TYPE}';
        const ANALYTICS_TYPE = '${ANALYTICS_EVENT_TYPE}';
        const HEALTH_TYPE = '${HEALTH_EVENT_TYPE}';
        const healthErrors = [];
        let trackCount = 0;
        function track(eventName, payload) {
          trackCount += 1;
          parent.postMessage(
            {
              type: ANALYTICS_TYPE,
              eventName: eventName,
              payload: payload && typeof payload === 'object' ? payload : {}
            },
            '*'
          );
        }

        window.PrimoriaInteractive = {
          track: track,
        };

        window.addEventListener('error', function (event) {
          healthErrors.push({
            message: String(event.message || 'unknown error'),
            source: String(event.filename || ''),
            line: event.lineno || 0,
            col: event.colno || 0
          });
        });
        window.addEventListener('unhandledrejection', function (event) {
          const reason = event.reason && typeof event.reason === 'object'
            ? (event.reason.message || JSON.stringify(event.reason))
            : String(event.reason);
          healthErrors.push({ message: 'unhandledrejection: ' + reason, source: '', line: 0, col: 0 });
        });

        function isPaintVisible(value) {
          return !!value &&
            value !== 'none' &&
            value !== 'transparent' &&
            value !== 'rgba(0, 0, 0, 0)' &&
            value !== 'rgba(0,0,0,0)';
        }

        function countPaintedCanvases() {
          const canvases = document.querySelectorAll('canvas');
          let paintedCanvases = 0;
          canvases.forEach(function (canvas) {
            try {
              const context = canvas.getContext('2d', { willReadFrequently: true });
              if (!context) return;
              const width = Math.max(1, Math.min(canvas.width || 1, 32));
              const height = Math.max(1, Math.min(canvas.height || 1, 32));
              const data = context.getImageData(0, 0, width, height).data;
              let nonWhite = 0;
              for (let index = 0; index < data.length; index += 4) {
                const red = data[index];
                const green = data[index + 1];
                const blue = data[index + 2];
                const alpha = data[index + 3];
                if (alpha > 0 && (red < 248 || green < 248 || blue < 248)) {
                  nonWhite += 1;
                  if (nonWhite > 12) {
                    paintedCanvases += 1;
                    return;
                  }
                }
              }
            } catch (_err) {
              // ignore sampling failures
            }
          });
          return { canvasCount: canvases.length, paintedCanvases: paintedCanvases };
        }

        function countVisibleSvgShapes() {
          let count = 0;
          document.querySelectorAll('svg path,svg line,svg polyline,svg polygon,svg rect,svg circle,svg ellipse,svg text').forEach(function (node) {
            try {
              const style = window.getComputedStyle(node);
              if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || '1') <= 0) {
                return;
              }
              if (
                node.tagName.toLowerCase() === 'text' ||
                isPaintVisible(style.fill) ||
                isPaintVisible(style.stroke)
              ) {
                count += 1;
              }
            } catch (_err) {
              count += 1;
            }
          });
          return count;
        }

        function emitHealth(when) {
          let interactives = 0;
          let svgChildren = 0;
          let hasObservation = false;
          let canvasCount = 0;
          let paintedCanvases = 0;
          let visibleSvgShapes = 0;
          try {
            interactives = document.querySelectorAll('button,input,select,textarea,[role="button"]').length;
            svgChildren = document.querySelectorAll('svg *').length;
            hasObservation = !!document.querySelector('.iv-observation-card,.iv-conclusion');
            const canvasStats = countPaintedCanvases();
            canvasCount = canvasStats.canvasCount;
            paintedCanvases = canvasStats.paintedCanvases;
            visibleSvgShapes = countVisibleSvgShapes();
          } catch (_err) {
            // safe defaults
          }
          parent.postMessage({
            type: HEALTH_TYPE,
            when: when,
            errors: healthErrors.slice(-10),
            trackEventCount: trackCount,
            domStats: {
              interactives: interactives,
              svgChildren: svgChildren,
              hasObservation: hasObservation,
              canvasCount: canvasCount,
              paintedCanvases: paintedCanvases,
              visibleSvgShapes: visibleSvgShapes
            }
          }, '*');
        }
        window.addEventListener('load', function () { setTimeout(function () { emitHealth('initial'); }, 400); });
        setTimeout(function () { emitHealth('post-1500ms'); }, 1500);

        function measure() {
          const height = Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight,
            document.documentElement.offsetHeight,
            document.body.offsetHeight
          );
          parent.postMessage({ type: EVENT_TYPE, height: height }, '*');
        }

        const resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(document.body);
        document.addEventListener('click', function (event) {
          const target = event.target instanceof Element ? event.target.closest('button,[role="button"],[data-primoria-action]') : null;
          if (!target) {
            return;
          }
          track('action_clicked', {
            controlId: target.getAttribute('id') || target.getAttribute('data-primoria-action') || target.textContent?.trim()?.slice(0, 80) || 'action',
            tagName: target.tagName.toLowerCase(),
          });
        });
        document.addEventListener('input', function (event) {
          const target = event.target;
          if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
            return;
          }
          track('control_changed', {
            controlId: target.id || target.name || target.getAttribute('aria-label') || target.tagName.toLowerCase(),
            inputType: target instanceof HTMLInputElement ? target.type || 'text' : target.tagName.toLowerCase(),
            value:
              target instanceof HTMLInputElement && (target.type === 'checkbox' || target.type === 'radio')
                ? Boolean(target.checked)
                : String(target.value).slice(0, 120),
          });
        });
        window.addEventListener('load', measure);
        window.addEventListener('load', function () {
          track('visual_loaded', { title: ${JSON.stringify(title || 'Interactive visual')} });
        });
        window.addEventListener('resize', measure);
        requestAnimationFrame(measure);
        setTimeout(measure, 120);
        setTimeout(measure, 600);
      })();
    </script>
  </body>
</html>`;
}

export function interactiveVisualEmbedDefaults() {
  return {
    defaultHeight: DEFAULT_HEIGHT,
    minHeight: MIN_HEIGHT,
    maxHeight: MAX_HEIGHT,
    resizeEventType: EMBED_EVENT_TYPE,
    analyticsEventType: ANALYTICS_EVENT_TYPE,
    healthEventType: HEALTH_EVENT_TYPE,
  };
}

export type InteractiveVisualHealth = {
  when: string;
  errors: Array<{ message: string; source: string; line: number; col: number }>;
  trackEventCount: number;
  domStats: {
    interactives: number;
    svgChildren: number;
    hasObservation: boolean;
    canvasCount: number;
    paintedCanvases: number;
    visibleSvgShapes: number;
  };
};

export function classifyInteractiveVisualHealth(
  health: InteractiveVisualHealth,
): 'healthy' | 'partial' | 'broken' {
  if (health.errors.length > 0) return 'broken';
  if (health.domStats.visibleSvgShapes === 0 && health.domStats.paintedCanvases === 0) return 'partial';
  return 'healthy';
}

function createWaveExplorerHtml(title: string, prompt: string, language: 'en' | 'zh-CN') {
  const labels =
    language === 'zh-CN'
      ? {
          amplitude: '振幅',
          frequency: '频率',
          phase: '相位',
          shift: '垂直偏移',
          speed: '动画速度',
          play: '播放',
          pause: '暂停',
          reset: '重置',
          xAxis: 'x 轴',
          yAxis: 'y 轴',
          objective: '学习目标',
          note: '拖动滑杆观察波长、波高和相位如何改变曲线。',
        }
      : {
          amplitude: 'Amplitude',
          frequency: 'Frequency',
          phase: 'Phase',
          shift: 'Vertical shift',
          speed: 'Animation speed',
          play: 'Play',
          pause: 'Pause',
          reset: 'Reset',
          xAxis: 'x-axis',
          yAxis: 'y-axis',
          objective: 'Learning goal',
          note: 'Use the sliders to see how wavelength, height, and phase change the curve.',
        };

  return `
    <style>
      .iv-shell {
        border-radius: 28px;
        background: linear-gradient(180deg, rgba(244, 251, 255, 0.96), rgba(229, 244, 255, 0.98));
        border: 1px solid rgba(149, 204, 242, 0.65);
        box-shadow: 0 24px 48px rgba(49, 111, 163, 0.12);
        padding: 22px;
        color: #1f3450;
      }
      .iv-header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
      }
      .iv-title {
        margin: 0;
        font-size: 1.45rem;
        line-height: 1.15;
      }
      .iv-badge {
        white-space: nowrap;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(120, 189, 240, 0.16);
        color: #2b6ea8;
        font-size: 0.78rem;
        font-weight: 700;
      }
      .iv-subtitle {
        margin: 8px 0 0;
        font-size: 0.96rem;
        line-height: 1.6;
        color: #45617f;
      }
      .iv-grid {
        display: grid;
        gap: 18px;
        margin-top: 20px;
      }
      @media (min-width: 960px) {
        .iv-grid {
          grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.9fr);
          align-items: start;
        }
      }
      .iv-stage {
        border-radius: 22px;
        background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(240,248,255,0.98));
        border: 1px solid rgba(177, 216, 243, 0.82);
        padding: 16px;
      }
      canvas {
        width: 100%;
        height: auto;
        display: block;
      }
      .iv-side {
        display: grid;
        gap: 14px;
      }
      .iv-card {
        border-radius: 20px;
        background: rgba(255,255,255,0.92);
        border: 1px solid rgba(177, 216, 243, 0.75);
        padding: 16px;
      }
      .iv-card h3 {
        margin: 0 0 10px;
        font-size: 0.82rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #5784a9;
      }
      .iv-card p {
        margin: 0;
        color: #45617f;
        line-height: 1.65;
        font-size: 0.95rem;
      }
      .iv-controls {
        display: grid;
        gap: 12px;
      }
      .iv-field {
        display: grid;
        gap: 6px;
      }
      .iv-field label {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        font-size: 0.87rem;
        font-weight: 700;
        color: #274866;
      }
      .iv-field output {
        color: #2b6ea8;
      }
      .iv-field input[type="range"] {
        width: 100%;
        accent-color: #3d94da;
      }
      .iv-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 4px;
      }
      .iv-button {
        border: 0;
        border-radius: 14px;
        padding: 10px 14px;
        font-weight: 700;
        cursor: pointer;
        transition: transform 120ms ease, filter 120ms ease;
      }
      .iv-button:hover {
        transform: translateY(-1px);
        filter: brightness(1.03);
      }
      .iv-button--primary {
        background: linear-gradient(135deg, #3aa9ff, #2d7fcc);
        color: white;
      }
      .iv-button--secondary {
        background: rgba(61, 148, 218, 0.12);
        color: #2b6ea8;
      }
      .iv-stats {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 14px;
      }
      .iv-stat {
        border-radius: 16px;
        background: rgba(235, 247, 255, 0.96);
        padding: 12px;
      }
      .iv-stat-label {
        font-size: 0.74rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #5784a9;
      }
      .iv-stat-value {
        display: block;
        margin-top: 6px;
        font-size: 1.2rem;
        font-weight: 800;
        color: #1d4f82;
      }
    </style>
    <section class="iv-shell">
      <div class="iv-header">
        <div>
          <p class="iv-badge">AI Element</p>
          <h2 class="iv-title">${escapeAttribute(title)}</h2>
          <p class="iv-subtitle">${escapeAttribute(prompt)}</p>
        </div>
      </div>

      <div class="iv-grid">
        <div class="iv-stage">
          <canvas id="curveCanvas" width="960" height="440" aria-label="${escapeAttribute(title)}"></canvas>
          <div class="iv-stats">
            <div class="iv-stat">
              <span class="iv-stat-label">${labels.amplitude}</span>
              <span class="iv-stat-value" id="waveAmplitudeLabel">1.50</span>
            </div>
            <div class="iv-stat">
              <span class="iv-stat-label">${labels.frequency}</span>
              <span class="iv-stat-value" id="waveFrequencyLabel">1.00</span>
            </div>
            <div class="iv-stat">
              <span class="iv-stat-label">${labels.phase}</span>
              <span class="iv-stat-value" id="wavePhaseLabel">0.00</span>
            </div>
            <div class="iv-stat">
              <span class="iv-stat-label">${labels.shift}</span>
              <span class="iv-stat-value" id="waveShiftLabel">0.00</span>
            </div>
          </div>
        </div>

        <div class="iv-side">
          <div class="iv-card">
            <h3>${labels.objective}</h3>
            <p>${labels.note}</p>
          </div>

          <div class="iv-card iv-controls">
            <div class="iv-field">
              <label for="amplitude">${labels.amplitude}<output id="amplitudeValue">1.50</output></label>
              <input id="amplitude" type="range" min="0.3" max="3.0" step="0.05" value="1.5" />
            </div>
            <div class="iv-field">
              <label for="frequency">${labels.frequency}<output id="frequencyValue">1.00</output></label>
              <input id="frequency" type="range" min="0.4" max="3.0" step="0.05" value="1.0" />
            </div>
            <div class="iv-field">
              <label for="phase">${labels.phase}<output id="phaseValue">0.00</output></label>
              <input id="phase" type="range" min="-3.14" max="3.14" step="0.01" value="0" />
            </div>
            <div class="iv-field">
              <label for="shift">${labels.shift}<output id="shiftValue">0.00</output></label>
              <input id="shift" type="range" min="-1.8" max="1.8" step="0.05" value="0" />
            </div>
            <div class="iv-field">
              <label for="speed">${labels.speed}<output id="speedValue">1.00</output></label>
              <input id="speed" type="range" min="0" max="2.5" step="0.05" value="1" />
            </div>
            <div class="iv-actions">
              <button id="toggleAnimation" class="iv-button iv-button--primary">${labels.pause}</button>
              <button id="resetView" class="iv-button iv-button--secondary">${labels.reset}</button>
            </div>
          </div>
        </div>
      </div>
    </section>
    <script>
      const canvas = document.getElementById('curveCanvas');
      const context = canvas.getContext('2d');
      const controls = {
        amplitude: document.getElementById('amplitude'),
        frequency: document.getElementById('frequency'),
        phase: document.getElementById('phase'),
        shift: document.getElementById('shift'),
        speed: document.getElementById('speed')
      };
      const outputs = {
        amplitude: document.getElementById('amplitudeValue'),
        frequency: document.getElementById('frequencyValue'),
        phase: document.getElementById('phaseValue'),
        shift: document.getElementById('shiftValue'),
        speed: document.getElementById('speedValue')
      };
      const statOutputs = {
        amplitude: document.getElementById('waveAmplitudeLabel'),
        frequency: document.getElementById('waveFrequencyLabel'),
        phase: document.getElementById('wavePhaseLabel'),
        shift: document.getElementById('waveShiftLabel')
      };
      const toggleButton = document.getElementById('toggleAnimation');
      const resetButton = document.getElementById('resetView');

      let animationOffset = 0;
      let lastTime = performance.now();
      let isAnimating = true;

      function readState() {
        return {
          amplitude: Number(controls.amplitude.value),
          frequency: Number(controls.frequency.value),
          phase: Number(controls.phase.value),
          shift: Number(controls.shift.value),
          speed: Number(controls.speed.value)
        };
      }

      function format(value) {
        return Number(value).toFixed(2);
      }

      function syncOutputs() {
        const state = readState();
        Object.keys(outputs).forEach((key) => {
          outputs[key].textContent = format(state[key]);
        });
        statOutputs.amplitude.textContent = format(state.amplitude);
        statOutputs.frequency.textContent = format(state.frequency);
        statOutputs.phase.textContent = format(state.phase);
        statOutputs.shift.textContent = format(state.shift);
      }

      function draw(timestamp) {
        const state = readState();
        const elapsed = (timestamp - lastTime) / 1000;
        lastTime = timestamp;
        if (isAnimating) {
          animationOffset += elapsed * state.speed;
        }

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#f7fbff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        const padding = { left: 72, right: 36, top: 30, bottom: 54 };
        const plotWidth = canvas.width - padding.left - padding.right;
        const plotHeight = canvas.height - padding.top - padding.bottom;
        const centerY = padding.top + plotHeight / 2 - state.shift * (plotHeight / 6);
        const amplitudePx = state.amplitude * (plotHeight / 5.2);

        context.strokeStyle = 'rgba(79, 133, 181, 0.16)';
        context.lineWidth = 1;
        for (let grid = 0; grid <= 8; grid += 1) {
          const x = padding.left + (plotWidth / 8) * grid;
          context.beginPath();
          context.moveTo(x, padding.top);
          context.lineTo(x, padding.top + plotHeight);
          context.stroke();
        }
        for (let grid = 0; grid <= 6; grid += 1) {
          const y = padding.top + (plotHeight / 6) * grid;
          context.beginPath();
          context.moveTo(padding.left, y);
          context.lineTo(padding.left + plotWidth, y);
          context.stroke();
        }

        context.strokeStyle = '#295d93';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(padding.left, centerY);
        context.lineTo(padding.left + plotWidth, centerY);
        context.stroke();

        context.beginPath();
        context.moveTo(padding.left, padding.top);
        context.lineTo(padding.left, padding.top + plotHeight);
        context.stroke();

        context.fillStyle = '#51779f';
        context.font = '600 16px Inter, sans-serif';
        context.fillText('${labels.xAxis}', canvas.width - 88, centerY - 10);
        context.fillText('${labels.yAxis}', padding.left + 10, padding.top + 20);

        context.beginPath();
        for (let pixel = 0; pixel <= plotWidth; pixel += 1) {
          const t = pixel / plotWidth;
          const radians = t * Math.PI * 2 * 2 * state.frequency + state.phase + animationOffset;
          const y = centerY - Math.cos(radians) * amplitudePx;
          const x = padding.left + pixel;
          if (pixel === 0) {
            context.moveTo(x, y);
          } else {
            context.lineTo(x, y);
          }
        }
        context.strokeStyle = '#35a0f6';
        context.lineWidth = 4;
        context.stroke();

        const highlightX = padding.left + plotWidth * 0.72;
        const highlightRadians =
          ((highlightX - padding.left) / plotWidth) * Math.PI * 4 * state.frequency + state.phase + animationOffset;
        const highlightY = centerY - Math.cos(highlightRadians) * amplitudePx;

        context.fillStyle = '#2684d2';
        context.beginPath();
        context.arc(highlightX, highlightY, 8, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = 'rgba(38, 132, 210, 0.16)';
        context.beginPath();
        context.arc(highlightX, highlightY, 18, 0, Math.PI * 2);
        context.fill();

        requestAnimationFrame(draw);
      }

      Object.values(controls).forEach((input) => {
        input.addEventListener('input', syncOutputs);
      });

      toggleButton.addEventListener('click', () => {
        isAnimating = !isAnimating;
        toggleButton.textContent = isAnimating ? '${labels.pause}' : '${labels.play}';
      });

      resetButton.addEventListener('click', () => {
        controls.amplitude.value = '1.5';
        controls.frequency.value = '1.0';
        controls.phase.value = '0';
        controls.shift.value = '0';
        controls.speed.value = '1';
        animationOffset = 0;
        isAnimating = true;
        toggleButton.textContent = '${labels.pause}';
        syncOutputs();
      });

      syncOutputs();
      requestAnimationFrame((timestamp) => {
        lastTime = timestamp;
        draw(timestamp);
      });
    </script>
  `;
}

function createPendulumHtml(title: string, prompt: string, language: 'en' | 'zh-CN') {
  const labels =
    language === 'zh-CN'
      ? {
          angle: '初始角度',
          length: '摆长',
          gravity: '重力',
          damping: '阻尼',
          play: '播放 / 暂停',
          reset: '重置',
          tip: '尝试增加摆长，观察摆动周期如何变化。',
        }
      : {
          angle: 'Starting angle',
          length: 'String length',
          gravity: 'Gravity',
          damping: 'Damping',
          play: 'Play / pause',
          reset: 'Reset',
          tip: 'Increase the string length and notice how the period changes.',
        };

  return `
    <style>
      .iv-shell{border-radius:28px;background:linear-gradient(180deg,rgba(255,251,246,.96),rgba(248,241,231,.98));border:1px solid rgba(219,198,168,.7);box-shadow:0 24px 48px rgba(111,86,48,.12);padding:22px;color:#4a3824}
      .iv-shell h2{margin:0;font-size:1.45rem}
      .iv-shell p{margin:8px 0 0;color:#6e5840;line-height:1.6}
      .iv-grid{display:grid;gap:18px;margin-top:20px}
      @media(min-width:960px){.iv-grid{grid-template-columns:minmax(0,1.4fr) minmax(280px,.95fr)}}
      .iv-stage,.iv-card{border-radius:22px;background:rgba(255,255,255,.9);border:1px solid rgba(222,205,180,.8);padding:16px}
      canvas{width:100%;display:block}
      .iv-card{display:grid;gap:12px}
      .iv-field{display:grid;gap:6px}
      .iv-field label{display:flex;justify-content:space-between;font-size:.87rem;font-weight:700}
      .iv-field input{width:100%;accent-color:#c89b59}
      .iv-actions{display:flex;flex-wrap:wrap;gap:10px}
      .iv-button{border:0;border-radius:14px;padding:10px 14px;font-weight:700;cursor:pointer}
      .iv-button--primary{background:linear-gradient(135deg,#d8af72,#b88848);color:white}
      .iv-button--secondary{background:rgba(200,155,89,.12);color:#9c6a2b}
      .iv-badge{display:inline-flex;padding:8px 12px;border-radius:999px;background:rgba(216,175,114,.15);color:#9c6a2b;font-size:.78rem;font-weight:700}
    </style>
    <section class="iv-shell">
      <span class="iv-badge">AI Element</span>
      <h2>${escapeAttribute(title)}</h2>
      <p>${escapeAttribute(prompt)}</p>
      <div class="iv-grid">
        <div class="iv-stage"><canvas id="pendulumCanvas" width="900" height="480"></canvas></div>
        <div class="iv-card">
          <p>${labels.tip}</p>
          <div class="iv-field"><label>${labels.angle}<output id="angleValue">25°</output></label><input id="angle" type="range" min="5" max="55" step="1" value="25" /></div>
          <div class="iv-field"><label>${labels.length}<output id="lengthValue">1.40 m</output></label><input id="length" type="range" min="0.8" max="2.4" step="0.05" value="1.4" /></div>
          <div class="iv-field"><label>${labels.gravity}<output id="gravityValue">9.81 m/s²</output></label><input id="gravity" type="range" min="3" max="14" step="0.1" value="9.81" /></div>
          <div class="iv-field"><label>${labels.damping}<output id="dampingValue">0.010</output></label><input id="damping" type="range" min="0" max="0.08" step="0.002" value="0.01" /></div>
          <div class="iv-actions"><button id="togglePendulum" class="iv-button iv-button--primary">${labels.play}</button><button id="resetPendulum" class="iv-button iv-button--secondary">${labels.reset}</button></div>
        </div>
      </div>
    </section>
    <script>
      const canvas = document.getElementById('pendulumCanvas');
      const ctx = canvas.getContext('2d');
      const angleInput = document.getElementById('angle');
      const lengthInput = document.getElementById('length');
      const gravityInput = document.getElementById('gravity');
      const dampingInput = document.getElementById('damping');
      const angleValue = document.getElementById('angleValue');
      const lengthValue = document.getElementById('lengthValue');
      const gravityValue = document.getElementById('gravityValue');
      const dampingValue = document.getElementById('dampingValue');
      const toggleButton = document.getElementById('togglePendulum');
      const resetButton = document.getElementById('resetPendulum');
      let isRunning = true;
      let theta = 25 * Math.PI / 180;
      let omega = 0;
      let lastTime = performance.now();

      function syncLabels() {
        angleValue.textContent = Number(angleInput.value).toFixed(0) + '°';
        lengthValue.textContent = Number(lengthInput.value).toFixed(2) + ' m';
        gravityValue.textContent = Number(gravityInput.value).toFixed(2) + ' m/s²';
        dampingValue.textContent = Number(dampingInput.value).toFixed(3);
      }

      function resetState() {
        theta = Number(angleInput.value) * Math.PI / 180;
        omega = 0;
      }

      function draw(timestamp) {
        const dt = Math.min((timestamp - lastTime) / 1000, 0.032);
        lastTime = timestamp;
        const lengthMeters = Number(lengthInput.value);
        const gravity = Number(gravityInput.value);
        const damping = Number(dampingInput.value);

        if (isRunning) {
          const alpha = -(gravity / lengthMeters) * Math.sin(theta) - damping * omega;
          omega += alpha * dt;
          theta += omega * dt;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff9f1';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const anchorX = canvas.width / 2;
        const anchorY = 72;
        const armLength = 120 + lengthMeters * 120;
        const bobX = anchorX + Math.sin(theta) * armLength;
        const bobY = anchorY + Math.cos(theta) * armLength;

        ctx.strokeStyle = '#b99159';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(anchorX, anchorY);
        ctx.lineTo(bobX, bobY);
        ctx.stroke();

        ctx.fillStyle = '#d4b07b';
        ctx.beginPath();
        ctx.arc(anchorX, anchorY, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#c68b3d';
        ctx.beginPath();
        ctx.arc(bobX, bobY, 28, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(198, 139, 61, 0.22)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(anchorX, anchorY, armLength, Math.PI / 2 - 1.2, Math.PI / 2 + 1.2);
        ctx.stroke();

        requestAnimationFrame(draw);
      }

      [angleInput, lengthInput, gravityInput, dampingInput].forEach((input) => {
        input.addEventListener('input', () => {
          syncLabels();
          if (input === angleInput || input === lengthInput) {
            resetState();
          }
        });
      });

      toggleButton.addEventListener('click', () => {
        isRunning = !isRunning;
      });
      resetButton.addEventListener('click', () => {
        angleInput.value = '25';
        lengthInput.value = '1.4';
        gravityInput.value = '9.81';
        dampingInput.value = '0.01';
        syncLabels();
        resetState();
        isRunning = true;
      });

      syncLabels();
      resetState();
      requestAnimationFrame((timestamp) => {
        lastTime = timestamp;
        draw(timestamp);
      });
    </script>
  `;
}

function createProjectileHtml(title: string, prompt: string, language: 'en' | 'zh-CN') {
  const labels =
    language === 'zh-CN'
      ? {
          angle: '发射角度',
          speed: '初速度',
          gravity: '重力',
          launch: '发射',
          reset: '重置',
          tip: '观察速度和角度如何同时影响高度与落点。',
        }
      : {
          angle: 'Launch angle',
          speed: 'Initial speed',
          gravity: 'Gravity',
          launch: 'Launch',
          reset: 'Reset',
          tip: 'Notice how speed and angle shape both the height and landing point.',
        };

  return `
    <style>
      .iv-shell{border-radius:28px;background:linear-gradient(180deg,rgba(247,252,255,.96),rgba(232,243,250,.98));border:1px solid rgba(173,205,223,.8);box-shadow:0 24px 48px rgba(42,95,126,.12);padding:22px;color:#22415a}
      .iv-shell h2{margin:0;font-size:1.45rem}
      .iv-shell p{margin:8px 0 0;color:#486379;line-height:1.6}
      .iv-grid{display:grid;gap:18px;margin-top:20px}
      @media(min-width:960px){.iv-grid{grid-template-columns:minmax(0,1.42fr) minmax(280px,.96fr)}}
      .iv-stage,.iv-card{border-radius:22px;background:rgba(255,255,255,.92);border:1px solid rgba(177,210,228,.82);padding:16px}
      canvas{width:100%;display:block}
      .iv-card{display:grid;gap:12px}
      .iv-field{display:grid;gap:6px}
      .iv-field label{display:flex;justify-content:space-between;font-size:.87rem;font-weight:700}
      .iv-field input{width:100%;accent-color:#4aa6d7}
      .iv-actions{display:flex;flex-wrap:wrap;gap:10px}
      .iv-button{border:0;border-radius:14px;padding:10px 14px;font-weight:700;cursor:pointer}
      .iv-button--primary{background:linear-gradient(135deg,#52bcf0,#3f84c8);color:white}
      .iv-button--secondary{background:rgba(82,188,240,.12);color:#2e7ab3}
      .iv-badge{display:inline-flex;padding:8px 12px;border-radius:999px;background:rgba(82,188,240,.14);color:#2e7ab3;font-size:.78rem;font-weight:700}
    </style>
    <section class="iv-shell">
      <span class="iv-badge">AI Element</span>
      <h2>${escapeAttribute(title)}</h2>
      <p>${escapeAttribute(prompt)}</p>
      <div class="iv-grid">
        <div class="iv-stage"><canvas id="projectileCanvas" width="920" height="460"></canvas></div>
        <div class="iv-card">
          <p>${labels.tip}</p>
          <div class="iv-field"><label>${labels.angle}<output id="projAngleValue">45°</output></label><input id="projAngle" type="range" min="10" max="80" step="1" value="45" /></div>
          <div class="iv-field"><label>${labels.speed}<output id="projSpeedValue">18.0 m/s</output></label><input id="projSpeed" type="range" min="6" max="28" step="0.5" value="18" /></div>
          <div class="iv-field"><label>${labels.gravity}<output id="projGravityValue">9.81 m/s²</output></label><input id="projGravity" type="range" min="3" max="14" step="0.1" value="9.81" /></div>
          <div class="iv-actions"><button id="launchProjectile" class="iv-button iv-button--primary">${labels.launch}</button><button id="resetProjectile" class="iv-button iv-button--secondary">${labels.reset}</button></div>
        </div>
      </div>
    </section>
    <script>
      const canvas = document.getElementById('projectileCanvas');
      const ctx = canvas.getContext('2d');
      const angleInput = document.getElementById('projAngle');
      const speedInput = document.getElementById('projSpeed');
      const gravityInput = document.getElementById('projGravity');
      const angleValue = document.getElementById('projAngleValue');
      const speedValue = document.getElementById('projSpeedValue');
      const gravityValue = document.getElementById('projGravityValue');
      const launchButton = document.getElementById('launchProjectile');
      const resetButton = document.getElementById('resetProjectile');
      let simulationTime = 0;
      let isRunning = false;
      let trajectory = [];
      let lastTimestamp = performance.now();

      function syncLabels() {
        angleValue.textContent = Number(angleInput.value).toFixed(0) + '°';
        speedValue.textContent = Number(speedInput.value).toFixed(1) + ' m/s';
        gravityValue.textContent = Number(gravityInput.value).toFixed(2) + ' m/s²';
      }

      function launch() {
        simulationTime = 0;
        isRunning = true;
        trajectory = [];
      }

      function reset() {
        angleInput.value = '45';
        speedInput.value = '18';
        gravityInput.value = '9.81';
        syncLabels();
        simulationTime = 0;
        trajectory = [];
        isRunning = false;
      }

      function currentPoint(time) {
        const angle = Number(angleInput.value) * Math.PI / 180;
        const speed = Number(speedInput.value);
        const gravity = Number(gravityInput.value);
        const x = speed * Math.cos(angle) * time;
        const y = speed * Math.sin(angle) * time - 0.5 * gravity * time * time;
        return { x, y };
      }

      function draw(timestamp) {
        const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.032);
        lastTimestamp = timestamp;
        if (isRunning) {
          simulationTime += dt;
          const point = currentPoint(simulationTime);
          trajectory.push(point);
          if (point.y < 0 && trajectory.length > 1) {
            isRunning = false;
          }
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f7fbff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const padding = { left: 70, right: 30, top: 24, bottom: 56 };
        const plotWidth = canvas.width - padding.left - padding.right;
        const plotHeight = canvas.height - padding.top - padding.bottom;
        const scaleX = 16;
        const scaleY = 12;
        const originX = padding.left;
        const originY = padding.top + plotHeight;

        ctx.strokeStyle = 'rgba(65, 119, 155, 0.18)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= plotWidth; x += plotWidth / 8) {
          ctx.beginPath();
          ctx.moveTo(originX + x, padding.top);
          ctx.lineTo(originX + x, originY);
          ctx.stroke();
        }
        for (let y = 0; y <= plotHeight; y += plotHeight / 6) {
          ctx.beginPath();
          ctx.moveTo(originX, padding.top + y);
          ctx.lineTo(originX + plotWidth, padding.top + y);
          ctx.stroke();
        }

        ctx.strokeStyle = '#2f678e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(originX, padding.top);
        ctx.lineTo(originX, originY);
        ctx.lineTo(originX + plotWidth, originY);
        ctx.stroke();

        ctx.beginPath();
        trajectory.forEach((point, index) => {
          const canvasX = originX + point.x * scaleX;
          const canvasY = originY - Math.max(point.y, 0) * scaleY;
          if (index === 0) ctx.moveTo(canvasX, canvasY);
          else ctx.lineTo(canvasX, canvasY);
        });
        ctx.strokeStyle = '#3fa9e5';
        ctx.lineWidth = 4;
        ctx.stroke();

        const activePoint = trajectory[trajectory.length - 1];
        if (activePoint) {
          const canvasX = originX + activePoint.x * scaleX;
          const canvasY = originY - Math.max(activePoint.y, 0) * scaleY;
          ctx.fillStyle = '#3f84c8';
          ctx.beginPath();
          ctx.arc(canvasX, canvasY, 8, 0, Math.PI * 2);
          ctx.fill();
        }

        requestAnimationFrame(draw);
      }

      [angleInput, speedInput, gravityInput].forEach((input) => input.addEventListener('input', syncLabels));
      launchButton.addEventListener('click', launch);
      resetButton.addEventListener('click', reset);

      syncLabels();
      requestAnimationFrame((timestamp) => {
        lastTimestamp = timestamp;
        draw(timestamp);
      });
    </script>
  `;
}

function createConceptExplorerHtml(title: string, prompt: string, language: 'en' | 'zh-CN') {
  const labels =
    language === 'zh-CN'
      ? {
          goal: '学习目标',
          explore: '探索路径',
          reveal: '展开下一步',
          restart: '重新开始',
          tip: '这个 AI 元素会把概念拆成更容易上手的小步骤，并在右侧给出互动提醒。',
        }
      : {
          goal: 'Learning goal',
          explore: 'Explore the idea',
          reveal: 'Reveal next step',
          restart: 'Restart',
          tip: 'This AI element breaks the concept into smaller steps and gives the learner interactive prompts to react to.',
        };

  const titleSummary = summarizePrompt(prompt, title);

  return `
    <style>
      .iv-shell{border-radius:28px;background:linear-gradient(180deg,rgba(252,250,245,.96),rgba(243,239,231,.98));border:1px solid rgba(221,211,195,.82);box-shadow:0 24px 48px rgba(90,70,50,.09);padding:22px;color:#43372c}
      .iv-shell h2{margin:0;font-size:1.45rem}
      .iv-shell p{margin:8px 0 0;color:#6c5d4c;line-height:1.6}
      .iv-grid{display:grid;gap:18px;margin-top:20px}
      @media(min-width:960px){.iv-grid{grid-template-columns:minmax(0,1.2fr) minmax(290px,.9fr)}}
      .iv-stage,.iv-card{border-radius:22px;background:rgba(255,255,255,.92);border:1px solid rgba(227,218,206,.88);padding:18px}
      .iv-list{display:grid;gap:12px;margin-top:12px}
      .iv-step{display:none;border-radius:18px;background:rgba(245,251,244,.95);border:1px solid rgba(183,214,183,.82);padding:14px}
      .iv-step.is-visible{display:block}
      .iv-step h3{margin:0 0 8px;font-size:1rem}
      .iv-step p{margin:0;font-size:.95rem}
      .iv-prompt{margin-top:16px;padding:12px 14px;border-radius:16px;background:rgba(251,247,239,.96);border:1px solid rgba(226,214,196,.88);font-size:.92rem}
      .iv-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
      .iv-button{border:0;border-radius:14px;padding:10px 14px;font-weight:700;cursor:pointer}
      .iv-button--primary{background:linear-gradient(135deg,#88b58f,#6f9b75);color:white}
      .iv-button--secondary{background:rgba(111,155,117,.12);color:#5e8464}
      .iv-badge{display:inline-flex;padding:8px 12px;border-radius:999px;background:rgba(136,181,143,.15);color:#628768;font-size:.78rem;font-weight:700}
      .iv-card h3{margin:0 0 10px;font-size:.82rem;text-transform:uppercase;letter-spacing:.12em;color:#7d8d74}
      .iv-checks{display:grid;gap:10px}
      .iv-check{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:16px;background:rgba(244,251,244,.94);border:1px solid rgba(198,221,200,.9)}
      .iv-check input{margin-top:3px}
    </style>
    <section class="iv-shell">
      <span class="iv-badge">AI Element</span>
      <h2>${escapeAttribute(title)}</h2>
      <p>${escapeAttribute(titleSummary)}</p>
      <div class="iv-grid">
        <div class="iv-stage">
          <h3>${labels.goal}</h3>
          <p>${labels.tip}</p>
          <div class="iv-list">
            <article class="iv-step is-visible"><h3>1. Focus the idea</h3><p>Restate the concept in one sentence: what is changing, what stays fixed, and what the learner should notice first.</p></article>
            <article class="iv-step"><h3>2. Identify the moving piece</h3><p>Pick the quantity or relationship that changes the result most strongly. That becomes the first thing to manipulate.</p></article>
            <article class="iv-step"><h3>3. Try a contrast</h3><p>Compare two settings side by side and ask: what visibly grew, shrank, sped up, or shifted?</p></article>
            <article class="iv-step"><h3>4. Explain it back</h3><p>Summarize the pattern in your own words. If you can predict the next change before it happens, the idea is sticking.</p></article>
          </div>
          <div class="iv-prompt" id="promptBox">${labels.explore}: ${escapeAttribute(prompt)}</div>
          <div class="iv-actions">
            <button id="revealStep" class="iv-button iv-button--primary">${labels.reveal}</button>
            <button id="restartSteps" class="iv-button iv-button--secondary">${labels.restart}</button>
          </div>
        </div>
        <div class="iv-card">
          <h3>${labels.explore}</h3>
          <div class="iv-checks">
            <label class="iv-check"><input type="checkbox" /> <span>Name the quantity you want to manipulate first.</span></label>
            <label class="iv-check"><input type="checkbox" /> <span>Predict what should happen before revealing the next step.</span></label>
            <label class="iv-check"><input type="checkbox" /> <span>Write one sentence connecting the visual change back to the concept.</span></label>
          </div>
        </div>
      </div>
    </section>
    <script>
      const steps = Array.from(document.querySelectorAll('.iv-step'));
      const revealButton = document.getElementById('revealStep');
      const restartButton = document.getElementById('restartSteps');
      let visibleCount = 1;
      revealButton.addEventListener('click', () => {
        visibleCount = Math.min(steps.length, visibleCount + 1);
        steps.forEach((step, index) => step.classList.toggle('is-visible', index < visibleCount));
      });
      restartButton.addEventListener('click', () => {
        visibleCount = 1;
        steps.forEach((step, index) => step.classList.toggle('is-visible', index < visibleCount));
      });
    </script>
  `;
}

function createProbabilityDiceHtml(title: string, language: 'en' | 'zh-CN') {
  const copy =
    language === 'zh-CN'
      ? {
          kicker: '概率实验室',
          subtitle: '掷骰子、查看柱状图，并比较实验结果与理论分布。',
          diceLabel: '骰子数量',
          rollOne: '掷 1 次',
          rollMany: '掷 25 次',
          reset: '重置',
          totalRolls: '总次数',
          commonOutcome: '最常见点数和',
          theory: '理论分布',
          experimental: '实验次数',
          observationPrefix: '观察',
          observation:
            '目前一共 {count} 次试验，点数和 {outcome} 最常见；样本变大时，实验分布会更接近理论分布。',
          oneDie: '1 个骰子',
          twoDice: '2 个骰子',
          threeDice: '3 个骰子',
        }
      : {
          kicker: 'Probability Lab',
          subtitle: 'Roll dice, inspect the histogram, and compare experimental results with the theoretical distribution.',
          diceLabel: 'Number of Dice',
          rollOne: 'Roll 1',
          rollMany: 'Roll 25',
          reset: 'Reset',
          totalRolls: 'Total Rolls',
          commonOutcome: 'Most Common Sum',
          theory: 'Theory',
          experimental: 'Experimental Count',
          observationPrefix: 'Observation',
          observation:
            'After {count} rolls, sum {outcome} appears most often, and the bars are moving closer to the theoretical shape.',
          oneDie: '1 Die',
          twoDice: '2 Dice',
          threeDice: '3 Dice',
        };

  const initialHistory = [7, 6, 8, 7, 5, 9, 7, 4, 10, 8, 6, 7, 9, 5, 7, 8, 6, 11, 3, 7, 8, 6, 9, 7];

  return `
    <style>
      .iv-shell {
        border-radius: 28px;
        background: linear-gradient(180deg, rgba(252, 250, 245, 0.96), rgba(243, 239, 231, 0.98));
        border: 1px solid rgba(221, 211, 195, 0.82);
        box-shadow: 0 24px 48px rgba(90, 70, 50, 0.09);
        padding: 22px;
        color: #43372c;
      }
      .iv-header h2 {
        margin: 6px 0 0;
        font-size: 1.55rem;
      }
      .iv-header p {
        margin: 8px 0 0;
        color: #6c5d4c;
        line-height: 1.55;
      }
      .iv-kicker {
        display: inline-flex;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(136, 181, 143, 0.15);
        color: #628768;
        font-size: 0.78rem;
        font-weight: 700;
      }
      .iv-layout {
        display: grid;
        gap: 16px;
        margin-top: 18px;
      }
      @media (min-width: 960px) {
        .iv-layout {
          grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.8fr);
        }
      }
      .iv-visual-card,
      .iv-controls-card,
      .iv-observation-card,
      .iv-stat-card {
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.94);
        border: 1px solid rgba(227, 218, 206, 0.88);
      }
      .iv-visual-card {
        padding: 18px;
      }
      .iv-chart {
        width: 100%;
        aspect-ratio: 16 / 9;
        display: block;
      }
      .iv-controls-card {
        padding: 18px;
        display: grid;
        gap: 14px;
      }
      .iv-section-title {
        margin: 0 0 8px;
        font-size: 0.86rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #7d8d74;
      }
      .iv-control {
        display: grid;
        gap: 8px;
      }
      .iv-control-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .iv-label {
        font-weight: 700;
      }
      .iv-select,
      .iv-button {
        border-radius: 14px;
        border: 1px solid rgba(210, 198, 181, 0.92);
        font: inherit;
      }
      .iv-select {
        min-width: 132px;
        padding: 10px 12px;
        background: white;
      }
      .iv-button-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .iv-button {
        padding: 10px 14px;
        background: white;
        cursor: pointer;
        font-weight: 700;
      }
      .iv-button--primary {
        background: linear-gradient(135deg, #88b58f, #6f9b75);
        color: white;
        border: 0;
      }
      .iv-stats {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .iv-stat-card {
        padding: 12px 14px;
      }
      .iv-stat-card .iv-note {
        margin: 0;
        color: #7d8d74;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .iv-stat-card .iv-value {
        margin-top: 6px;
        font-size: 1.2rem;
        font-weight: 800;
      }
      .iv-observation-card {
        margin-top: 16px;
        padding: 14px 16px;
        border-left: 5px solid #7fa467;
      }
      .iv-observation-card p {
        margin: 0;
        color: #5d5145;
        line-height: 1.6;
      }
      .iv-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        margin-top: 12px;
        color: #6c5d4c;
        font-size: 0.92rem;
      }
      .iv-legend-item {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .iv-swatch {
        width: 14px;
        height: 14px;
        border-radius: 999px;
      }
    </style>
    <section class="iv-shell">
      <header class="iv-header">
        <span class="iv-kicker">${copy.kicker}</span>
        <h2>${escapeAttribute(title)}</h2>
        <p>${copy.subtitle}</p>
      </header>
      <div class="iv-layout">
        <div class="iv-visual-card">
          <svg id="diceHistogram" class="iv-chart" viewBox="0 0 800 420" aria-label="${escapeAttribute(title)}" role="img"></svg>
          <div class="iv-legend">
            <span class="iv-legend-item"><span class="iv-swatch" style="background:#7fa467"></span>${copy.experimental}</span>
            <span class="iv-legend-item"><span class="iv-swatch" style="background:#d79b45"></span>${copy.theory}</span>
          </div>
          <div class="iv-observation-card">
            <p><strong>${copy.observationPrefix}:</strong> <span id="observationText"></span></p>
          </div>
        </div>
        <aside class="iv-controls-card">
          <div class="iv-control">
            <h3 class="iv-section-title">${copy.diceLabel}</h3>
            <div class="iv-control-row">
              <label class="iv-label" for="diceCount">${copy.diceLabel}</label>
              <select id="diceCount" class="iv-select" aria-label="${copy.diceLabel}">
                <option value="1">${copy.oneDie}</option>
                <option value="2" selected>${copy.twoDice}</option>
                <option value="3">${copy.threeDice}</option>
              </select>
            </div>
          </div>
          <div class="iv-button-row">
            <button id="rollOne" class="iv-button iv-button--primary">${copy.rollOne}</button>
            <button id="rollMany" class="iv-button iv-button--primary">${copy.rollMany}</button>
            <button id="resetButton" class="iv-button">${copy.reset}</button>
          </div>
          <div class="iv-stats">
            <div class="iv-stat-card">
              <p class="iv-note">${copy.totalRolls}</p>
              <div class="iv-value" id="totalRollsValue">0</div>
            </div>
            <div class="iv-stat-card">
              <p class="iv-note">${copy.commonOutcome}</p>
              <div class="iv-value" id="commonOutcomeValue">-</div>
            </div>
          </div>
        </aside>
      </div>
    </section>
    <script>
      const track = window.PrimoriaInteractive?.track || (() => {});
      const svg = document.getElementById('diceHistogram');
      const diceCountInput = document.getElementById('diceCount');
      const rollOneButton = document.getElementById('rollOne');
      const rollManyButton = document.getElementById('rollMany');
      const resetButton = document.getElementById('resetButton');
      const totalRollsValue = document.getElementById('totalRollsValue');
      const commonOutcomeValue = document.getElementById('commonOutcomeValue');
      const observationText = document.getElementById('observationText');
      const initialHistory = ${JSON.stringify(initialHistory)};
      let diceCount = 2;
      let history = initialHistory.slice();

      function theoreticalDistribution(count) {
        const totals = new Map();
        function walk(depth, sum) {
          if (depth === count) {
            totals.set(sum, (totals.get(sum) || 0) + 1);
            return;
          }
          for (let face = 1; face <= 6; face += 1) {
            walk(depth + 1, sum + face);
          }
        }
        walk(0, 0);
        const entries = [];
        const totalOutcomes = Math.pow(6, count);
        for (let sum = count; sum <= count * 6; sum += 1) {
          entries.push({ sum, probability: (totals.get(sum) || 0) / totalOutcomes });
        }
        return entries;
      }

      function randomRoll(count) {
        let total = 0;
        for (let i = 0; i < count; i += 1) {
          total += 1 + Math.floor(Math.random() * 6);
        }
        return total;
      }

      function seedHistory(count) {
        if (count === 1) return [1, 2, 3, 4, 5, 6, 3, 4, 2, 5, 1, 6];
        if (count === 3) return [10, 11, 9, 12, 10, 8, 13, 9, 11, 10, 12, 14, 7, 15, 10, 11, 9, 12];
        return initialHistory.slice();
      }

      function countsFromHistory(values, count) {
        const counts = new Map();
        for (let sum = count; sum <= count * 6; sum += 1) {
          counts.set(sum, 0);
        }
        values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
        return counts;
      }

      function mostCommonOutcome(counts, count) {
        let winner = count;
        let highest = -1;
        for (let sum = count; sum <= count * 6; sum += 1) {
          const current = counts.get(sum) || 0;
          if (current > highest) {
            highest = current;
            winner = sum;
          }
        }
        return winner;
      }

      function updateObservation(total, outcome) {
        const text = ${JSON.stringify(copy.observation)}
          .replace('{count}', String(total))
          .replace('{outcome}', String(outcome));
        observationText.textContent = text;
      }

      function render() {
        const counts = countsFromHistory(history, diceCount);
        const theory = theoreticalDistribution(diceCount);
        const outcomes = theory.map((entry) => entry.sum);
        const maxCount = Math.max(1, ...outcomes.map((sum) => counts.get(sum) || 0));
        const maxTheoryProbability = Math.max(0.0001, ...theory.map((entry) => entry.probability));
        const chartLeft = 72;
        const chartRight = 760;
        const chartTop = 36;
        const chartBottom = 332;
        const chartHeight = chartBottom - chartTop;
        const chartWidth = chartRight - chartLeft;
        const slotWidth = chartWidth / outcomes.length;
        const barWidth = Math.max(18, slotWidth * 0.58);
        const pieces = [];
        pieces.push('<rect x="0" y="0" width="800" height="420" rx="22" fill="#fffdf9"></rect>');
        for (let row = 0; row <= 4; row += 1) {
          const y = chartBottom - (chartHeight / 4) * row;
          pieces.push('<line x1="' + chartLeft + '" y1="' + y + '" x2="' + chartRight + '" y2="' + y + '" stroke="#e5ddd1" stroke-width="1"></line>');
          if (row < 4) {
            const label = Math.round((maxCount / 4) * row);
            pieces.push('<text x="58" y="' + (y + 4) + '" fill="#7a6f65" font-size="12" text-anchor="end">' + label + '</text>');
          }
        }
        pieces.push('<line x1="' + chartLeft + '" y1="' + chartBottom + '" x2="' + chartRight + '" y2="' + chartBottom + '" stroke="#bda98f" stroke-width="2"></line>');
        pieces.push('<line x1="' + chartLeft + '" y1="' + chartTop + '" x2="' + chartLeft + '" y2="' + chartBottom + '" stroke="#bda98f" stroke-width="2"></line>');
        theory.forEach((entry, index) => {
          const count = counts.get(entry.sum) || 0;
          const xCenter = chartLeft + slotWidth * index + slotWidth / 2;
          const barHeight = (count / maxCount) * (chartHeight - 8);
          const barY = chartBottom - barHeight;
          const theoryY = chartBottom - (entry.probability / maxTheoryProbability) * (chartHeight - 22);
          pieces.push('<rect x="' + (xCenter - barWidth / 2) + '" y="' + barY + '" width="' + barWidth + '" height="' + Math.max(0, barHeight) + '" rx="8" fill="#7fa467"></rect>');
          pieces.push('<circle cx="' + xCenter + '" cy="' + theoryY + '" r="5" fill="#d79b45"></circle>');
          pieces.push('<text x="' + xCenter + '" y="' + (chartBottom + 22) + '" fill="#5f554b" font-size="13" text-anchor="middle">' + entry.sum + '</text>');
        });
        svg.innerHTML = pieces.join('');
        const total = history.length;
        const common = mostCommonOutcome(counts, diceCount);
        totalRollsValue.textContent = String(total);
        commonOutcomeValue.textContent = String(common);
        updateObservation(total, common);
      }

      function appendRolls(amount) {
        for (let i = 0; i < amount; i += 1) {
          history.push(randomRoll(diceCount));
        }
        render();
      }

      diceCountInput.addEventListener('change', () => {
        diceCount = Number(diceCountInput.value);
        history = seedHistory(diceCount);
        render();
        track('dice_count_changed', { dice: diceCount });
      });

      rollOneButton.addEventListener('click', () => {
        appendRolls(1);
        track('roll_batch', { amount: 1, dice: diceCount });
      });

      rollManyButton.addEventListener('click', () => {
        appendRolls(25);
        track('roll_batch', { amount: 25, dice: diceCount });
      });

      resetButton.addEventListener('click', () => {
        history = seedHistory(diceCount);
        render();
        track('reset_pressed', { dice: diceCount });
      });

      render();
    </script>
  `;
}

function createWaveSoundHtml(title: string, language: 'en' | 'zh-CN') {
  const copy =
    language === 'zh-CN'
      ? {
          badge: '波与声音',
          summary: '同时观察波形与介质压缩，比较振幅、频率和波长的变化。',
          controls: '控制',
          amplitude: '振幅',
          frequency: '频率',
          wavelength: '波长',
          volume: '音量强度',
          observation: '观察',
          reset: '重置',
          note: '频率越高，波峰越密集；波长越短，压缩带也更紧密。',
        }
      : {
          badge: 'Wave and Sound',
          summary: 'Compare a sine wave with a compression model and see how both respond together.',
          controls: 'Controls',
          amplitude: 'Amplitude',
          frequency: 'Frequency',
          wavelength: 'Wavelength',
          volume: 'Volume intensity',
          observation: 'Observation',
          reset: 'Reset',
          note: 'Higher frequency packs the crests closer together, while shorter wavelength squeezes the compression bands.',
        };

  return `
    <style>
      .iv-shell{display:grid;gap:18px;padding:18px;color:#2f2a25}
      .iv-grid{display:grid;gap:18px}
      @media(min-width:980px){.iv-grid{grid-template-columns:minmax(0,1.45fr) minmax(280px,.85fr)}}
      .iv-card,.iv-observation-card{border:1px solid #e2d6c7;border-radius:22px;background:#fffdf9;box-shadow:0 12px 28px rgba(77,60,40,.08)}
      .iv-card{padding:18px}
      .iv-observation-card{padding:16px 18px}
      .iv-badge{display:inline-flex;align-items:center;border-radius:999px;background:#eef5ff;color:#335e9d;padding:6px 11px;font-size:.76rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
      .iv-lead{margin:10px 0 0;color:#675d55;line-height:1.65}
      .iv-controls{display:grid;gap:12px}
      .iv-field{display:grid;gap:6px}
      .iv-field label{display:flex;justify-content:space-between;font-size:.87rem;font-weight:700;color:#4a4037}
      .iv-field input{width:100%;accent-color:#4d7bc4}
      .iv-button{border:0;border-radius:14px;padding:11px 14px;background:#4d7bc4;color:white;font-weight:700;cursor:pointer}
      .iv-stat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
      .iv-stat{border-radius:16px;background:#f4f8ff;padding:12px}
      .iv-stat strong{display:block;font-size:1rem;color:#21426d}
      svg{width:100%;height:auto;display:block}
      .iv-observation-card h3{margin:0 0 6px;font-size:.95rem;color:#4a4037}
      .iv-observation-card p{margin:0;color:#675d55;line-height:1.6}
    </style>
    <section class="iv-shell">
      <div class="iv-card">
        <span class="iv-badge">${copy.badge}</span>
        <p class="iv-lead">${copy.summary}</p>
      </div>
      <div class="iv-grid">
        <div class="iv-card">
          <svg id="waveSoundSvg" viewBox="0 0 920 430" role="img" aria-label="${escapeAttribute(title)}"></svg>
        </div>
        <aside class="iv-card">
          <h3 style="margin:0 0 12px">${copy.controls}</h3>
          <div class="iv-controls">
            <div class="iv-field">
              <label for="waveAmplitude">${copy.amplitude}<output id="waveAmplitudeValue">1.4</output></label>
              <input id="waveAmplitude" type="range" min="0.5" max="2.8" step="0.1" value="1.4" />
            </div>
            <div class="iv-field">
              <label for="waveFrequency">${copy.frequency}<output id="waveFrequencyValue">1.2</output></label>
              <input id="waveFrequency" type="range" min="0.6" max="2.6" step="0.1" value="1.2" />
            </div>
            <div class="iv-field">
              <label for="waveLength">${copy.wavelength}<output id="waveLengthValue">5.0</output></label>
              <input id="waveLength" type="range" min="3" max="8" step="0.2" value="5" />
            </div>
            <div class="iv-field">
              <label for="waveVolume">${copy.volume}<output id="waveVolumeValue">60</output></label>
              <input id="waveVolume" type="range" min="20" max="100" step="5" value="60" />
            </div>
            <button id="waveReset" class="iv-button">${copy.reset}</button>
          </div>
          <div class="iv-stat-grid">
            <div class="iv-stat"><span>${copy.amplitude}</span><strong id="waveAmplitudeLabel">1.4</strong></div>
            <div class="iv-stat"><span>${copy.frequency}</span><strong id="waveFrequencyLabel">1.2</strong></div>
            <div class="iv-stat"><span>${copy.wavelength}</span><strong id="waveLengthLabel">5.0</strong></div>
            <div class="iv-stat"><span>${copy.volume}</span><strong id="waveVolumeLabel">60</strong></div>
          </div>
        </aside>
      </div>
      <div class="iv-observation-card">
        <h3>${copy.observation}</h3>
        <p id="waveObservationText">${copy.note}</p>
      </div>
    </section>
    <script>
      const track = window.PrimoriaInteractive?.track || (() => {});
      const svg = document.getElementById('waveSoundSvg');
      const controls = {
        amplitude: document.getElementById('waveAmplitude'),
        frequency: document.getElementById('waveFrequency'),
        wavelength: document.getElementById('waveLength'),
        volume: document.getElementById('waveVolume')
      };
      const outputs = {
        amplitude: document.getElementById('waveAmplitudeValue'),
        frequency: document.getElementById('waveFrequencyValue'),
        wavelength: document.getElementById('waveLengthValue'),
        volume: document.getElementById('waveVolumeValue')
      };
      const labels = {
        amplitude: document.getElementById('waveAmplitudeLabel'),
        frequency: document.getElementById('waveFrequencyLabel'),
        wavelength: document.getElementById('waveLengthLabel'),
        volume: document.getElementById('waveVolumeLabel')
      };
      const observation = document.getElementById('waveObservationText');
      const resetButton = document.getElementById('waveReset');

      function readState() {
        return {
          amplitude: Number(controls.amplitude.value),
          frequency: Number(controls.frequency.value),
          wavelength: Number(controls.wavelength.value),
          volume: Number(controls.volume.value)
        };
      }

      function syncLabels(state) {
        outputs.amplitude.textContent = state.amplitude.toFixed(1);
        outputs.frequency.textContent = state.frequency.toFixed(1);
        outputs.wavelength.textContent = state.wavelength.toFixed(1);
        outputs.volume.textContent = String(state.volume);
        labels.amplitude.textContent = state.amplitude.toFixed(1);
        labels.frequency.textContent = state.frequency.toFixed(1);
        labels.wavelength.textContent = state.wavelength.toFixed(1);
        labels.volume.textContent = String(state.volume);
      }

      function buildWavePath(state) {
        const left = 60;
        const width = 470;
        const centerY = 152;
        const amplitudePx = state.amplitude * 34;
        const wavelengthFactor = 9 - state.wavelength;
        let path = '';
        for (let step = 0; step <= 120; step += 1) {
          const ratio = step / 120;
          const x = left + ratio * width;
          const radians = ratio * Math.PI * 2 * state.frequency * wavelengthFactor / 3;
          const y = centerY - Math.sin(radians) * amplitudePx;
          path += step === 0 ? 'M ' + x + ' ' + y : ' L ' + x + ' ' + y;
        }
        return path;
      }

      function render() {
        const state = readState();
        syncLabels(state);
        const path = buildWavePath(state);
        const compressionSpacing = 20 + state.wavelength * 6;
        const barHeight = 84 + state.amplitude * 18;
        const pieces = [];
        pieces.push('<rect x="18" y="18" width="884" height="394" rx="26" fill="#fbfdff"></rect>');
        pieces.push('<text x="54" y="48" fill="#39547f" font-size="18" font-weight="700">Waveform</text>');
        pieces.push('<text x="602" y="48" fill="#39547f" font-size="18" font-weight="700">Compression Model</text>');
        for (let grid = 0; grid <= 5; grid += 1) {
          const y = 88 + grid * 42;
          pieces.push('<line x1="54" y1="' + y + '" x2="540" y2="' + y + '" stroke="#e1ebf8" stroke-width="1"></line>');
        }
        for (let grid = 0; grid <= 6; grid += 1) {
          const x = 60 + grid * 78;
          pieces.push('<line x1="' + x + '" y1="84" x2="' + x + '" y2="252" stroke="#edf3fb" stroke-width="1"></line>');
        }
        pieces.push('<line x1="58" y1="152" x2="536" y2="152" stroke="#acc1dc" stroke-width="2"></line>');
        pieces.push('<path d="' + path + '" fill="none" stroke="#3f7cc3" stroke-width="4" stroke-linecap="round"></path>');
        pieces.push('<path d="' + path + '" fill="none" stroke="rgba(63,124,195,0.18)" stroke-width="12" stroke-linecap="round"></path>');
        pieces.push('<rect x="612" y="126" width="32" height="52" rx="8" fill="#496eaa"></rect>');
        pieces.push('<polygon points="642,136 670,116 670,188 642,168" fill="#6a92cf"></polygon>');
        for (let index = 0; index < 8; index += 1) {
          const x = 694 + index * compressionSpacing;
          const radius = 10 + ((state.volume / 100) * 10) + (index % 2 === 0 ? state.amplitude * 2 : 0);
          const opacity = Math.max(0.22, 0.78 - index * 0.08);
          pieces.push('<ellipse cx="' + x + '" cy="152" rx="' + radius + '" ry="' + (barHeight / 2) + '" fill="none" stroke="rgba(101,148,217,' + opacity.toFixed(2) + ')" stroke-width="4"></ellipse>');
        }
        pieces.push('<text x="58" y="286" fill="#645b53" font-size="14">Amplitude controls the height of the wave.</text>');
        pieces.push('<text x="602" y="286" fill="#645b53" font-size="14">Wavelength changes the spacing between compression bands.</text>');
        svg.innerHTML = pieces.join('');
        const wavelengthDescription = state.wavelength < 4.5 ? 'shorter' : state.wavelength > 6.5 ? 'longer' : 'balanced';
        const frequencyDescription = state.frequency > 1.8 ? 'more tightly packed' : state.frequency < 1 ? 'more spread out' : 'steady';
        observation.textContent =
          'Amplitude ' + state.amplitude.toFixed(1) +
          ' makes the crest height easier to see. Frequency ' + state.frequency.toFixed(1) +
          ' keeps the wave ' + frequencyDescription +
          ', while the ' + wavelengthDescription +
          ' wavelength changes the spacing between the compression bands.';
      }

      Object.values(controls).forEach((input) => {
        input.addEventListener('input', () => {
          render();
          track('wave_changed', { control: input.id, value: input.value });
        });
      });

      resetButton.addEventListener('click', () => {
        controls.amplitude.value = '1.4';
        controls.frequency.value = '1.2';
        controls.wavelength.value = '5';
        controls.volume.value = '60';
        render();
        track('wave_reset', {});
      });

      render();
    </script>
  `;
}

function createProgrammingLogicFlowHtml(title: string, language: 'en' | 'zh-CN') {
  const copy =
    language === 'zh-CN'
      ? {
          badge: '程序逻辑',
          summary: '逐步执行一个带条件和循环的简单程序，观察变量如何变化。',
          step: '单步执行',
          auto: '自动播放',
          stop: '停止',
          reset: '重置',
          observation: '观察',
          state: '变量状态',
          code: '伪代码',
        }
      : {
          badge: 'Programming Logic',
          summary: 'Step through a small loop-and-condition example and watch the variables change.',
          step: 'Step',
          auto: 'Auto',
          stop: 'Stop',
          reset: 'Reset',
          observation: 'Observation',
          state: 'State',
          code: 'Pseudocode',
        };

  return `
    <style>
      .iv-shell{display:grid;gap:18px;padding:18px;color:#2f2a25}
      .iv-grid{display:grid;gap:18px}
      @media(min-width:980px){.iv-grid{grid-template-columns:minmax(0,1.4fr) minmax(300px,.9fr)}}
      .iv-card,.iv-observation-card{border:1px solid #e2d6c7;border-radius:22px;background:#fffdf9;box-shadow:0 12px 28px rgba(77,60,40,.08)}
      .iv-card{padding:18px}
      .iv-observation-card{padding:16px 18px}
      .iv-badge{display:inline-flex;align-items:center;border-radius:999px;background:#eef5ff;color:#335e9d;padding:6px 11px;font-size:.76rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
      .iv-lead{margin:10px 0 0;color:#675d55;line-height:1.65}
      .iv-actions{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}
      .iv-button{border:0;border-radius:14px;padding:11px 14px;font-weight:700;cursor:pointer}
      .iv-button--primary{background:#4d7bc4;color:white}
      .iv-button--secondary{background:#edf4ff;color:#335e9d}
      .iv-state-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .iv-state{border-radius:16px;background:#f7f4ef;padding:12px}
      .iv-state span{display:block;color:#7a6f65;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em}
      .iv-state strong{display:block;margin-top:6px;font-size:1.1rem;color:#2f2a25}
      .iv-code{display:grid;gap:8px;margin-top:12px}
      .iv-code-line{border-radius:12px;background:#f7f4ef;padding:9px 11px;color:#675d55;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.86rem}
      .iv-code-line.is-active{background:#e9f2ff;color:#21426d;font-weight:700}
      svg{width:100%;height:auto;display:block}
      .iv-observation-card h3{margin:0 0 6px;font-size:.95rem;color:#4a4037}
      .iv-observation-card p{margin:0;color:#675d55;line-height:1.6}
    </style>
    <section class="iv-shell">
      <div class="iv-card">
        <span class="iv-badge">${copy.badge}</span>
        <p class="iv-lead">${copy.summary}</p>
        <div class="iv-actions">
          <button id="logicStep" class="iv-button iv-button--primary">${copy.step}</button>
          <button id="logicAuto" class="iv-button iv-button--secondary">${copy.auto}</button>
          <button id="logicReset" class="iv-button iv-button--secondary">${copy.reset}</button>
        </div>
      </div>
      <div class="iv-grid">
        <div class="iv-card">
          <svg id="logicFlowSvg" viewBox="0 0 900 420" role="img" aria-label="${escapeAttribute(title)}"></svg>
        </div>
        <aside class="iv-card">
          <h3 style="margin:0 0 12px">${copy.state}</h3>
          <div class="iv-state-grid">
            <div class="iv-state"><span>i</span><strong id="logicIValue">1</strong></div>
            <div class="iv-state"><span>total</span><strong id="logicTotalValue">0</strong></div>
            <div class="iv-state"><span>step</span><strong id="logicStepValue">start</strong></div>
          </div>
          <h3 style="margin:16px 0 10px">${copy.code}</h3>
          <div class="iv-code" id="logicCodeList"></div>
        </aside>
      </div>
      <div class="iv-observation-card">
        <h3>${copy.observation}</h3>
        <p id="logicObservationText"></p>
      </div>
    </section>
    <script>
      const track = window.PrimoriaInteractive?.track || (() => {});
      const svg = document.getElementById('logicFlowSvg');
      const codeList = document.getElementById('logicCodeList');
      const stepButton = document.getElementById('logicStep');
      const autoButton = document.getElementById('logicAuto');
      const resetButton = document.getElementById('logicReset');
      const iValue = document.getElementById('logicIValue');
      const totalValue = document.getElementById('logicTotalValue');
      const stepValue = document.getElementById('logicStepValue');
      const observation = document.getElementById('logicObservationText');
      const codeLines = [
        { key: 'init', text: '1. i = 1; total = 0' },
        { key: 'check', text: '2. while (i <= 5)' },
        { key: 'odd', text: '3. if (i is odd)' },
        { key: 'add', text: '4. total = total + i' },
        { key: 'increment', text: '5. i = i + 1' },
        { key: 'end', text: '6. stop' }
      ];

      const nodes = [
        { id: 'start', label: 'Start', x: 130, y: 70, width: 120, height: 48, kind: 'terminal' },
        { id: 'init', label: 'Set i=1\\nSet total=0', x: 130, y: 150, width: 170, height: 62, kind: 'process' },
        { id: 'check', label: 'i <= 5?', x: 130, y: 255, width: 150, height: 78, kind: 'decision' },
        { id: 'odd', label: 'i is odd?', x: 410, y: 255, width: 150, height: 78, kind: 'decision' },
        { id: 'add', label: 'Add i to total', x: 410, y: 145, width: 168, height: 58, kind: 'process' },
        { id: 'increment', label: 'i = i + 1', x: 690, y: 255, width: 152, height: 58, kind: 'process' },
        { id: 'end', label: 'End', x: 690, y: 70, width: 110, height: 48, kind: 'terminal' }
      ];

      let timer = null;
      let machine = {};

      function resetMachine() {
        machine = {
          current: 'start',
          i: 1,
          total: 0,
          branch: '',
          loops: 0,
          done: false
        };
      }

      function currentCodeKey() {
        if (machine.current === 'start') return 'init';
        return machine.current;
      }

      function renderCode() {
        const activeKey = currentCodeKey();
        codeList.innerHTML = codeLines
          .map((line) => '<div class="iv-code-line' + (line.key === activeKey ? ' is-active' : '') + '">' + line.text + '</div>')
          .join('');
      }

      function renderFlow() {
        const pieces = [];
        pieces.push('<defs><marker id="logicArrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#8ca6cc"></path></marker></defs>');
        pieces.push('<rect x="18" y="18" width="864" height="384" rx="26" fill="#fbfdff"></rect>');
        const edges = [
          ['start', 'init', ''],
          ['init', 'check', ''],
          ['check', 'odd', 'yes'],
          ['check', 'end', 'no'],
          ['odd', 'add', 'yes'],
          ['odd', 'increment', 'no'],
          ['add', 'increment', ''],
          ['increment', 'check', 'loop']
        ];
        const positions = Object.fromEntries(nodes.map((node) => [node.id, node]));
        edges.forEach(([from, to, label]) => {
          const source = positions[from];
          const target = positions[to];
          const fromX = source.x + source.width / 2;
          const fromY = source.y + source.height;
          let toX = target.x + target.width / 2;
          let toY = target.y;
          let path = '';
          if (from === 'check' && to === 'end') {
            path = 'M ' + (source.x + source.width / 2) + ' ' + source.y + ' C 265 120, 520 120, ' + toX + ' ' + (toY + target.height);
            toY = target.y + target.height;
          } else if (from === 'increment' && to === 'check') {
            path = 'M ' + (source.x + source.width / 2) + ' ' + source.y + ' C 766 192, 300 192, ' + (target.x + target.width) + ' ' + (target.y + target.height / 2);
            toX = target.x + target.width;
            toY = target.y + target.height / 2;
          } else {
            path = 'M ' + fromX + ' ' + fromY + ' L ' + toX + ' ' + toY;
          }
          pieces.push('<path d="' + path + '" fill="none" stroke="#9fb4d2" stroke-width="3" marker-end="url(#logicArrow)"></path>');
          if (label) {
            const labelX = (fromX + toX) / 2;
            const labelY = (fromY + toY) / 2 - 10;
            pieces.push('<text x="' + labelX + '" y="' + labelY + '" fill="#5f7089" font-size="13" text-anchor="middle">' + label + '</text>');
          }
        });
        nodes.forEach((node) => {
          const active = machine.current === node.id;
          const fill = active ? '#e7f0ff' : '#fffdf9';
          const stroke = active ? '#4d7bc4' : '#d7cbbb';
          if (node.kind === 'decision') {
            const cx = node.x + node.width / 2;
            const cy = node.y + node.height / 2;
            const points = [
              cx + ',' + node.y,
              (node.x + node.width) + ',' + cy,
              cx + ',' + (node.y + node.height),
              node.x + ',' + cy
            ].join(' ');
            pieces.push('<polygon points="' + points + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="3"></polygon>');
          } else if (node.kind === 'terminal') {
            pieces.push('<rect x="' + node.x + '" y="' + node.y + '" width="' + node.width + '" height="' + node.height + '" rx="24" fill="' + fill + '" stroke="' + stroke + '" stroke-width="3"></rect>');
          } else {
            pieces.push('<rect x="' + node.x + '" y="' + node.y + '" width="' + node.width + '" height="' + node.height + '" rx="18" fill="' + fill + '" stroke="' + stroke + '" stroke-width="3"></rect>');
          }
          const lines = node.label.split('\\n');
          lines.forEach((line, index) => {
            pieces.push('<text x="' + (node.x + node.width / 2) + '" y="' + (node.y + node.height / 2 + index * 18 - (lines.length - 1) * 10) + '" fill="#31425b" font-size="16" font-weight="' + (active ? '700' : '600') + '" text-anchor="middle">' + line + '</text>');
          });
        });
        svg.innerHTML = pieces.join('');
      }

      function updateObservation() {
        if (machine.current === 'start') {
          observation.textContent = 'The program is about to initialize the loop variables before any branching happens.';
        } else if (machine.current === 'check') {
          observation.textContent = 'The loop condition checks whether i is still within the allowed range.';
        } else if (machine.current === 'odd') {
          observation.textContent = 'The condition branches based on whether the current value of i is odd.';
        } else if (machine.current === 'add') {
          observation.textContent = 'Only odd values are added, so total grows by 1, then 3, then 5.';
        } else if (machine.current === 'increment') {
          observation.textContent = 'The loop variable increases by 1 so execution can move to the next cycle.';
        } else if (machine.current === 'end') {
          observation.textContent = 'The loop has finished. The final total is the sum of the odd numbers from 1 to 5.';
        } else {
          observation.textContent = 'The variables are initializing before the loop begins.';
        }
      }

      function render() {
        renderFlow();
        renderCode();
        iValue.textContent = String(machine.i);
        totalValue.textContent = String(machine.total);
        stepValue.textContent = machine.current;
        updateObservation();
      }

      function advance() {
        if (machine.done) {
          if (timer) {
            clearInterval(timer);
            timer = null;
            autoButton.textContent = '${copy.auto}';
          }
          return;
        }
        switch (machine.current) {
          case 'start':
            machine.current = 'init';
            break;
          case 'init':
            machine.i = 1;
            machine.total = 0;
            machine.current = 'check';
            break;
          case 'check':
            machine.current = machine.i <= 5 ? 'odd' : 'end';
            if (machine.current === 'end') machine.done = true;
            break;
          case 'odd':
            machine.current = machine.i % 2 === 1 ? 'add' : 'increment';
            break;
          case 'add':
            machine.total += machine.i;
            machine.current = 'increment';
            break;
          case 'increment':
            machine.i += 1;
            machine.current = 'check';
            break;
          case 'end':
            machine.done = true;
            break;
          default:
            machine.current = 'start';
        }
        render();
        track('logic_step', { current: machine.current, i: machine.i, total: machine.total });
      }

      stepButton.addEventListener('click', advance);
      autoButton.addEventListener('click', () => {
        if (timer) {
          clearInterval(timer);
          timer = null;
          autoButton.textContent = '${copy.auto}';
          track('logic_auto_stop', {});
          return;
        }
        autoButton.textContent = '${copy.stop}';
        timer = window.setInterval(() => {
          advance();
          if (machine.done) {
            clearInterval(timer);
            timer = null;
            autoButton.textContent = '${copy.auto}';
          }
        }, 900);
        track('logic_auto_start', {});
      });
      resetButton.addEventListener('click', () => {
        if (timer) {
          clearInterval(timer);
          timer = null;
          autoButton.textContent = '${copy.auto}';
        }
        resetMachine();
        render();
        track('logic_reset', {});
      });

      resetMachine();
      render();
    </script>
  `;
}

function createSupplyDemandHtml(title: string, language: 'en' | 'zh-CN') {
  const copy =
    language === 'zh-CN'
      ? {
          badge: '供给与需求',
          summary: '移动供给和需求曲线，观察均衡点与短缺或过剩如何变化。',
          controls: '市场控制',
          demand: '需求移动',
          supply: '供给移动',
          marketPrice: '市场价格',
          equilibriumPrice: '均衡价格',
          equilibriumQuantity: '均衡数量',
          marketCondition: '市场状态',
          observation: '观察',
          reset: '重置',
        }
      : {
          badge: 'Supply and Demand',
          summary: 'Shift both curves and compare equilibrium with the current market price.',
          controls: 'Market Controls',
          demand: 'Demand shift',
          supply: 'Supply shift',
          marketPrice: 'Market price',
          equilibriumPrice: 'Equilibrium price',
          equilibriumQuantity: 'Equilibrium quantity',
          marketCondition: 'Market condition',
          observation: 'Observation',
          reset: 'Reset',
        };

  return `
    <style>
      .iv-shell{display:grid;gap:18px;padding:18px;color:#2f2a25}
      .iv-grid{display:grid;gap:18px}
      @media(min-width:980px){.iv-grid{grid-template-columns:minmax(0,1.45fr) minmax(290px,.85fr)}}
      .iv-card,.iv-observation-card{border:1px solid #e2d6c7;border-radius:22px;background:#fffdf9;box-shadow:0 12px 28px rgba(77,60,40,.08)}
      .iv-card{padding:18px}
      .iv-observation-card{padding:16px 18px}
      .iv-badge{display:inline-flex;align-items:center;border-radius:999px;background:#edf7ef;color:#36613c;padding:6px 11px;font-size:.76rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
      .iv-lead{margin:10px 0 0;color:#675d55;line-height:1.65}
      .iv-controls{display:grid;gap:12px}
      .iv-field{display:grid;gap:6px}
      .iv-field label{display:flex;justify-content:space-between;font-size:.87rem;font-weight:700;color:#4a4037}
      .iv-field input{width:100%;accent-color:#5f8f63}
      .iv-button{border:0;border-radius:14px;padding:11px 14px;background:#5f8f63;color:white;font-weight:700;cursor:pointer}
      .iv-stats{display:grid;gap:10px;margin-top:14px}
      .iv-stat{border-radius:16px;background:#f3f7f0;padding:12px}
      .iv-stat span{display:block;color:#6e655d;font-size:.8rem;text-transform:uppercase;letter-spacing:.06em}
      .iv-stat strong{display:block;margin-top:5px;font-size:1.1rem;color:#2f2a25}
      svg{width:100%;height:auto;display:block}
      .iv-observation-card h3{margin:0 0 6px;font-size:.95rem;color:#4a4037}
      .iv-observation-card p{margin:0;color:#675d55;line-height:1.6}
    </style>
    <section class="iv-shell">
      <div class="iv-card">
        <span class="iv-badge">${copy.badge}</span>
        <p class="iv-lead">${copy.summary}</p>
      </div>
      <div class="iv-grid">
        <div class="iv-card">
          <svg id="supplyDemandSvg" viewBox="0 0 900 430" role="img" aria-label="${escapeAttribute(title)}"></svg>
        </div>
        <aside class="iv-card">
          <h3 style="margin:0 0 12px">${copy.controls}</h3>
          <div class="iv-controls">
            <div class="iv-field">
              <label for="demandShift">${copy.demand}<output id="demandShiftValue">0</output></label>
              <input id="demandShift" type="range" min="-4" max="4" step="1" value="0" />
            </div>
            <div class="iv-field">
              <label for="supplyShift">${copy.supply}<output id="supplyShiftValue">0</output></label>
              <input id="supplyShift" type="range" min="-4" max="4" step="1" value="0" />
            </div>
            <div class="iv-field">
              <label for="marketPrice">${copy.marketPrice}<output id="marketPriceValue">8.0</output></label>
              <input id="marketPrice" type="range" min="3" max="14" step="0.5" value="8" />
            </div>
            <button id="marketReset" class="iv-button">${copy.reset}</button>
          </div>
          <div class="iv-stats">
            <div class="iv-stat"><span>${copy.equilibriumPrice}</span><strong id="equilibriumPriceValue">$8.0</strong></div>
            <div class="iv-stat"><span>${copy.equilibriumQuantity}</span><strong id="equilibriumQuantityValue">7.1</strong></div>
            <div class="iv-stat"><span>${copy.marketCondition}</span><strong id="marketConditionValue">Balanced</strong></div>
          </div>
        </aside>
      </div>
      <div class="iv-observation-card">
        <h3>${copy.observation}</h3>
        <p id="marketObservationText"></p>
      </div>
    </section>
    <script>
      const track = window.PrimoriaInteractive?.track || (() => {});
      const svg = document.getElementById('supplyDemandSvg');
      const controls = {
        demandShift: document.getElementById('demandShift'),
        supplyShift: document.getElementById('supplyShift'),
        marketPrice: document.getElementById('marketPrice')
      };
      const outputs = {
        demandShift: document.getElementById('demandShiftValue'),
        supplyShift: document.getElementById('supplyShiftValue'),
        marketPrice: document.getElementById('marketPriceValue'),
        equilibriumPrice: document.getElementById('equilibriumPriceValue'),
        equilibriumQuantity: document.getElementById('equilibriumQuantityValue'),
        marketCondition: document.getElementById('marketConditionValue')
      };
      const observation = document.getElementById('marketObservationText');
      const resetButton = document.getElementById('marketReset');

      function readState() {
        return {
          demandShift: Number(controls.demandShift.value),
          supplyShift: Number(controls.supplyShift.value),
          marketPrice: Number(controls.marketPrice.value)
        };
      }

      function demandPrice(quantity, state) {
        return 13 + state.demandShift - 0.7 * quantity;
      }

      function supplyPrice(quantity, state) {
        return 3 + state.supplyShift + 0.7 * quantity;
      }

      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }

      function render() {
        const state = readState();
        outputs.demandShift.textContent = String(state.demandShift);
        outputs.supplyShift.textContent = String(state.supplyShift);
        outputs.marketPrice.textContent = state.marketPrice.toFixed(1);
        const eqQuantity = clamp((10 + state.demandShift - state.supplyShift) / 1.4, 0.2, 12);
        const eqPrice = demandPrice(eqQuantity, state);
        const quantityDemanded = clamp((13 + state.demandShift - state.marketPrice) / 0.7, 0, 12);
        const quantitySupplied = clamp((state.marketPrice - 3 - state.supplyShift) / 0.7, 0, 12);
        const difference = quantityDemanded - quantitySupplied;
        const condition = Math.abs(difference) < 0.4 ? 'Balanced' : difference > 0 ? 'Shortage' : 'Surplus';
        outputs.equilibriumPrice.textContent = '$' + eqPrice.toFixed(1);
        outputs.equilibriumQuantity.textContent = eqQuantity.toFixed(1);
        outputs.marketCondition.textContent = condition;

        const xFromQuantity = (quantity) => 90 + (quantity / 12) * 640;
        const yFromPrice = (price) => 350 - (price / 16) * 260;
        const demandPath = [];
        const supplyPath = [];
        for (let quantity = 0; quantity <= 12; quantity += 0.25) {
          const dx = xFromQuantity(quantity);
          const dy = yFromPrice(demandPrice(quantity, state));
          const sx = xFromQuantity(quantity);
          const sy = yFromPrice(supplyPrice(quantity, state));
          demandPath.push((quantity === 0 ? 'M ' : 'L ') + dx + ' ' + dy);
          supplyPath.push((quantity === 0 ? 'M ' : 'L ') + sx + ' ' + sy);
        }

        const pieces = [];
        pieces.push('<rect x="18" y="18" width="864" height="394" rx="26" fill="#fbfdf9"></rect>');
        for (let grid = 0; grid <= 6; grid += 1) {
          const y = 90 + grid * 43;
          const label = (16 - (16 / 6) * grid).toFixed(0);
          pieces.push('<line x1="90" y1="' + y + '" x2="760" y2="' + y + '" stroke="#e3ecdf" stroke-width="1"></line>');
          pieces.push('<text x="76" y="' + (y + 4) + '" fill="#6d645c" font-size="12" text-anchor="end">$' + label + '</text>');
        }
        for (let grid = 0; grid <= 6; grid += 1) {
          const x = 90 + grid * 107;
          const quantity = (12 / 6) * grid;
          pieces.push('<line x1="' + x + '" y1="90" x2="' + x + '" y2="350" stroke="#edf4e9" stroke-width="1"></line>');
          pieces.push('<text x="' + x + '" y="372" fill="#6d645c" font-size="12" text-anchor="middle">' + quantity.toFixed(0) + '</text>');
        }
        pieces.push('<line x1="90" y1="90" x2="90" y2="350" stroke="#acbda6" stroke-width="2"></line>');
        pieces.push('<line x1="90" y1="350" x2="760" y2="350" stroke="#acbda6" stroke-width="2"></line>');
        pieces.push('<path d="' + demandPath.join(' ') + '" fill="none" stroke="#4d8ac8" stroke-width="4" stroke-linecap="round"></path>');
        pieces.push('<path d="' + supplyPath.join(' ') + '" fill="none" stroke="#63a267" stroke-width="4" stroke-linecap="round"></path>');
        const eqX = xFromQuantity(eqQuantity);
        const eqY = yFromPrice(eqPrice);
        pieces.push('<line x1="' + eqX + '" y1="' + eqY + '" x2="' + eqX + '" y2="350" stroke="rgba(102,89,60,.24)" stroke-dasharray="6 6" stroke-width="2"></line>');
        pieces.push('<line x1="90" y1="' + eqY + '" x2="' + eqX + '" y2="' + eqY + '" stroke="rgba(102,89,60,.24)" stroke-dasharray="6 6" stroke-width="2"></line>');
        pieces.push('<circle cx="' + eqX + '" cy="' + eqY + '" r="8" fill="#d79045"></circle>');
        pieces.push('<line x1="90" y1="' + yFromPrice(state.marketPrice) + '" x2="760" y2="' + yFromPrice(state.marketPrice) + '" stroke="#c46860" stroke-width="3" stroke-dasharray="8 7"></line>');
        pieces.push('<text x="780" y="' + (yFromPrice(state.marketPrice) + 4) + '" fill="#a14c48" font-size="14">' + '${copy.marketPrice}' + '</text>');
        pieces.push('<text x="' + (xFromQuantity(quantityDemanded) + 4) + '" y="' + (yFromPrice(state.marketPrice) - 12) + '" fill="#4d8ac8" font-size="13">Qd</text>');
        pieces.push('<text x="' + (xFromQuantity(quantitySupplied) + 4) + '" y="' + (yFromPrice(state.marketPrice) + 18) + '" fill="#63a267" font-size="13">Qs</text>');
        pieces.push('<text x="136" y="74" fill="#3c4c32" font-size="14">Price</text>');
        pieces.push('<text x="716" y="390" fill="#3c4c32" font-size="14">Quantity</text>');
        pieces.push('<text x="600" y="122" fill="#4d8ac8" font-size="15" font-weight="700">Demand</text>');
        pieces.push('<text x="600" y="148" fill="#63a267" font-size="15" font-weight="700">Supply</text>');
        svg.innerHTML = pieces.join('');

        if (condition === 'Balanced') {
          observation.textContent =
            'At a market price of $' + state.marketPrice.toFixed(1) +
            ', quantity demanded and supplied are close together, so the market is near equilibrium.';
        } else if (condition === 'Shortage') {
          observation.textContent =
            'Demand exceeds supply at this price, so buyers want about ' + Math.abs(difference).toFixed(1) +
            ' more units than producers offer. A higher price would push the market back toward equilibrium.';
        } else {
          observation.textContent =
            'Supply exceeds demand at this price, so producers offer about ' + Math.abs(difference).toFixed(1) +
            ' extra units. A lower price would help clear the surplus.';
        }
      }

      Object.values(controls).forEach((input) => {
        input.addEventListener('input', () => {
          render();
          track('market_shifted', { control: input.id, value: input.value });
        });
      });

      resetButton.addEventListener('click', () => {
        controls.demandShift.value = '0';
        controls.supplyShift.value = '0';
        controls.marketPrice.value = '8';
        render();
        track('market_reset', {});
      });

      render();
    </script>
  `;
}

function createWeatherClimateHtml(title: string, language: 'en' | 'zh-CN') {
  const copy =
    language === 'zh-CN'
      ? {
          badge: '天气与气候',
          summary: '比较某一天的天气和一个地区的长期气候基线。',
          region: '地区',
          season: '季节',
          temperature: '气温',
          precipitation: '降水',
          wind: '风速',
          observation: '观察',
          climateBaseline: '气候基线',
          reset: '重置',
          seasons: { spring: '春', summer: '夏', autumn: '秋', winter: '冬' },
        }
      : {
          badge: 'Weather and Climate',
          summary: 'Compare short-term weather conditions with a region’s long-term climate baseline.',
          region: 'Region',
          season: 'Season',
          temperature: 'Temperature',
          precipitation: 'Precipitation',
          wind: 'Wind',
          observation: 'Observation',
          climateBaseline: 'Climate Baseline',
          reset: 'Reset',
          seasons: { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' },
        };

  const climateBaselines = {
    tropical: { label: 'Tropical', avgTemp: 30, avgPrecip: 82, avgWind: 18, note: 'Hot and humid in most seasons.' },
    temperate: { label: 'Temperate', avgTemp: 17, avgPrecip: 48, avgWind: 14, note: 'Moderate temperatures with stronger seasonal change.' },
    polar: { label: 'Polar', avgTemp: -8, avgPrecip: 22, avgWind: 24, note: 'Cold temperatures and drier air dominate the year.' },
  };

  return `
    <style>
      .iv-shell{display:grid;gap:18px;padding:18px;color:#2f2a25}
      .iv-grid{display:grid;gap:18px}
      @media(min-width:980px){.iv-grid{grid-template-columns:minmax(0,1.4fr) minmax(300px,.9fr)}}
      .iv-card,.iv-observation-card{border:1px solid #e2d6c7;border-radius:22px;background:#fffdf9;box-shadow:0 12px 28px rgba(77,60,40,.08)}
      .iv-card{padding:18px}
      .iv-observation-card{padding:16px 18px}
      .iv-badge{display:inline-flex;align-items:center;border-radius:999px;background:#edf5ff;color:#335e9d;padding:6px 11px;font-size:.76rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
      .iv-lead{margin:10px 0 0;color:#675d55;line-height:1.65}
      .iv-button-row{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
      .iv-chip{border:1px solid #d7cec3;border-radius:999px;background:#fff;padding:8px 12px;color:#645950;font-weight:700;cursor:pointer}
      .iv-chip.is-active{background:#e9f2ff;border-color:#9fbbe1;color:#24446f}
      .iv-field{display:grid;gap:6px;margin-top:12px}
      .iv-field label{display:flex;justify-content:space-between;font-size:.87rem;font-weight:700;color:#4a4037}
      .iv-field input,.iv-field select{width:100%;accent-color:#4d7bc4;border:1px solid #ddd3c7;border-radius:12px;padding:10px 12px;background:#fffdf9}
      .iv-stats{display:grid;gap:10px;margin-top:14px}
      .iv-stat{border-radius:16px;background:#f7f4ef;padding:12px}
      .iv-stat span{display:block;color:#6e655d;font-size:.8rem;text-transform:uppercase;letter-spacing:.06em}
      .iv-stat strong{display:block;margin-top:5px;font-size:1.05rem;color:#2f2a25}
      .iv-button{margin-top:12px;border:0;border-radius:14px;padding:11px 14px;background:#4d7bc4;color:white;font-weight:700;cursor:pointer}
      svg{width:100%;height:auto;display:block}
      .iv-observation-card h3{margin:0 0 6px;font-size:.95rem;color:#4a4037}
      .iv-observation-card p{margin:0;color:#675d55;line-height:1.6}
    </style>
    <section class="iv-shell">
      <div class="iv-card">
        <span class="iv-badge">${copy.badge}</span>
        <p class="iv-lead">${copy.summary}</p>
      </div>
      <div class="iv-grid">
        <div class="iv-card">
          <svg id="weatherClimateSvg" viewBox="0 0 900 430" role="img" aria-label="${escapeAttribute(title)}"></svg>
        </div>
        <aside class="iv-card">
          <h3 style="margin:0">${copy.region}</h3>
          <div class="iv-button-row" id="regionButtons"></div>
          <div class="iv-field">
            <label for="weatherSeason">${copy.season}</label>
            <select id="weatherSeason">
              <option value="spring">${copy.seasons.spring}</option>
              <option value="summer">${copy.seasons.summer}</option>
              <option value="autumn">${copy.seasons.autumn}</option>
              <option value="winter">${copy.seasons.winter}</option>
            </select>
          </div>
          <div class="iv-field">
            <label for="weatherTemp">${copy.temperature}<output id="weatherTempValue">18°C</output></label>
            <input id="weatherTemp" type="range" min="-20" max="40" step="1" value="18" />
          </div>
          <div class="iv-field">
            <label for="weatherPrecip">${copy.precipitation}<output id="weatherPrecipValue">45%</output></label>
            <input id="weatherPrecip" type="range" min="0" max="100" step="5" value="45" />
          </div>
          <div class="iv-field">
            <label for="weatherWind">${copy.wind}<output id="weatherWindValue">14 km/h</output></label>
            <input id="weatherWind" type="range" min="0" max="40" step="2" value="14" />
          </div>
          <button id="weatherReset" class="iv-button">${copy.reset}</button>
          <div class="iv-stats">
            <div class="iv-stat"><span>${copy.climateBaseline}</span><strong id="climateBaselineLabel">Temperate</strong></div>
            <div class="iv-stat"><span>${copy.temperature}</span><strong id="climateTempLabel">17°C avg</strong></div>
            <div class="iv-stat"><span>${copy.precipitation}</span><strong id="climatePrecipLabel">48% avg</strong></div>
            <div class="iv-stat"><span>${copy.wind}</span><strong id="climateWindLabel">14 km/h avg</strong></div>
          </div>
        </aside>
      </div>
      <div class="iv-observation-card">
        <h3>${copy.observation}</h3>
        <p id="weatherObservationText"></p>
      </div>
    </section>
    <script>
      const track = window.PrimoriaInteractive?.track || (() => {});
      const baselines = ${JSON.stringify(climateBaselines)};
      const svg = document.getElementById('weatherClimateSvg');
      const regionButtons = document.getElementById('regionButtons');
      const seasonInput = document.getElementById('weatherSeason');
      const tempInput = document.getElementById('weatherTemp');
      const precipInput = document.getElementById('weatherPrecip');
      const windInput = document.getElementById('weatherWind');
      const tempValue = document.getElementById('weatherTempValue');
      const precipValue = document.getElementById('weatherPrecipValue');
      const windValue = document.getElementById('weatherWindValue');
      const baselineLabel = document.getElementById('climateBaselineLabel');
      const baselineTemp = document.getElementById('climateTempLabel');
      const baselinePrecip = document.getElementById('climatePrecipLabel');
      const baselineWind = document.getElementById('climateWindLabel');
      const observation = document.getElementById('weatherObservationText');
      const resetButton = document.getElementById('weatherReset');
      let region = 'temperate';

      function renderRegionButtons() {
        regionButtons.innerHTML = Object.entries(baselines).map(([key, baseline]) => {
          return '<button class="iv-chip' + (region === key ? ' is-active' : '') + '" data-region="' + key + '">' + baseline.label + '</button>';
        }).join('');
        regionButtons.querySelectorAll('[data-region]').forEach((button) => {
          button.addEventListener('click', () => {
            region = button.getAttribute('data-region');
            const base = baselines[region];
            tempInput.value = String(base.avgTemp);
            precipInput.value = String(base.avgPrecip);
            windInput.value = String(base.avgWind);
            render();
            track('weather_region_changed', { region: region });
          });
        });
      }

      function seasonTint(season) {
        if (season === 'summer') return { sky: '#ffe8b0', horizon: '#f6d39f' };
        if (season === 'winter') return { sky: '#dcecff', horizon: '#eef4fb' };
        if (season === 'autumn') return { sky: '#f8dfc3', horizon: '#ecd0b2' };
        return { sky: '#dff2ff', horizon: '#f3ead3' };
      }

      function render() {
        const base = baselines[region];
        const season = seasonInput.value;
        const temp = Number(tempInput.value);
        const precip = Number(precipInput.value);
        const wind = Number(windInput.value);
        const tint = seasonTint(season);
        tempValue.textContent = temp + '°C';
        precipValue.textContent = precip + '%';
        windValue.textContent = wind + ' km/h';
        baselineLabel.textContent = base.label;
        baselineTemp.textContent = base.avgTemp + '°C avg';
        baselinePrecip.textContent = base.avgPrecip + '% avg';
        baselineWind.textContent = base.avgWind + ' km/h avg';

        const pieces = [];
        pieces.push('<rect x="18" y="18" width="864" height="394" rx="26" fill="#fbfdff"></rect>');
        pieces.push('<rect x="48" y="58" width="804" height="220" rx="24" fill="' + tint.sky + '"></rect>');
        pieces.push('<rect x="48" y="210" width="804" height="68" rx="0" fill="' + tint.horizon + '"></rect>');
        const sunOpacity = precip < 65 ? 1 : 0.45;
        const sunX = region === 'polar' ? 170 : region === 'tropical' ? 220 : 190;
        pieces.push('<circle cx="' + sunX + '" cy="108" r="' + (28 + Math.max(0, temp) * 0.25) + '" fill="rgba(247,200,92,' + sunOpacity + ')"></circle>');
        const cloudCount = Math.max(1, Math.round(precip / 28));
        for (let index = 0; index < cloudCount; index += 1) {
          const cloudX = 250 + index * 118;
          const cloudY = 95 + (index % 2) * 30;
          pieces.push('<ellipse cx="' + cloudX + '" cy="' + cloudY + '" rx="44" ry="24" fill="rgba(255,255,255,0.92)"></ellipse>');
          pieces.push('<ellipse cx="' + (cloudX + 28) + '" cy="' + (cloudY + 6) + '" rx="36" ry="20" fill="rgba(255,255,255,0.92)"></ellipse>');
        }
        const rainDrops = Math.round(precip / 8);
        for (let index = 0; index < rainDrops; index += 1) {
          const x = 250 + (index % 10) * 46;
          const y = 160 + Math.floor(index / 10) * 22;
          pieces.push('<line x1="' + x + '" y1="' + y + '" x2="' + (x - 8) + '" y2="' + (y + 18) + '" stroke="#4d89c8" stroke-width="3" stroke-linecap="round"></line>');
        }
        const arrowCount = Math.max(1, Math.round(wind / 8));
        for (let index = 0; index < arrowCount; index += 1) {
          const y = 90 + index * 34;
          pieces.push('<path d="M 620 ' + y + ' C 650 ' + (y - 8) + ', 685 ' + (y + 8) + ', 730 ' + y + '" fill="none" stroke="#7aa5d8" stroke-width="4" stroke-linecap="round"></path>');
          pieces.push('<path d="M 724 ' + (y - 6) + ' L 738 ' + y + ' L 724 ' + (y + 6) + '" fill="none" stroke="#7aa5d8" stroke-width="4" stroke-linecap="round"></path>');
        }
        const tempBarHeight = 120 + ((temp + 20) / 60) * 120;
        pieces.push('<rect x="778" y="88" width="26" height="164" rx="12" fill="rgba(255,255,255,0.72)" stroke="#d6dfe9"></rect>');
        pieces.push('<rect x="782" y="' + (252 - tempBarHeight) + '" width="18" height="' + tempBarHeight + '" rx="9" fill="#e58a6c"></rect>');
        pieces.push('<text x="60" y="304" fill="#4d4137" font-size="15" font-weight="700">Today\'s weather</text>');
        pieces.push('<text x="60" y="330" fill="#665c53" font-size="14">' + base.note + '</text>');
        pieces.push('<text x="520" y="304" fill="#4d4137" font-size="15" font-weight="700">Climate baseline</text>');
        pieces.push('<text x="520" y="330" fill="#665c53" font-size="14">' + base.label + ' regions average around ' + base.avgTemp + '°C.</text>');
        svg.innerHTML = pieces.join('');

        const tempTrend = temp > base.avgTemp + 4 ? 'warmer' : temp < base.avgTemp - 4 ? 'cooler' : 'close to';
        const precipTrend = precip > base.avgPrecip + 12 ? 'wetter' : precip < base.avgPrecip - 12 ? 'drier' : 'close to';
        observation.textContent =
          'Compared with the ' + base.label.toLowerCase() + ' climate baseline, today is ' + tempTrend +
          ' normal and ' + precipTrend + ' average conditions. Wind at ' + wind +
          ' km/h helps show how short-term weather can shift even when the broader climate stays consistent.';
      }

      [seasonInput, tempInput, precipInput, windInput].forEach((input) => {
        input.addEventListener('input', () => {
          render();
          track('weather_control_changed', { control: input.id, value: input.value, region: region });
        });
      });

      resetButton.addEventListener('click', () => {
        region = 'temperate';
        seasonInput.value = 'spring';
        tempInput.value = String(baselines.temperate.avgTemp);
        precipInput.value = String(baselines.temperate.avgPrecip);
        windInput.value = String(baselines.temperate.avgWind);
        renderRegionButtons();
        render();
        track('weather_reset', {});
      });

      renderRegionButtons();
      render();
    </script>
  `;
}

function createHistoricalTimelineHtml(title: string, language: 'en' | 'zh-CN') {
  const copy =
    language === 'zh-CN'
      ? {
          badge: '历史时间线',
          summary: '通过缩放和筛选查看不同地区与主题的历史事件。',
          zoom: '缩放',
          region: '地区',
          theme: '主题',
          observation: '观察',
          details: '事件详情',
          themes: { all: '全部', science: '科学', politics: '政治', culture: '文化' },
          regions: { all: '全部', europe: '欧洲', asia: '亚洲', americas: '美洲' },
        }
      : {
          badge: 'Historical Timeline',
          summary: 'Zoom and filter a small set of embedded events to compare developments across history.',
          zoom: 'Zoom',
          region: 'Region',
          theme: 'Theme',
          observation: 'Observation',
          details: 'Event Details',
          themes: { all: 'All themes', science: 'Science', politics: 'Politics', culture: 'Culture' },
          regions: { all: 'All regions', europe: 'Europe', asia: 'Asia', americas: 'Americas' },
        };

  const events = [
    { id: 'printing', year: 1450, title: 'Printing Press', region: 'europe', theme: 'science', detail: 'Movable type accelerated the spread of books and ideas across Europe.' },
    { id: 'voyages', year: 1492, title: 'Atlantic Voyages', region: 'americas', theme: 'politics', detail: 'Ocean travel reshaped trade, migration, and empire building.' },
    { id: 'tokugawa', year: 1603, title: 'Tokugawa Shogunate', region: 'asia', theme: 'politics', detail: 'A long era of centralized rule brought stability and social order to Japan.' },
    { id: 'steam', year: 1769, title: 'Steam Engine', region: 'europe', theme: 'science', detail: 'Improved steam power helped launch industrial manufacturing.' },
    { id: 'independence', year: 1776, title: 'American Independence', region: 'americas', theme: 'politics', detail: 'A new republic emerged and influenced later independence movements.' },
    { id: 'restoration', year: 1868, title: 'Meiji Restoration', region: 'asia', theme: 'culture', detail: 'Rapid modernization transformed Japan’s institutions and economy.' },
    { id: 'radio', year: 1901, title: 'Wireless Radio', region: 'europe', theme: 'science', detail: 'Long-distance communication expanded dramatically with radio signals.' },
    { id: 'rights', year: 1964, title: 'Civil Rights Act', region: 'americas', theme: 'culture', detail: 'Civil rights legislation reshaped public life and legal protections in the United States.' }
  ];

  return `
    <style>
      .iv-shell{display:grid;gap:18px;padding:18px;color:#2f2a25}
      .iv-grid{display:grid;gap:18px}
      @media(min-width:980px){.iv-grid{grid-template-columns:minmax(0,1.45fr) minmax(300px,.85fr)}}
      .iv-card,.iv-observation-card{border:1px solid #e2d6c7;border-radius:22px;background:#fffdf9;box-shadow:0 12px 28px rgba(77,60,40,.08)}
      .iv-card{padding:18px}
      .iv-observation-card{padding:16px 18px}
      .iv-badge{display:inline-flex;align-items:center;border-radius:999px;background:#f6eefc;color:#7b519b;padding:6px 11px;font-size:.76rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
      .iv-lead{margin:10px 0 0;color:#675d55;line-height:1.65}
      .iv-button-row{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
      .iv-chip{border:1px solid #d7cec3;border-radius:999px;background:#fff;padding:8px 12px;color:#645950;font-weight:700;cursor:pointer}
      .iv-chip.is-active{background:#f3ebfb;border-color:#c9b1dd;color:#6e4592}
      .iv-field{display:grid;gap:6px;margin-top:12px}
      .iv-field label{display:flex;justify-content:space-between;font-size:.87rem;font-weight:700;color:#4a4037}
      .iv-field input,.iv-field select{width:100%;accent-color:#8a5ab6;border:1px solid #ddd3c7;border-radius:12px;padding:10px 12px;background:#fffdf9}
      .iv-detail{border-radius:18px;background:#f7f4ef;padding:14px;margin-top:14px}
      .iv-detail h3{margin:0 0 8px;font-size:1rem}
      .iv-detail p{margin:0;color:#675d55;line-height:1.6}
      .iv-scroll{overflow-x:auto;padding-bottom:6px}
      svg{display:block;height:auto}
      .iv-observation-card h3{margin:0 0 6px;font-size:.95rem;color:#4a4037}
      .iv-observation-card p{margin:0;color:#675d55;line-height:1.6}
    </style>
    <section class="iv-shell">
      <div class="iv-card">
        <span class="iv-badge">${copy.badge}</span>
        <p class="iv-lead">${copy.summary}</p>
      </div>
      <div class="iv-grid">
        <div class="iv-card">
          <div class="iv-scroll" id="timelineScroll">
            <svg id="historicalTimelineSvg" width="920" viewBox="0 0 920 340" role="img" aria-label="${escapeAttribute(title)}"></svg>
          </div>
        </div>
        <aside class="iv-card">
          <div class="iv-field">
            <label for="timelineZoom">${copy.zoom}<output id="timelineZoomValue">1.4x</output></label>
            <input id="timelineZoom" type="range" min="1" max="3" step="0.2" value="1.4" />
          </div>
          <h3 style="margin:16px 0 0">${copy.region}</h3>
          <div class="iv-button-row" id="timelineRegionButtons"></div>
          <div class="iv-field">
            <label for="timelineTheme">${copy.theme}</label>
            <select id="timelineTheme">
              <option value="all">${copy.themes.all}</option>
              <option value="science">${copy.themes.science}</option>
              <option value="politics">${copy.themes.politics}</option>
              <option value="culture">${copy.themes.culture}</option>
            </select>
          </div>
          <div class="iv-detail">
            <h3>${copy.details}</h3>
            <p id="timelineDetailTitle" style="font-weight:700;color:#2f2a25"></p>
            <p id="timelineDetailBody" style="margin-top:8px"></p>
          </div>
        </aside>
      </div>
      <div class="iv-observation-card">
        <h3>${copy.observation}</h3>
        <p id="timelineObservationText"></p>
      </div>
    </section>
    <script>
      const track = window.PrimoriaInteractive?.track || (() => {});
      const events = ${JSON.stringify(events)};
      const svg = document.getElementById('historicalTimelineSvg');
      const zoomInput = document.getElementById('timelineZoom');
      const zoomValue = document.getElementById('timelineZoomValue');
      const regionButtons = document.getElementById('timelineRegionButtons');
      const themeInput = document.getElementById('timelineTheme');
      const detailTitle = document.getElementById('timelineDetailTitle');
      const detailBody = document.getElementById('timelineDetailBody');
      const observation = document.getElementById('timelineObservationText');
      let region = 'all';
      let selectedId = events[0].id;

      function renderRegionButtons() {
        const regionLabels = ${JSON.stringify(copy.regions)};
        regionButtons.innerHTML = Object.entries(regionLabels).map(([key, label]) => {
          return '<button class="iv-chip' + (region === key ? ' is-active' : '') + '" data-region="' + key + '">' + label + '</button>';
        }).join('');
        regionButtons.querySelectorAll('[data-region]').forEach((button) => {
          button.addEventListener('click', () => {
            region = button.getAttribute('data-region');
            renderRegionButtons();
            render();
            track('timeline_filter_changed', { region: region, theme: themeInput.value });
          });
        });
      }

      function filteredEvents() {
        return events.filter((event) => {
          if (region !== 'all' && event.region !== region) return false;
          if (themeInput.value !== 'all' && event.theme !== themeInput.value) return false;
          return true;
        });
      }

      function ensureSelection(list) {
        if (!list.some((event) => event.id === selectedId)) {
          selectedId = list[0]?.id || events[0].id;
        }
      }

      function render() {
        const zoom = Number(zoomInput.value);
        zoomValue.textContent = zoom.toFixed(1) + 'x';
        const list = filteredEvents();
        ensureSelection(list);
        const width = Math.round(920 * zoom);
        svg.setAttribute('width', String(width));
        const minYear = list[0]?.year ?? events[0].year;
        const maxYear = list[list.length - 1]?.year ?? events[events.length - 1].year;
        const span = Math.max(100, maxYear - minYear);
        const xFromYear = (year) => 110 + ((year - minYear) / span) * (width - 220);
        const pieces = [];
        pieces.push('<rect x="18" y="18" width="' + (width - 36) + '" height="304" rx="26" fill="#fbfdff"></rect>');
        pieces.push('<rect x="60" y="78" width="' + ((width - 120) / 3) + '" height="36" rx="18" fill="#f5effb"></rect>');
        pieces.push('<rect x="' + (60 + (width - 120) / 3) + '" y="78" width="' + ((width - 120) / 3) + '" height="36" rx="18" fill="#eef4ff"></rect>');
        pieces.push('<rect x="' + (60 + ((width - 120) / 3) * 2) + '" y="78" width="' + ((width - 120) / 3) + '" height="36" rx="18" fill="#edf7ef"></rect>');
        pieces.push('<text x="' + (60 + (width - 120) / 6) + '" y="101" fill="#7a5899" font-size="14" text-anchor="middle">Early modern</text>');
        pieces.push('<text x="' + (60 + (width - 120) / 2) + '" y="101" fill="#4d6e98" font-size="14" text-anchor="middle">Industrial era</text>');
        pieces.push('<text x="' + (60 + ((width - 120) * 5) / 6) + '" y="101" fill="#4f7f52" font-size="14" text-anchor="middle">Modern world</text>');
        pieces.push('<line x1="90" y1="188" x2="' + (width - 90) + '" y2="188" stroke="#bcaecf" stroke-width="4"></line>');
        list.forEach((event, index) => {
          const x = xFromYear(event.year);
          const selected = event.id === selectedId;
          const y = index % 2 === 0 ? 132 : 244;
          const stemTop = index % 2 === 0 ? 154 : 188;
          const stemBottom = index % 2 === 0 ? 188 : 222;
          pieces.push('<line x1="' + x + '" y1="' + stemTop + '" x2="' + x + '" y2="' + stemBottom + '" stroke="' + (selected ? '#8a5ab6' : '#c6b7d4') + '" stroke-width="3"></line>');
          pieces.push('<circle cx="' + x + '" cy="188" r="' + (selected ? '10' : '8') + '" fill="' + (selected ? '#8a5ab6' : '#c6b7d4') + '" data-event-id="' + event.id + '" style="cursor:pointer"></circle>');
          pieces.push('<text x="' + x + '" y="' + y + '" fill="#2f2a25" font-size="14" font-weight="' + (selected ? '700' : '600') + '" text-anchor="middle">' + event.title + '</text>');
          pieces.push('<text x="' + x + '" y="' + (y + 18) + '" fill="#756a61" font-size="12" text-anchor="middle">' + event.year + '</text>');
        });
        svg.innerHTML = pieces.join('');
        svg.querySelectorAll('[data-event-id]').forEach((node) => {
          node.addEventListener('click', () => {
            selectedId = node.getAttribute('data-event-id');
            render();
            track('timeline_event_selected', { eventId: selectedId, region: region, theme: themeInput.value });
          });
        });

        const selected = list.find((event) => event.id === selectedId) || list[0] || events[0];
        const peers = list.filter((event) => event.id !== selected.id).slice(0, 2);
        detailTitle.textContent = selected.title + ' (' + selected.year + ')';
        detailBody.textContent = selected.detail;
        if (peers.length === 0) {
          observation.textContent = selected.title + ' stands alone in the current filter, which makes it easier to focus on one development.';
        } else {
          observation.textContent =
            selected.title + ' can be compared with ' + peers.map((event) => event.title).join(' and ') +
            ' to see how developments in different regions or themes overlapped over time.';
        }
      }

      zoomInput.addEventListener('input', () => {
        render();
        track('timeline_zoom_changed', { zoom: zoomInput.value });
      });
      themeInput.addEventListener('change', () => {
        render();
        track('timeline_filter_changed', { region: region, theme: themeInput.value });
      });

      renderRegionButtons();
      render();
    </script>
  `;
}

export function createInteractiveVisualFallback({
  prompt,
  template,
  experienceMode,
  language = 'en',
}: InteractiveVisualGenerationRequest): InteractiveVisualArtifact {
  const resolvedMode = inferInteractiveVisualMode(prompt, experienceMode ?? null);
  const inferredTemplate = inferInteractiveVisualTemplate(prompt, template);
  const resolvedTemplate =
    resolvedMode === 'scenario' || resolvedMode === 'story'
      ? 'generic'
      : inferredTemplate === 'generic' && resolvedMode === 'graph'
        ? 'wave'
        : inferredTemplate;
  const title =
    resolvedTemplate === 'wave' || resolvedTemplate === 'wave-sound'
      ? language === 'zh-CN'
        ? resolvedTemplate === 'wave-sound'
          ? '波与声音可视化'
          : '交互式余弦波探索器'
        : resolvedTemplate === 'wave-sound'
          ? 'Wave and Sound Visualization'
          : 'Interactive Cosine Curve Explorer'
      : resolvedTemplate === 'pendulum'
        ? language === 'zh-CN'
          ? '交互式单摆实验'
          : 'Interactive Pendulum Lab'
        : resolvedTemplate === 'projectile'
          ? language === 'zh-CN'
            ? '交互式抛体运动实验'
            : 'Interactive Projectile Lab'
          : resolvedTemplate === 'collision'
          ? language === 'zh-CN'
            ? '力与作用反作用探索器'
            : 'Force Pair Explorer'
          : resolvedTemplate === 'probability-dice'
            ? language === 'zh-CN'
              ? '概率与骰子模拟器'
              : 'Probability and Dice Simulator'
            : resolvedTemplate === 'programming-logic-flow'
              ? language === 'zh-CN'
                ? '程序逻辑流程'
                : 'Programming Logic Flow'
              : resolvedTemplate === 'supply-demand'
                ? language === 'zh-CN'
                  ? '供给与需求经济学'
                  : 'Supply and Demand Economics'
                : resolvedTemplate === 'weather-climate'
                  ? language === 'zh-CN'
                    ? '天气与气候系统'
                    : 'Weather and Climate Systems'
                  : resolvedTemplate === 'historical-timeline'
                    ? language === 'zh-CN'
                      ? '历史时间线探索器'
                      : 'Historical Timeline Explorer'
            : summarizePrompt(prompt, language === 'zh-CN' ? 'AI 交互元素' : 'AI Interactive Element');

  const description =
    language === 'zh-CN'
      ? '这是一个可离线运行的交互式 HTML5 学习组件，可用于探索概念变化。'
      : 'This is a self-contained offline HTML5 learning component designed to let learners manipulate the concept live.';

  const generatedHtml =
    resolvedTemplate === 'wave-sound'
      ? createWaveSoundHtml(title, language)
      : resolvedTemplate === 'programming-logic-flow'
        ? createProgrammingLogicFlowHtml(title, language)
        : resolvedTemplate === 'supply-demand'
          ? createSupplyDemandHtml(title, language)
          : resolvedTemplate === 'weather-climate'
            ? createWeatherClimateHtml(title, language)
            : resolvedTemplate === 'historical-timeline'
              ? createHistoricalTimelineHtml(title, language)
      : resolvedMode === 'graph' || resolvedTemplate === 'wave'
      ? createWaveExplorerHtml(title, prompt, language)
      : resolvedMode === 'simulation' && resolvedTemplate === 'pendulum'
        ? createPendulumHtml(title, prompt, language)
        : resolvedMode === 'simulation' && resolvedTemplate === 'projectile'
          ? createProjectileHtml(title, prompt, language)
          : resolvedTemplate === 'probability-dice'
            ? createProbabilityDiceHtml(title, language)
          : createConceptExplorerHtml(title, prompt, language);

  return {
    version: '1',
    engine: 'fallback-html5',
    template: resolvedTemplate,
    experienceMode: resolvedMode,
    title,
    description,
    aiPrompt: prompt,
    generatedHtml,
    themeTone:
      resolvedTemplate === 'wave' || resolvedTemplate === 'wave-sound'
        ? 'sky'
        : resolvedTemplate === 'pendulum'
          ? 'sand'
          : resolvedTemplate === 'historical-timeline'
            ? 'plum'
            : 'sage',
  };
}
