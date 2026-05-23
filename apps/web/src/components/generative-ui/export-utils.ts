import { normalizeWidgetDependencies, type WidgetDependency } from "../../lib/ai/widget-dependencies";
import { validateStemCode, type StemSubject } from "../../lib/ai/stem-code";
import { PHYSICS_RUNTIME_CODE } from "./runtimes/physics-runtime";
import { MATH_RUNTIME_CODE } from "./runtimes/math-runtime";
import { CS_RUNTIME_CODE } from "./runtimes/cs-runtime";

type WidgetExportInput = {
  title: string;
  html: string;
  dependencies?: WidgetDependency[];
};

type StemExportInput = {
  subject: StemSubject;
  title: string;
  description: string;
  code: string;
};

const IMPORT_MAP = `<script type="importmap">
{
  "imports": {
    "three": "https://esm.sh/three",
    "three/": "https://esm.sh/three/",
    "gsap": "https://esm.sh/gsap",
    "gsap/": "https://esm.sh/gsap/",
    "d3": "https://esm.sh/d3",
    "d3/": "https://esm.sh/d3/",
    "chart.js": "https://esm.sh/chart.js",
    "chart.js/": "https://esm.sh/chart.js/",
    "chart.js/auto": "https://esm.sh/chart.js/auto"
  }
}
</script>`;

const STANDALONE_THEME_CSS = `
:root {
  --color-background-primary: #fffdf8;
  --color-background-secondary: #f7f3ea;
  --color-background-tertiary: #efe8dc;
  --color-background-danger: #fff0ea;
  --color-text-primary: #17130f;
  --color-text-secondary: #6f675f;
  --color-text-danger: #9d3d2d;
  --color-border-primary: rgba(23, 19, 15, 0.36);
  --color-border-secondary: rgba(23, 19, 15, 0.22);
  --color-border-tertiary: rgba(23, 19, 15, 0.12);
  --font-sans: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
* { box-sizing: border-box; margin: 0; }
html, body {
  min-width: 0;
  background: #fffdf8;
  color: var(--color-text-primary);
  font-family: var(--font-sans);
}
body { padding: 18px; }
button {
  font: inherit;
  min-height: 36px;
  padding: 7px 14px;
  border: 1px solid var(--color-border-tertiary);
  border-radius: 999px;
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  cursor: pointer;
}
button:hover { background: var(--color-background-secondary); border-color: var(--color-border-secondary); }
input, textarea, select {
  width: 100%;
  font: inherit;
  min-height: 36px;
  padding: 7px 11px;
  border: 1px solid var(--color-border-tertiary);
  border-radius: 10px;
  background: var(--color-background-primary);
  color: var(--color-text-primary);
}
input[type="range"] { accent-color: #ef7358; }
a { color: #245f9f; }
svg text.t { font: 400 14px var(--font-sans); fill: var(--color-text-primary); }
svg text.ts { font: 400 12px var(--font-sans); fill: var(--color-text-secondary); }
svg text.th { font: 700 14px var(--font-sans); fill: var(--color-text-primary); }
.primoria-error {
  margin: 12px 0;
  padding: 10px 12px;
  border: 1px solid var(--color-text-danger);
  border-radius: 12px;
  background: var(--color-background-danger);
  color: var(--color-text-danger);
  font: 13px/1.45 var(--font-sans);
}
`;

const STEM_CDN_SCRIPTS: Record<StemSubject, string> = {
  physics: "https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js",
  math: "",
  cs: "",
};

const STEM_RUNTIME_CODE: Record<StemSubject, string> = {
  physics: PHYSICS_RUNTIME_CODE,
  math: MATH_RUNTIME_CODE,
  cs: CS_RUNTIME_CODE,
};

function stemContainers(subject: StemSubject) {
  if (subject === "math") return `<div id="math-container"></div><div id="math-controls"></div>`;
  if (subject === "cs") return `<div id="cs-container"></div><div id="cs-controls"></div>`;
  return `<div id="physics-container"></div><div id="physics-labels"></div>`;
}

function stemSubjectCss(subject: StemSubject) {
  if (subject === "math") {
    return `
    #math-container canvas { display: block; border-radius: 10px; max-width: 100%; }
    #math-controls { padding: 8px 12px 4px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .math-slider { display: flex; align-items: center; gap: 6px; }
    .math-slider-label { font-size: 12px; color: var(--color-text-secondary); font-variant-numeric: tabular-nums; white-space: nowrap; min-width: 80px; }
    .math-slider input[type=range] { width: 120px; accent-color: #ef7358; }
    `;
  }
  if (subject === "cs") {
    return `
    #cs-container canvas { display: block; border-radius: 10px; max-width: 100%; }
    #cs-controls { padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; }
    .cs-ctrl-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .cs-btn { font-size: 16px; background: var(--color-background-secondary); border: 1px solid var(--color-border-tertiary); border-radius: 6px; padding: 4px 10px; cursor: pointer; color: var(--color-text-primary); }
    .cs-btn:hover { background: var(--color-background-tertiary); }
    .cs-btn:disabled { opacity: 0.35; cursor: default; }
    .cs-counter, .cs-stat { font-size: 12px; font-variant-numeric: tabular-nums; color: var(--color-text-secondary); }
    .cs-desc { font-size: 13px; color: var(--color-text-secondary); min-height: 20px; padding: 0 2px; }
    .cs-stats { display: flex; gap: 12px; flex-wrap: wrap; }
    .cs-stat span { font-weight: 600; color: var(--color-text-primary); }
    `;
  }
  return `
    #physics-container canvas { display: block; border-radius: 10px; max-width: 100%; }
    #physics-labels { padding: 6px 12px 8px; display: flex; flex-wrap: wrap; gap: 6px; }
    .phys-label { font-size: 12px; color: var(--color-text-secondary); background: var(--color-background-secondary); padding: 2px 10px; border-radius: 6px; font-variant-numeric: tabular-nums; border: 1px solid var(--color-border-tertiary); }
  `;
}

function stemShellHead(subject: StemSubject, title: string) {
  return `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
    style-src 'unsafe-inline';
    img-src 'self' data: blob:;
  ">
  <style>
    ${STANDALONE_THEME_CSS}
    html, body { background: transparent; overflow: hidden; padding: 0; }
    body { font-family: var(--font-sans, system-ui, sans-serif); }
    ${stemSubjectCss(subject)}
  </style>
</head>`;
}

export function assembleWidgetStandaloneHtml({ html, title, dependencies }: WidgetExportInput): string {
  const deps = normalizeWidgetDependencies(dependencies);
  const dependencyTags = deps
    .map((dep) => {
      if (dep.kind === "style") return `<link rel="stylesheet" href="${escapeHtml(dep.url)}">`;
      const type = dep.kind === "module" ? ` type="module"` : "";
      return `<script${type} src="${escapeHtml(dep.url)}"></script>`;
    })
    .join("\n  ");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  ${IMPORT_MAP}
  ${dependencyTags}
  <style>${STANDALONE_THEME_CSS}</style>
  <script>
    window.sendPrompt = function() {};
    window.openLink = function(url) { if (url) window.open(url, '_blank', 'noopener,noreferrer'); };
    window.addEventListener('error', function(event) {
      var box = document.createElement('div');
      box.className = 'primoria-error';
      box.textContent = 'Widget script error: ' + (event.message || 'unknown error');
      document.body.prepend(box);
    });
    window.addEventListener('unhandledrejection', function(event) {
      var box = document.createElement('div');
      box.className = 'primoria-error';
      box.textContent = 'Widget promise error: ' + ((event.reason && event.reason.message) || event.reason || 'promise rejected');
      document.body.prepend(box);
    });
    document.addEventListener('click', function(e) {
      var a = e.target.closest('a[href]');
      if (a && /^https?:\\/\\//.test(a.href)) {
        e.preventDefault();
        window.open(a.href, '_blank', 'noopener,noreferrer');
      }
    });
  </script>
</head>
<body>
  <main id="content">
    ${html}
  </main>
</body>
</html>`;
}

export function assembleStemIframeShell(subject: StemSubject, title = "STEM visualization"): string {
  const runtime = STEM_RUNTIME_CODE[subject];
  const cdnSrc = STEM_CDN_SCRIPTS[subject];
  const executeBridge = `
    window.addEventListener('message', function(e) {
      if (e.source !== window.parent) return;
      if (e.data && e.data.type === 'execute-code') {
        try {
          new Function(e.data.code)();
        } catch (err) {
          window.parent.postMessage({
            type: 'stem-error',
            message: err.message,
            stack: err.stack || ''
          }, '*');
        }
      }
    });
    window.parent.postMessage({ type: 'stem-ready' }, '*');
  `;

  const runtimeBlock = subject === "physics"
    ? `${cdnSrc ? `<script src="${cdnSrc}"></script>` : ""}
  <script>
    if (typeof Matter === 'undefined') {
      window.parent.postMessage({ type: 'stem-error', message: 'Failed to load Matter.js from CDN' }, '*');
    } else {
      ${runtime}
      ${executeBridge}
    }
  </script>`
    : `<script>
    ${runtime}
    ${executeBridge}
  </script>`;

  return `<!DOCTYPE html>
<html>
${stemShellHead(subject, title)}
<body>
  ${stemContainers(subject)}
  ${runtimeBlock}
</body>
</html>`;
}

export function assembleStemStandaloneHtml({ subject, title, description, code }: StemExportInput): string {
  const validation = validateStemCode(code);
  const runtime = STEM_RUNTIME_CODE[subject];
  const cdnSrc = STEM_CDN_SCRIPTS[subject];
  const escapedDescription = escapeHtml(description);
  const errorBlock = validation.ok
    ? ""
    : `<div class="primoria-error">STEM renderer code was blocked: ${escapeHtml(validation.reason)}</div>`;
  const runCode = validation.ok
    ? `<script>
    function runStemCode() {
      try {
        new Function(${JSON.stringify(code)})();
      } catch (err) {
        var box = document.createElement('div');
        box.className = 'primoria-error';
        box.textContent = 'STEM runtime error: ' + (err && err.message ? err.message : String(err));
        document.body.prepend(box);
      }
    }
  </script>`
    : "";
  const runtimeBlock = subject === "physics"
    ? `${cdnSrc ? `<script src="${cdnSrc}"></script>` : ""}
  <script>${runtime}</script>
  ${runCode}
  <script>
    if (${JSON.stringify(validation.ok)} && typeof Matter === 'undefined') {
      var box = document.createElement('div');
      box.className = 'primoria-error';
      box.textContent = 'Failed to load Matter.js from CDN';
      document.body.prepend(box);
    } else if (${JSON.stringify(validation.ok)}) {
      runStemCode();
    }
  </script>`
    : `<script>${runtime}</script>
  ${runCode}
  <script>if (${JSON.stringify(validation.ok)}) runStemCode();</script>`;

  return `<!DOCTYPE html>
<html>
${stemShellHead(subject, title)}
<body>
  <div style="padding:10px 12px;color:var(--color-text-secondary);font-size:13px;">${escapedDescription}</div>
  ${errorBlock}
  ${stemContainers(subject)}
  ${runtimeBlock}
</body>
</html>`;
}

export function assembleStandaloneHtml(html: string, title: string): string {
  return assembleWidgetStandaloneHtml({ html, title });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function triggerDownload(htmlString: string, filename: string): void {
  const blob = new Blob([htmlString], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
