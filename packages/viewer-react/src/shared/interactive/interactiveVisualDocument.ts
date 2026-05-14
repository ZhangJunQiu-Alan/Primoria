function stripMarkdownFences(value: string) {
  const trimmed = value.trim();
  const fenced = /```(?:html)?\s*([\s\S]*?)```/i.exec(trimmed)?.[1];
  return (fenced ?? trimmed).trim();
}

function escapeAttribute(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export const INTERACTIVE_VISUAL_RESIZE_EVENT = 'primoria:interactive-visual-height';
export const INTERACTIVE_VISUAL_ANALYTICS_EVENT = 'primoria:interactive-visual-analytics';
export const INTERACTIVE_VISUAL_OPEN_LINK_EVENT = 'primoria:interactive-visual-open-link';

const THEME_CSS = `
:root {
  color-scheme: light;
  --color-background-primary: #fffaf2;
  --color-background-secondary: #f5efe6;
  --color-background-tertiary: #efe6d9;
  --color-text-primary: #3d342a;
  --color-text-secondary: #7f7267;
  --color-text-tertiary: #a3968a;
  --color-border-primary: rgba(90, 70, 50, 0.32);
  --color-border-secondary: rgba(90, 70, 50, 0.2);
  --color-border-tertiary: rgba(90, 70, 50, 0.12);
  --font-sans: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-serif: "Cormorant Garamond", Georgia, serif;
  --font-mono: "SF Mono", "Fira Code", "Fira Mono", monospace;
  --border-radius-md: 12px;
  --border-radius-lg: 18px;
  --border-radius-xl: 24px;
  --p: var(--color-text-primary);
  --s: var(--color-text-secondary);
  --t: var(--color-text-tertiary);
  --bg2: var(--color-background-secondary);
  --b: var(--color-border-tertiary);
}
`;

const SVG_CLASSES_CSS = `
svg text.t { font: 400 14px var(--font-sans); fill: var(--p); }
svg text.ts { font: 400 12px var(--font-sans); fill: var(--s); }
svg text.th { font: 700 14px var(--font-sans); fill: var(--p); }
svg .box > rect, svg .box > circle, svg .box > ellipse { fill: var(--bg2); stroke: var(--b); }
svg .arr { stroke: var(--s); stroke-width: 1.5; fill: none; }
svg .c-purple > rect, svg rect.c-purple, svg circle.c-purple { fill: #eeedfe; stroke: #534ab7; }
svg .c-teal > rect, svg rect.c-teal, svg circle.c-teal { fill: #e1f5ee; stroke: #0f6e56; }
svg .c-blue > rect, svg rect.c-blue, svg circle.c-blue { fill: #e6f1fb; stroke: #185fa5; }
svg .c-green > rect, svg rect.c-green, svg circle.c-green { fill: #eaf3de; stroke: #3b6d11; }
svg .c-amber > rect, svg rect.c-amber, svg circle.c-amber { fill: #faeeda; stroke: #854f0b; }
svg .c-red > rect, svg rect.c-red, svg circle.c-red { fill: #fcebeb; stroke: #a32d2d; }
`;

const FORM_STYLES_CSS = `
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; background: transparent; overflow-x: hidden; }
body { font-family: var(--font-sans); color: var(--color-text-primary); -webkit-font-smoothing: antialiased; }
button, input, textarea, select { font: inherit; }
button { cursor: pointer; }
a { color: #3f7f69; }
`;

const BRIDGE_JS = `
(function () {
  const RESIZE_EVENT = '${INTERACTIVE_VISUAL_RESIZE_EVENT}';
  const ANALYTICS_EVENT = '${INTERACTIVE_VISUAL_ANALYTICS_EVENT}';
  const OPEN_LINK_EVENT = '${INTERACTIVE_VISUAL_OPEN_LINK_EVENT}';
  function post(payload) {
    try { parent.postMessage(payload, '*'); } catch {}
  }
  function track(eventName, payload) {
    post({ type: ANALYTICS_EVENT, eventName: eventName, payload: payload && typeof payload === 'object' ? payload : {} });
  }
  window.PrimoriaInteractive = { track };
  window.openLink = function (url) { post({ type: OPEN_LINK_EVENT, url: String(url || '') }); };
  function measure() {
    const height = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.documentElement.offsetHeight,
      document.body.offsetHeight,
      1
    );
    post({ type: RESIZE_EVENT, height: height });
  }
  document.addEventListener('click', function (event) {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (link && /^https?:/i.test(link.href)) {
      event.preventDefault();
      post({ type: OPEN_LINK_EVENT, url: link.href });
      return;
    }
    const target = event.target instanceof Element ? event.target.closest('button,[role="button"],[data-primoria-action]') : null;
    if (!target) return;
    track('action_clicked', {
      controlId: target.getAttribute('id') || target.getAttribute('data-primoria-action') || target.textContent?.trim()?.slice(0, 80) || 'action',
      tagName: target.tagName.toLowerCase()
    });
  });
  document.addEventListener('input', function (event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
    track('control_changed', {
      controlId: target.id || target.name || target.getAttribute('aria-label') || target.tagName.toLowerCase(),
      inputType: target instanceof HTMLInputElement ? target.type || 'text' : target.tagName.toLowerCase(),
      value: target instanceof HTMLInputElement && (target.type === 'checkbox' || target.type === 'radio') ? Boolean(target.checked) : String(target.value).slice(0, 120)
    });
  });
  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(document.body);
  window.addEventListener('load', measure);
  window.addEventListener('resize', measure);
  requestAnimationFrame(measure);
  setTimeout(measure, 120);
  setTimeout(measure, 600);
  setTimeout(measure, 1600);
})();
`;

export function buildPrimoriaInteractiveVisualSrcDoc(html: string, title: string) {
  const fragment = stripMarkdownFences(html);
  const safeTitle = escapeAttribute(title || 'Interactive visual');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <script type="importmap">
      {"imports":{"three":"https://esm.sh/three","three/":"https://esm.sh/three/","gsap":"https://esm.sh/gsap","gsap/":"https://esm.sh/gsap/","d3":"https://esm.sh/d3","d3/":"https://esm.sh/d3/","chart.js":"https://esm.sh/chart.js","chart.js/":"https://esm.sh/chart.js/","chart.js/auto":"https://esm.sh/chart.js/auto"}}
    </script>
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'unsafe-inline' 'unsafe-eval' https://esm.sh https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com; style-src 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://esm.sh https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com;">
    <style>${THEME_CSS}${SVG_CLASSES_CSS}${FORM_STYLES_CSS}</style>
  </head>
  <body>
    ${fragment}
    <script>${BRIDGE_JS}</script>
  </body>
</html>`;
}
