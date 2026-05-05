export type TutorInteractiveVisualPayload = {
  title: string;
  description: string;
  generatedHtml: string;
  template?: string;
  experienceMode?: 'simulation' | 'graph' | 'scenario' | 'story';
  themeTone?: string;
};

const INTERACTIVE_VISUAL_FENCE = 'primoria-interactive-visual';

function escapeForScript(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function buildTrigExplorerHtml(language: 'zh-CN' | 'en') {
  const copy =
    language === 'zh-CN'
      ? {
          heading: '正弦与余弦图像探索器',
          objective: '拖动角度，观察单位圆上的点如何同时对应 sin(theta) 和 cos(theta) 的数值。',
          angle: '角度',
          play: '播放',
          pause: '暂停',
          unitCircle: '单位圆',
          graph: '函数图像',
          sine: 'sin(theta)',
          cosine: 'cos(theta)',
          explanation: '在 45° 时，sin(theta) 与 cos(theta) 相等，因为单位圆点的水平与垂直分量一样大。',
          explanationHighSin:
            '现在点更靠近圆的上方，所以 sin(theta) 比 cos(theta) 更大。',
          explanationHighCos:
            '现在点更靠近圆的右侧，所以 cos(theta) 比 sin(theta) 更大。',
          explanationNegativeCos:
            '进入第二或第三象限后，cos(theta) 变成负值，因为 x 坐标移到 y 轴左侧。',
          explanationNegativeSin:
            '进入第三或第四象限后，sin(theta) 变成负值，因为 y 坐标落到 x 轴下方。',
          snapLabel: '跳到关键角',
        }
      : {
          heading: 'Sine and cosine graph explorer',
          objective: 'Drag the angle to see how one point on the unit circle controls both sin(theta) and cos(theta).',
          angle: 'Angle',
          play: 'Play',
          pause: 'Pause',
          unitCircle: 'Unit circle',
          graph: 'Function graph',
          sine: 'sin(theta)',
          cosine: 'cos(theta)',
          explanation: 'At 45°, sin(theta) and cos(theta) are equal because the point has matching vertical and horizontal components.',
          explanationHighSin:
            'The point is higher than it is wide here, so sin(theta) is larger than cos(theta).',
          explanationHighCos:
            'The point is wider than it is high here, so cos(theta) is larger than sin(theta).',
          explanationNegativeCos:
            'Cos(theta) turns negative in quadrants II and III because the x-value moves left of the y-axis.',
          explanationNegativeSin:
            'Sin(theta) turns negative in quadrants III and IV because the y-value drops below the x-axis.',
          snapLabel: 'Jump to key angles',
        };

  return `
<style>
  :root {
    color-scheme: light;
    --bg: #f5efe6;
    --panel: rgba(255, 252, 247, 0.94);
    --border: rgba(141, 124, 105, 0.18);
    --text: #3d342a;
    --muted: #7f7267;
    --sage: #6f9a77;
    --sage-soft: #dfeee0;
    --amber: #c78e4d;
    --rose: #ce6d6b;
    --shadow: 0 18px 32px rgba(90, 70, 50, 0.12);
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    min-height: 100vh;
    font-family: Inter, "Segoe UI", sans-serif;
    background:
      radial-gradient(circle at top left, rgba(162, 196, 168, 0.24), transparent 32%),
      linear-gradient(180deg, #f7f2ea 0%, #efe6d9 100%);
    color: var(--text);
  }

  .pv-root {
    display: grid;
    gap: 18px;
    min-height: 100vh;
    padding: 20px;
  }

  .pv-header,
  .pv-panel,
  .pv-controls {
    border: 1px solid var(--border);
    background: var(--panel);
    border-radius: 24px;
    box-shadow: var(--shadow);
  }

  .pv-header {
    padding: 20px 22px;
  }

  .pv-header h1 {
    margin: 0;
    font-size: clamp(1.7rem, 2.5vw, 2.3rem);
    font-family: "Cormorant Garamond", Georgia, serif;
    line-height: 0.95;
  }

  .pv-header p {
    margin: 12px 0 0;
    color: var(--muted);
    font-size: 0.98rem;
    line-height: 1.6;
  }

  .pv-stage {
    display: grid;
    gap: 18px;
    grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
  }

  .pv-panel {
    padding: 18px;
  }

  .pv-panel h2 {
    margin: 0 0 12px;
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .pv-panel svg {
    display: block;
    width: 100%;
    height: auto;
  }

  .pv-controls {
    display: grid;
    gap: 14px;
    padding: 18px;
  }

  .pv-controls-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .pv-angle {
    font-size: 1rem;
    font-weight: 800;
  }

  .pv-angle span {
    color: var(--sage);
  }

  .pv-slider {
    width: 100%;
    accent-color: var(--sage);
  }

  .pv-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .pv-actions button {
    border: 1px solid rgba(111, 154, 119, 0.22);
    background: rgba(223, 238, 224, 0.9);
    color: #517259;
    border-radius: 999px;
    padding: 10px 14px;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: transform 160ms ease, filter 160ms ease;
  }

  .pv-actions button:hover {
    transform: translateY(-1px);
    filter: brightness(1.02);
  }

  .pv-readout {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .pv-pill {
    border-radius: 18px;
    padding: 12px 14px;
    background: rgba(255, 252, 247, 0.96);
    border: 1px solid var(--border);
  }

  .pv-pill-label {
    display: block;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .pv-pill-value {
    display: block;
    margin-top: 6px;
    font-size: 1.05rem;
    font-weight: 800;
  }

  .pv-note {
    margin: 0;
    border-radius: 18px;
    background: rgba(255, 252, 247, 0.96);
    border: 1px solid var(--border);
    padding: 14px 16px;
    color: var(--muted);
    line-height: 1.65;
  }

  .graph-line-sin {
    stroke: var(--sage);
    stroke-width: 4;
    fill: none;
  }

  .graph-line-cos {
    stroke: var(--amber);
    stroke-width: 4;
    fill: none;
  }

  .graph-axis,
  .circle-axis {
    stroke: rgba(127, 114, 103, 0.4);
    stroke-width: 2;
  }

  .graph-guide,
  .circle-guide {
    stroke-dasharray: 7 7;
    stroke: rgba(127, 114, 103, 0.45);
    stroke-width: 2;
  }

  .legend {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 12px;
    color: var(--muted);
    font-size: 0.9rem;
    font-weight: 700;
  }

  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .legend i {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 999px;
  }

  @media (max-width: 860px) {
    .pv-stage {
      grid-template-columns: 1fr;
    }

    .pv-readout {
      grid-template-columns: 1fr;
    }
  }
</style>

<div class="pv-root">
  <section class="pv-header">
    <h1>${copy.heading}</h1>
    <p>${copy.objective}</p>
    <div class="legend">
      <span><i style="background: var(--sage);"></i>${copy.sine}</span>
      <span><i style="background: var(--amber);"></i>${copy.cosine}</span>
    </div>
  </section>

  <section class="pv-stage">
    <article class="pv-panel">
      <h2>${copy.unitCircle}</h2>
      <svg id="circleSvg" viewBox="0 0 260 260" aria-label="${copy.unitCircle}">
        <line class="circle-axis" x1="20" y1="130" x2="240" y2="130"></line>
        <line class="circle-axis" x1="130" y1="20" x2="130" y2="240"></line>
        <circle cx="130" cy="130" r="86" fill="rgba(223,238,224,0.42)" stroke="rgba(111,154,119,0.34)" stroke-width="3"></circle>
        <line id="radiusLine" x1="130" y1="130" x2="216" y2="130" stroke="var(--sage)" stroke-width="4" stroke-linecap="round"></line>
        <line id="cosGuide" class="circle-guide" x1="216" y1="130" x2="216" y2="130"></line>
        <line id="sinGuide" class="circle-guide" x1="130" y1="130" x2="216" y2="130"></line>
        <circle id="circlePoint" cx="216" cy="130" r="8" fill="var(--rose)"></circle>
        <text x="226" y="126" fill="var(--muted)" font-size="12">1</text>
        <text x="116" y="32" fill="var(--muted)" font-size="12">1</text>
        <text x="16" y="126" fill="var(--muted)" font-size="12">-1</text>
        <text x="114" y="252" fill="var(--muted)" font-size="12">-1</text>
        <text id="thetaLabel" x="146" y="148" fill="var(--text)" font-size="14" font-weight="700">0°</text>
      </svg>
    </article>

    <article class="pv-panel">
      <h2>${copy.graph}</h2>
      <svg id="graphSvg" viewBox="0 0 660 300" aria-label="${copy.graph}">
        <line class="graph-axis" x1="40" y1="150" x2="620" y2="150"></line>
        <line class="graph-axis" x1="40" y1="24" x2="40" y2="276"></line>
        <path id="sinPath" class="graph-line-sin"></path>
        <path id="cosPath" class="graph-line-cos"></path>
        <line id="thetaGuide" class="graph-guide" x1="40" y1="24" x2="40" y2="276"></line>
        <circle id="sinPoint" r="7" fill="var(--sage)"></circle>
        <circle id="cosPoint" r="7" fill="var(--amber)"></circle>
        <text x="628" y="154" fill="var(--muted)" font-size="12">360°</text>
        <text x="8" y="30" fill="var(--muted)" font-size="12">1</text>
        <text x="8" y="154" fill="var(--muted)" font-size="12">0</text>
        <text x="4" y="280" fill="var(--muted)" font-size="12">-1</text>
      </svg>
    </article>
  </section>

  <section class="pv-controls">
    <div class="pv-controls-top">
      <div class="pv-angle">${copy.angle}: <span id="angleReadout">45°</span></div>
      <div class="pv-actions">
        <button id="playButton" type="button">${copy.play}</button>
      </div>
    </div>

    <input id="angleSlider" class="pv-slider" type="range" min="0" max="360" value="45" />

    <div class="pv-actions" aria-label="${copy.snapLabel}">
      <button type="button" data-angle="0">0°</button>
      <button type="button" data-angle="45">45°</button>
      <button type="button" data-angle="90">90°</button>
      <button type="button" data-angle="180">180°</button>
      <button type="button" data-angle="270">270°</button>
    </div>

    <div class="pv-readout">
      <div class="pv-pill">
        <span class="pv-pill-label">${copy.angle}</span>
        <span class="pv-pill-value" id="angleValue">45°</span>
      </div>
      <div class="pv-pill">
        <span class="pv-pill-label">${copy.sine}</span>
        <span class="pv-pill-value" id="sinValue">0.707</span>
      </div>
      <div class="pv-pill">
        <span class="pv-pill-label">${copy.cosine}</span>
        <span class="pv-pill-value" id="cosValue">0.707</span>
      </div>
    </div>

    <p class="pv-note" id="feedback">${copy.explanation}</p>
  </section>
</div>

<script>
  (() => {
    const labels = {
      play: "${escapeForScript(copy.play)}",
      pause: "${escapeForScript(copy.pause)}",
      equal: "${escapeForScript(copy.explanation)}",
      highSin: "${escapeForScript(copy.explanationHighSin)}",
      highCos: "${escapeForScript(copy.explanationHighCos)}",
      negativeCos: "${escapeForScript(copy.explanationNegativeCos)}",
      negativeSin: "${escapeForScript(copy.explanationNegativeSin)}"
    };

    const slider = document.getElementById('angleSlider');
    const playButton = document.getElementById('playButton');
    const angleReadout = document.getElementById('angleReadout');
    const angleValue = document.getElementById('angleValue');
    const sinValue = document.getElementById('sinValue');
    const cosValue = document.getElementById('cosValue');
    const feedback = document.getElementById('feedback');
    const circlePoint = document.getElementById('circlePoint');
    const radiusLine = document.getElementById('radiusLine');
    const cosGuide = document.getElementById('cosGuide');
    const sinGuide = document.getElementById('sinGuide');
    const thetaLabel = document.getElementById('thetaLabel');
    const thetaGuide = document.getElementById('thetaGuide');
    const sinPath = document.getElementById('sinPath');
    const cosPath = document.getElementById('cosPath');
    const sinPoint = document.getElementById('sinPoint');
    const cosPoint = document.getElementById('cosPoint');
    const centerX = 130;
    const centerY = 130;
    const radius = 86;
    const graph = { left: 40, right: 620, top: 24, bottom: 276, zeroY: 150 };
    let isPlaying = false;
    let rafId = 0;

    function track(eventName, payload) {
      if (window.PrimoriaInteractive && typeof window.PrimoriaInteractive.track === 'function') {
        window.PrimoriaInteractive.track(eventName, payload);
      }
    }

    function xForAngle(angle) {
      return graph.left + ((graph.right - graph.left) * angle) / 360;
    }

    function yForValue(value) {
      return graph.zeroY - value * 108;
    }

    function buildCurve(fn) {
      const points = [];
      for (let angle = 0; angle <= 360; angle += 4) {
        const radians = (angle * Math.PI) / 180;
        points.push(\`\${angle === 0 ? 'M' : 'L'} \${xForAngle(angle).toFixed(2)} \${yForValue(fn(radians)).toFixed(2)}\`);
      }
      return points.join(' ');
    }

    function explanationFor(angle, sinTheta, cosTheta) {
      const normalized = ((angle % 360) + 360) % 360;
      if (Math.abs(sinTheta - cosTheta) < 0.06) {
        return labels.equal;
      }
      if (normalized > 90 && normalized < 270 && cosTheta < 0) {
        return labels.negativeCos;
      }
      if (normalized > 180 && normalized < 360 && sinTheta < 0) {
        return labels.negativeSin;
      }
      return sinTheta > cosTheta ? labels.highSin : labels.highCos;
    }

    function update(angle, source) {
      const radians = (angle * Math.PI) / 180;
      const sinTheta = Math.sin(radians);
      const cosTheta = Math.cos(radians);
      const pointX = centerX + radius * cosTheta;
      const pointY = centerY - radius * sinTheta;
      const graphX = xForAngle(angle);
      const sinY = yForValue(sinTheta);
      const cosY = yForValue(cosTheta);

      circlePoint.setAttribute('cx', pointX.toFixed(2));
      circlePoint.setAttribute('cy', pointY.toFixed(2));
      radiusLine.setAttribute('x2', pointX.toFixed(2));
      radiusLine.setAttribute('y2', pointY.toFixed(2));
      cosGuide.setAttribute('x1', pointX.toFixed(2));
      cosGuide.setAttribute('y1', centerY.toFixed(2));
      cosGuide.setAttribute('x2', pointX.toFixed(2));
      cosGuide.setAttribute('y2', pointY.toFixed(2));
      sinGuide.setAttribute('x1', centerX.toFixed(2));
      sinGuide.setAttribute('y1', pointY.toFixed(2));
      sinGuide.setAttribute('x2', pointX.toFixed(2));
      sinGuide.setAttribute('y2', pointY.toFixed(2));
      thetaLabel.textContent = \`\${Math.round(angle)}°\`;
      thetaLabel.setAttribute('x', (centerX + 16).toFixed(2));
      thetaLabel.setAttribute('y', (centerY + 18).toFixed(2));
      thetaGuide.setAttribute('x1', graphX.toFixed(2));
      thetaGuide.setAttribute('x2', graphX.toFixed(2));
      sinPoint.setAttribute('cx', graphX.toFixed(2));
      sinPoint.setAttribute('cy', sinY.toFixed(2));
      cosPoint.setAttribute('cx', graphX.toFixed(2));
      cosPoint.setAttribute('cy', cosY.toFixed(2));

      const angleLabel = \`\${Math.round(angle)}°\`;
      angleReadout.textContent = angleLabel;
      angleValue.textContent = angleLabel;
      sinValue.textContent = sinTheta.toFixed(3);
      cosValue.textContent = cosTheta.toFixed(3);
      feedback.textContent = explanationFor(angle, sinTheta, cosTheta);

      if (source) {
        track('interactive_visual_interaction', {
          source,
          angle: Math.round(angle),
          sin: Number(sinTheta.toFixed(4)),
          cos: Number(cosTheta.toFixed(4))
        });
      }
    }

    function setPlaying(nextValue) {
      isPlaying = nextValue;
      playButton.textContent = nextValue ? labels.pause : labels.play;
      track('interactive_visual_play_toggle', { playing: nextValue });
      if (!nextValue) {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
        return;
      }
      const tick = () => {
        const nextAngle = (Number(slider.value) + 1.2) % 361;
        slider.value = String(nextAngle);
        update(nextAngle);
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }

    sinPath.setAttribute('d', buildCurve(Math.sin));
    cosPath.setAttribute('d', buildCurve(Math.cos));
    update(Number(slider.value));

    slider.addEventListener('input', () => update(Number(slider.value), 'slider'));
    playButton.addEventListener('click', () => setPlaying(!isPlaying));
    document.querySelectorAll('[data-angle]').forEach((button) => {
      button.addEventListener('click', () => {
        const nextAngle = Number(button.getAttribute('data-angle') || '0');
        slider.value = String(nextAngle);
        update(nextAngle, 'preset');
      });
    });
  })();
</script>
`.trim();
}

export function looksLikeInteractiveVisualRequest(prompt: string) {
  const normalized = prompt.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const visualIntent =
    /(interactive|animated|animation|visual|graph|plot|chart|simulation|explainer)/i.test(normalized);
  const trigTopic = /\b(sin|sine|cos|cosine|trig|trigonometry)\b/i.test(normalized);
  return visualIntent && trigTopic;
}

export function containsTutorInteractiveVisual(text: string) {
  return text.includes(`\`\`\`${INTERACTIVE_VISUAL_FENCE}`);
}

export function serializeTutorInteractiveVisual(payload: TutorInteractiveVisualPayload) {
  return `\`\`\`${INTERACTIVE_VISUAL_FENCE}\n${JSON.stringify(payload)}\n\`\`\``;
}

export function parseTutorInteractiveVisual(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    if (typeof record.title !== 'string' || typeof record.description !== 'string' || typeof record.generatedHtml !== 'string') {
      return null;
    }
    return {
      title: record.title,
      description: record.description,
      generatedHtml: record.generatedHtml,
      template: typeof record.template === 'string' ? record.template : undefined,
      experienceMode:
        record.experienceMode === 'simulation' ||
        record.experienceMode === 'graph' ||
        record.experienceMode === 'scenario' ||
        record.experienceMode === 'story'
          ? record.experienceMode
          : undefined,
      themeTone: typeof record.themeTone === 'string' ? record.themeTone : undefined,
    } satisfies TutorInteractiveVisualPayload;
  } catch {
    return null;
  }
}

export function buildLocalInteractiveVisualReply(prompt: string, language: 'zh-CN' | 'en') {
  if (!looksLikeInteractiveVisualRequest(prompt)) {
    return null;
  }

  const payload: TutorInteractiveVisualPayload = {
    title: language === 'zh-CN' ? '正弦与余弦交互图' : 'Interactive sine and cosine graph',
    description:
      language === 'zh-CN'
        ? '拖动角度，观察单位圆上的点如何映射到 sin(theta) 与 cos(theta) 曲线。'
        : 'Move the angle slider to see how the unit-circle point maps onto the sine and cosine curves.',
    template: 'unit-circle-sine-cosine',
    experienceMode: 'graph',
    themeTone: 'botanical-sage',
    generatedHtml: buildTrigExplorerHtml(language),
  };

  const intro =
    language === 'zh-CN'
      ? '下面是一个可直接操作的图像。'
      : 'Here is an interactive graph you can explore right away.';
  const outro =
    language === 'zh-CN'
      ? '拖动角度滑块，比较单位圆上的位置与两条曲线的数值变化。重点观察 45°、90°、180° 和 270°。'
      : 'Drag the angle slider to compare the unit-circle point with the two curves. Pay special attention to 45°, 90°, 180°, and 270°.';

  return `${intro}\n\n${serializeTutorInteractiveVisual(payload)}\n\n${outro}`;
}

export function getInteractiveVisualFenceName() {
  return INTERACTIVE_VISUAL_FENCE;
}
