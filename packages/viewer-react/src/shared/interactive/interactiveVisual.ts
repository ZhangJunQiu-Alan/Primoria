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
  return 'generic';
}

export function shouldGenerateInteractiveVisualForPrompt(prompt: string) {
  const normalized = prompt.toLowerCase();
  return /(interactive|animate|animated|visual|visualise|visualize|simulation|simulator|graph|curve|wave|cosine|sine|trig|pendulum|projectile|collision|force|newton|orbit|diagram)/i.test(
    normalized,
  );
}

export function validateOfflineInteractiveHtml(html: string) {
  const normalized = stripMarkdownFences(html);
  if (!normalized) {
    return 'Interactive visual HTML is empty.';
  }

  if (/<script[^>]+src\s*=/i.test(normalized)) {
    return 'Interactive visuals must use inline JavaScript only.';
  }
  if (/<(iframe|object|embed)\b/i.test(normalized)) {
    return 'Interactive visuals cannot embed external frames or objects.';
  }
  if (/\bhttps?:\/\//i.test(normalized)) {
    return 'Interactive visuals must run offline and cannot reference external URLs.';
  }
  if (/\bfetch\s*\(/i.test(normalized) || /\bXMLHttpRequest\b/i.test(normalized) || /\bWebSocket\b/i.test(normalized)) {
    return 'Interactive visuals must run offline and cannot request network resources.';
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
        function track(eventName, payload) {
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
  };
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

export function createInteractiveVisualFallback({
  prompt,
  template,
  experienceMode,
  language = 'en',
}: InteractiveVisualGenerationRequest): InteractiveVisualArtifact {
  const resolvedMode = inferInteractiveVisualMode(prompt, experienceMode ?? null);
  const resolvedTemplate =
    resolvedMode === 'graph'
      ? 'wave'
      : resolvedMode === 'scenario' || resolvedMode === 'story'
        ? 'generic'
        : inferInteractiveVisualTemplate(prompt, template);
  const title =
    resolvedTemplate === 'wave'
      ? language === 'zh-CN'
        ? '交互式余弦波探索器'
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
            : summarizePrompt(prompt, language === 'zh-CN' ? 'AI 交互元素' : 'AI Interactive Element');

  const description =
    language === 'zh-CN'
      ? '这是一个可离线运行的交互式 HTML5 学习组件，可用于探索概念变化。'
      : 'This is a self-contained offline HTML5 learning component designed to let learners manipulate the concept live.';

  const generatedHtml =
    resolvedMode === 'graph' || resolvedTemplate === 'wave'
      ? createWaveExplorerHtml(title, prompt, language)
      : resolvedMode === 'simulation' && resolvedTemplate === 'pendulum'
        ? createPendulumHtml(title, prompt, language)
        : resolvedMode === 'simulation' && resolvedTemplate === 'projectile'
          ? createProjectileHtml(title, prompt, language)
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
    themeTone: resolvedTemplate === 'wave' ? 'sky' : resolvedTemplate === 'pendulum' ? 'sand' : 'sage',
  };
}
