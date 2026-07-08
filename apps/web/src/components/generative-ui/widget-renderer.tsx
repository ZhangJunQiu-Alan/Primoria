"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { IDIOMORPH_JS } from "./idiomorph-inline";
import { ExportOverlay } from "./export-overlay";
import { assembleWidgetStandaloneHtml } from "./export-utils";
import { LEARNING_OBJECT_CSS, PRIMORIA_PALETTE_JS } from "./style-tokens";
import { THREE_ORBIT_CONTROLS_SHIM } from "./three-orbit-controls-shim";
import { normalizeWidgetDependencies, type WidgetDependency as RuntimeWidgetDependency } from "@/lib/ai/widget-dependencies";

export const WidgetDependency = z.object({
  url: z.string(),
  global: z.string().optional(),
  kind: z.enum(["script", "module", "style"]).optional(),
});

export const WidgetRendererProps = z.object({
  title: z.string(),
  description: z.string(),
  html: z.string().optional().default(""),
  dependencies: z.array(WidgetDependency).optional(),
});

export type WidgetRendererProps = z.infer<typeof WidgetRendererProps>;

type WidgetRendererComponentProps = WidgetRendererProps & {
  onSendPrompt?: (prompt: string) => void;
};

const WIDGET_DEPENDENCY_PRELOAD_TIMEOUT_MS = 8000;

type WidgetDependencyPreloadResult = {
  url: string;
  ok: boolean;
  reason?: "error" | "timeout";
};

type WidgetDependencyPreloadState = {
  status: "idle" | "loading" | "ready" | "error";
  failed: string[];
};

type WidgetDependencyPreloadSnapshot = WidgetDependencyPreloadState & {
  key: string;
};

const widgetDependencyPreloads = new Map<string, Promise<WidgetDependencyPreloadResult>>();

function preloadWidgetDependency(dep: RuntimeWidgetDependency): Promise<WidgetDependencyPreloadResult> {
  const key = `${dep.kind ?? "script"}:${dep.url}`;
  const cached = widgetDependencyPreloads.get(key);
  if (cached) return cached;

  if (typeof document === "undefined") {
    return Promise.resolve({ url: dep.url, ok: true });
  }

  const promise = new Promise<WidgetDependencyPreloadResult>((resolve) => {
    let settled = false;
    let timeout: number | null = null;

    const finish = (result: WidgetDependencyPreloadResult) => {
      if (settled) return;
      settled = true;
      if (timeout) window.clearTimeout(timeout);
      if (!result.ok) widgetDependencyPreloads.delete(key);
      resolve(result);
    };

    timeout = window.setTimeout(() => {
      finish({ url: dep.url, ok: false, reason: "timeout" });
    }, WIDGET_DEPENDENCY_PRELOAD_TIMEOUT_MS);

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = dep.kind === "style" ? "style" : "script";
    link.href = dep.url;
    link.crossOrigin = "anonymous";
    link.setAttribute("data-primoria-widget-preload", key);
    link.onload = () => finish({ url: dep.url, ok: true });
    link.onerror = () => finish({ url: dep.url, ok: false, reason: "error" });
    document.head.appendChild(link);
  });

  widgetDependencyPreloads.set(key, promise);
  return promise;
}

export const THEME_CSS = `
:root {
  color-scheme: light;
  --color-background-primary: #fffdf8;
  --color-background-secondary: #f7f3ea;
  --color-background-tertiary: #efe8dc;
  --color-background-info: #eaf4ff;
  --color-background-success: #eaf7ee;
  --color-background-warning: #fff4cf;
  --color-background-danger: #fff0ea;
  --color-text-primary: #17130f;
  --color-text-secondary: #6f675f;
  --color-text-tertiary: #9a9187;
  --color-text-info: #245f9f;
  --color-text-success: #2f6b43;
  --color-text-warning: #7c560e;
  --color-text-danger: #9d3d2d;
  --color-border-primary: rgba(23, 19, 15, 0.36);
  --color-border-secondary: rgba(23, 19, 15, 0.22);
  --color-border-tertiary: rgba(23, 19, 15, 0.12);
  --font-sans: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-serif: Georgia, "Times New Roman", serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --border-radius-md: 10px;
  --border-radius-lg: 14px;
  --border-radius-xl: 18px;
  --p: var(--color-text-primary);
  --s: var(--color-text-secondary);
  --t: var(--color-text-tertiary);
  --bg2: var(--color-background-secondary);
  --b: var(--color-border-tertiary);
}
`;

export const SVG_CLASSES_CSS = `
svg text.t   { font: 400 14px var(--font-sans); fill: var(--p); }
svg text.ts  { font: 400 12px var(--font-sans); fill: var(--s); }
svg text.th  { font: 700 14px var(--font-sans); fill: var(--p); }
svg .box > rect, svg .box > circle, svg .box > ellipse { fill: var(--bg2); stroke: var(--b); }
svg .node { cursor: pointer; }
svg .node:hover { opacity: 0.86; }
svg .arr { stroke: var(--s); stroke-width: 1.5; fill: none; }
svg .leader { stroke: var(--t); stroke-width: 0.5; stroke-dasharray: 4 4; fill: none; }

/* Learning-object series pairs (style-tokens.ts): pale fill + darker same-hue
   stroke. Core hues map to the token series; blue/coral/teal/gray/red are
   supporting hues tuned to the same formula. */

/* Blue (supporting) */
svg .c-blue > rect, svg .c-blue > circle, svg .c-blue > ellipse,
svg rect.c-blue, svg circle.c-blue, svg ellipse.c-blue { fill: #e2ecf6; stroke: #33608f; }
svg .c-blue text.th, svg .c-blue text.t { fill: #264a70; }
svg .c-blue text.ts { fill: #33608f; }

/* Green = pine series */
svg .c-green > rect, svg .c-green > circle, svg .c-green > ellipse,
svg rect.c-green, svg circle.c-green, svg ellipse.c-green { fill: #dcede3; stroke: #2e6b52; }
svg .c-green text.th, svg .c-green text.t { fill: #22503d; }
svg .c-green text.ts { fill: #2e6b52; }

/* Amber = amber series */
svg .c-amber > rect, svg .c-amber > circle, svg .c-amber > ellipse,
svg rect.c-amber, svg circle.c-amber, svg ellipse.c-amber { fill: #fbeed3; stroke: #a66f10; }
svg .c-amber text.th, svg .c-amber text.t { fill: #7c530c; }
svg .c-amber text.ts { fill: #a66f10; }

/* Coral (supporting) */
svg .c-coral > rect, svg .c-coral > circle, svg .c-coral > ellipse,
svg rect.c-coral, svg circle.c-coral, svg ellipse.c-coral { fill: #fae9e1; stroke: #b05a35; }
svg .c-coral text.th, svg .c-coral text.t { fill: #7f3f24; }
svg .c-coral text.ts { fill: #b05a35; }

/* Purple = lavender series */
svg .c-purple > rect, svg .c-purple > circle, svg .c-purple > ellipse,
svg rect.c-purple, svg circle.c-purple, svg ellipse.c-purple { fill: #e6e0f6; stroke: #6a55c4; }
svg .c-purple text.th, svg .c-purple text.t { fill: #4e3f96; }
svg .c-purple text.ts { fill: #6a55c4; }

/* Gray = disabled/muted tokens */
svg .c-gray > rect, svg .c-gray > circle, svg .c-gray > ellipse,
svg rect.c-gray, svg circle.c-gray, svg ellipse.c-gray { fill: #f1ede4; stroke: #6b6357; }
svg .c-gray text.th, svg .c-gray text.t { fill: #4f483d; }
svg .c-gray text.ts { fill: #6b6357; }

/* Teal (supporting) */
svg .c-teal > rect, svg .c-teal > circle, svg .c-teal > ellipse,
svg rect.c-teal, svg circle.c-teal, svg ellipse.c-teal { fill: #e0f2ec; stroke: #1f7a60; }
svg .c-teal text.th, svg .c-teal text.t { fill: #175c48; }
svg .c-teal text.ts { fill: #1f7a60; }

/* Pink = rose series */
svg .c-pink > rect, svg .c-pink > circle, svg .c-pink > ellipse,
svg rect.c-pink, svg circle.c-pink, svg ellipse.c-pink { fill: #f9e3ea; stroke: #a64d64; }
svg .c-pink text.th, svg .c-pink text.t { fill: #7c394b; }
svg .c-pink text.ts { fill: #a64d64; }

/* Red = wrong/error tokens */
svg .c-red > rect, svg .c-red > circle, svg .c-red > ellipse,
svg rect.c-red, svg circle.c-red, svg ellipse.c-red { fill: #fbeae6; stroke: #c2452f; }
svg .c-red text.th, svg .c-red text.t { fill: #93331f; }
svg .c-red text.ts { fill: #c2452f; }
`;

export const FORM_STYLES_CSS = `
* { box-sizing: border-box; margin: 0; }
html { background: transparent; }
html,
body {
  height: auto !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  align-items: stretch !important;
  justify-content: flex-start !important;
  overflow: hidden !important;
}
body {
  min-width: 0;
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.6;
  color: var(--color-text-primary);
  background: transparent;
  -webkit-font-smoothing: antialiased;
}
#content {
  width: 100%;
  min-width: 0;
  overflow: hidden;
  text-align: left;
}
#content > * {
  max-width: 100%;
  min-width: 0;
  margin-left: 0 !important;
  margin-right: auto !important;
}
#content > * + * { margin-top: 12px; }
button {
  font-family: inherit;
  font-size: 14px;
  min-height: 36px;
  padding: 7px 14px;
  border: 1px solid var(--color-border-tertiary);
  border-radius: 999px;
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
}
button:hover { background: var(--color-background-secondary); border-color: var(--color-border-secondary); }
button:active { transform: scale(0.98); }
input[type="text"],
input[type="number"],
input[type="email"],
input[type="search"],
textarea,
select {
  width: 100%;
  font-family: inherit;
  font-size: 14px;
  min-height: 36px;
  padding: 7px 11px;
  border: 1px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-md);
  background: var(--color-background-primary);
  color: var(--color-text-primary);
}
input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--color-border-primary);
  box-shadow: 0 0 0 3px rgba(255, 229, 143, 0.38);
}
input[type="range"] { width: 100%; accent-color: #ef7358; }
input[type="checkbox"], input[type="radio"] { accent-color: #ef7358; }
a { color: var(--color-text-info); text-decoration: none; }
a:hover { text-decoration: underline; }
#content.initial-render > * { animation: fadeSlideIn .35s ease-out both; }
.morph-enter { animation: fadeSlideIn .35s ease-out both; }
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}
`;

const BRIDGE_JS = `
window.sendPrompt = function(text) {
  window.parent.postMessage({ type: 'primoria-send-prompt', text: String(text || '') }, '*');
};

window.openLink = function(url) {
  window.parent.postMessage({ type: 'primoria-open-link', url: String(url || '') }, '*');
};

function showWidgetError(message) {
  var content = document.getElementById('content');
  if (!content || content.querySelector('[data-primoria-widget-error]')) return;
  var box = document.createElement('div');
  box.setAttribute('data-primoria-widget-error', '1');
  box.style.cssText = 'margin:12px 0;padding:10px 12px;border:1px solid #d76e52;border-radius:12px;background:#ffede6;color:#71331f;font:13px/1.45 var(--font-sans,system-ui);';
  box.textContent = 'Widget script error: ' + String(message || 'unknown error');
  content.prepend(box);
  try { reportHeight(); } catch (_) {}
}

window.addEventListener('error', function(event) {
  showWidgetError(event.message || (event.error && event.error.message) || 'script failed');
});
window.onerror = function(message, _source, _lineno, _colno, error) {
  showWidgetError((error && error.message) || message || 'script failed');
};
window.addEventListener('unhandledrejection', function(event) {
  var reason = event.reason;
  showWidgetError((reason && reason.message) || reason || 'promise rejected');
});
window.__primoriaShowWidgetError = showWidgetError;

${THREE_ORBIT_CONTROLS_SHIM}

document.addEventListener('click', function(event) {
  var promptButton = event.target.closest('button[data-prompt], [role="button"][data-prompt]');
  if (promptButton) {
    event.preventDefault();
    window.sendPrompt(promptButton.getAttribute('data-prompt'));
    return;
  }

  var anchor = event.target.closest('a[href]');
  if (anchor && /^https?:\\/\\//.test(anchor.href)) {
    event.preventDefault();
    window.openLink(anchor.href);
  }
});

function scriptKey(text) {
  var hash = 0;
  for (var i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return 's' + Math.abs(hash);
}

function notifyWidgetReady() {
  try { document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true })); } catch (_) {}
  try { window.dispatchEvent(new Event('load')); } catch (_) {}
  try { reportHeight(); } catch (_) {}
}

var COMMON_DEPENDENCIES = {
  d3: { global: 'd3', url: 'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js', kind: 'script' },
  Chart: { global: 'Chart', url: 'https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.min.js', kind: 'script' },
  gsap: { global: 'gsap', url: 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js', kind: 'script' },
  THREE: { global: 'THREE', url: 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js', kind: 'script' },
  anime: { global: 'anime', url: 'https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js', kind: 'script' },
  Matter: { global: 'Matter', url: 'https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js', kind: 'script' },
  p5: { global: 'p5', url: 'https://cdn.jsdelivr.net/npm/p5@1.11.3/lib/p5.min.js', kind: 'script' },
  math: { global: 'math', url: 'https://cdn.jsdelivr.net/npm/mathjs@14.2.1/lib/browser/math.min.js', kind: 'script' },
  L: { global: 'L', url: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js', kind: 'script' },
  mermaid: { global: 'mermaid', url: 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js', kind: 'script' },
  cytoscape: { global: 'cytoscape', url: 'https://cdn.jsdelivr.net/npm/cytoscape@3.29.2/dist/cytoscape.min.js', kind: 'script' }
};
var ALLOWED_DEPENDENCY_URLS = Object.keys(COMMON_DEPENDENCIES).reduce(function(map, key) {
  map[COMMON_DEPENDENCIES[key].url] = true;
  return map;
}, Object.create(null));
var DEPENDENCY_LOAD_TIMEOUT_MS = 8000;

function readGlobal(path) {
  if (!path) return undefined;
  var current = window;
  var parts = String(path).split('.');
  for (var i = 0; i < parts.length; i += 1) {
    if (current == null) return undefined;
    current = current[parts[i]];
  }
  return current;
}

function normalizeDependency(dep) {
  if (!dep) return null;
  if (typeof dep === 'string') return COMMON_DEPENDENCIES[dep] || null;
  if (!dep.url) return null;
  if (!ALLOWED_DEPENDENCY_URLS[String(dep.url)]) {
    showWidgetError('Blocked non-whitelisted dependency: ' + String(dep.url));
    return null;
  }
  return {
    global: dep.global ? String(dep.global) : '',
    url: String(dep.url),
    kind: dep.kind === 'style' || dep.kind === 'module' ? dep.kind : 'script'
  };
}

function dependencyKey(dep) {
  return (dep.kind || 'script') + ':' + dep.url;
}

function missingDependencies(text, explicitDeps) {
  var deps = [];
  var seen = Object.create(null);
  function add(dep) {
    dep = normalizeDependency(dep);
    if (!dep) return;
    if (dep.global && readGlobal(dep.global)) return;
    var key = dependencyKey(dep);
    if (seen[key]) return;
    seen[key] = true;
    deps.push(dep);
  }

  (explicitDeps || []).forEach(add);

  var source = String(text || '');
  if (source.indexOf('d3.') !== -1 && !window.d3) add(COMMON_DEPENDENCIES.d3);
  if ((source.indexOf('Chart.') !== -1 || source.indexOf('new Chart') !== -1) && !window.Chart) add(COMMON_DEPENDENCIES.Chart);
  if (source.indexOf('gsap.') !== -1 && !window.gsap) add(COMMON_DEPENDENCIES.gsap);
  if (source.indexOf('THREE.') !== -1 && !window.THREE) add(COMMON_DEPENDENCIES.THREE);
  if ((source.indexOf('anime.') !== -1 || source.indexOf('anime(') !== -1) && !window.anime) add(COMMON_DEPENDENCIES.anime);
  if (source.indexOf('Matter.') !== -1 && !window.Matter) add(COMMON_DEPENDENCIES.Matter);
  if ((source.indexOf('new p5') !== -1 || source.indexOf('p5.') !== -1) && !window.p5) add(COMMON_DEPENDENCIES.p5);
  if (source.indexOf('math.') !== -1 && !window.math) add(COMMON_DEPENDENCIES.math);
  if ((source.indexOf('L.map') !== -1 || source.indexOf('L.tileLayer') !== -1) && !window.L) add(COMMON_DEPENDENCIES.L);
  if (source.indexOf('mermaid.') !== -1 && !window.mermaid) add(COMMON_DEPENDENCIES.mermaid);
  return deps;
}

function loadDependency(dep, done) {
  dep = normalizeDependency(dep);
  if (!dep) {
    done();
    return;
  }
  if (dep.global && readGlobal(dep.global)) {
    done();
    return;
  }
  var key = dependencyKey(dep);
  var existing = document.querySelector('[data-primoria-dep="' + key.replace(/"/g, '') + '"]');
  var settled = false;
  var timeout = setTimeout(function() {
    showWidgetError('Dependency timed out: ' + dep.url);
    finish();
  }, DEPENDENCY_LOAD_TIMEOUT_MS);
  function finish() {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    done();
  }
  if (existing) {
    if (existing.getAttribute('data-primoria-dep-loaded') === '1' || (dep.global && readGlobal(dep.global))) {
      finish();
      return;
    }
    existing.addEventListener('load', function() {
      existing.setAttribute('data-primoria-dep-loaded', '1');
      finish();
    }, { once: true });
    existing.addEventListener('error', function() {
      showWidgetError('Dependency failed to load: ' + dep.url);
      finish();
    }, { once: true });
    return;
  }

  if (dep.kind === 'style') {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = dep.url;
    link.setAttribute('data-primoria-dep', key);
    link.onload = function() {
      link.setAttribute('data-primoria-dep-loaded', '1');
      finish();
    };
    link.onerror = function() {
      showWidgetError('Dependency failed to load: ' + dep.url);
      finish();
    };
    document.head.appendChild(link);
    return;
  }

  var script = document.createElement('script');
  script.setAttribute('data-primoria-dep', key);
  script.src = dep.url;
  if (dep.kind === 'module') script.type = 'module';
  script.onload = function() {
    script.setAttribute('data-primoria-dep-loaded', '1');
    finish();
  };
  script.onerror = function() {
    showWidgetError('Dependency failed to load: ' + dep.url);
    finish();
  };
  document.head.appendChild(script);
}

function loadDependencies(deps, done) {
  if (!deps.length) {
    try {
      if (window.__primoriaInstallThreeOrbitControls) window.__primoriaInstallThreeOrbitControls();
    } catch (_) {}
    done();
    return;
  }
  loadDependency(deps[0], function() {
    loadDependencies(deps.slice(1), done);
  });
}

function runScripts(content, scripts, index, dependencies) {
  if (index >= scripts.length) {
    notifyWidgetReady();
    return;
  }
  var info = scripts[index];
  var key = scriptKey(info.src || info.text || String(index));
  if (content.getAttribute('data-exec-' + key)) {
    runScripts(content, scripts, index + 1, dependencies);
    return;
  }

  loadDependencies(missingDependencies(info.text, dependencies), function() {
    content.setAttribute('data-exec-' + key, '1');
    try {
      var nextScript = document.createElement('script');
      var type = info.type || '';
      if (!type && info.text && (info.text.indexOf('import ') !== -1 || info.text.indexOf('export ') !== -1 || info.text.indexOf('import(') !== -1)) {
        type = 'module';
      }
      if (type) nextScript.type = type;
      if (info.src) {
        if (!ALLOWED_DEPENDENCY_URLS[String(info.src)]) {
          showWidgetError('Blocked non-whitelisted script source: ' + String(info.src));
          runScripts(content, scripts, index + 1, dependencies);
          return;
        }
        nextScript.src = info.src;
        var scriptSettled = false;
        var scriptTimeout = setTimeout(function() {
          showWidgetError('Script timed out: ' + String(info.src));
          finishScriptSource();
        }, DEPENDENCY_LOAD_TIMEOUT_MS);
        function finishScriptSource() {
          if (scriptSettled) return;
          scriptSettled = true;
          clearTimeout(scriptTimeout);
          runScripts(content, scripts, index + 1, dependencies);
        }
        nextScript.onload = finishScriptSource;
        nextScript.onerror = function() {
          showWidgetError('Script failed to load: ' + String(info.src));
          finishScriptSource();
        };
        content.appendChild(nextScript);
      } else {
        nextScript.textContent =
          "try {\\n" +
          (info.text || '') +
          "\\n} catch (error) { window.__primoriaShowWidgetError(error && error.message ? error.message : \\\"script failed\\\"); throw error; }";
        content.appendChild(nextScript);
        runScripts(content, scripts, index + 1, dependencies);
      }
    } catch (error) {
      console.warn('[primoria-widget] script execution failed', error);
      showWidgetError(error && error.message ? error.message : 'script execution failed');
      runScripts(content, scripts, index + 1, dependencies);
    }
  });
}

window.addEventListener('message', function(event) {
  if (event.source !== window.parent) return;
  if (!event.data || event.data.type !== 'primoria-update-content') return;

  var content = document.getElementById('content');
  if (!content) return;

  var rawHtml = normalizeRuntimeHtml(String(event.data.html || ''));
  if (event.data.executeScripts !== false && !rawHtml.trim()) {
    content.innerHTML = '';
    showWidgetError('Widget returned empty HTML.');
    reportHeight();
    return;
  }
  var tmp = document.createElement('div');
  tmp.innerHTML = rawHtml;
  var scripts = [];
  var scriptOpens = (rawHtml.match(/<script[\\s>]/gi) || []).length;
  var scriptCloses = (rawHtml.match(/<\\/script>/gi) || []).length;
  var allScriptsClosed = scriptOpens <= scriptCloses;
  tmp.querySelectorAll('script').forEach(function(script) {
    scripts.push({ src: script.src, text: script.textContent, type: script.type || '' });
    script.remove();
  });

  var firstRender = !content.hasAttribute('data-has-content');
  if (firstRender) {
    content.classList.add('initial-render');
    content.setAttribute('data-has-content', '1');
    setTimeout(function() { content.classList.remove('initial-render'); }, 700);
  }

  if (window.Idiomorph && typeof window.Idiomorph.morph === 'function' && !firstRender) {
    try {
      window.Idiomorph.morph(content, tmp.innerHTML, { morphStyle: 'innerHTML', ignoreActive: true, ignoreActiveValue: true });
    } catch (err) {
      console.warn('[primoria-widget] idiomorph failed, falling back', err);
      content.innerHTML = tmp.innerHTML;
    }
  } else {
    content.innerHTML = tmp.innerHTML;
  }
  if (event.data.executeScripts !== false) {
    if (!allScriptsClosed) {
      showWidgetError('Widget script tag is incomplete. Regenerate the widget to repair the HTML.');
    } else if (scripts.length > 0) {
      runScripts(content, scripts, 0, event.data.dependencies || []);
    } else {
      notifyWidgetReady();
    }
  }
  reportHeight();
});

function normalizeRuntimeHtml(html) {
  return String(html || '')
    .replace(/min-height\s*:\s*100(?:dvh|vh)\s*;?/gi, 'min-height:auto;')
    .replace(/height\s*:\s*100(?:dvh|vh)\s*;?/gi, 'height:auto;')
    .replace(/width\s*:\s*100(?:dvw|vw)\s*;?/gi, 'width:100%;')
    .replace(/position\s*:\s*fixed\s*;?/gi, 'position:absolute;');
}

function reportHeight() {
  var content = document.getElementById('content');
  if (!content) return;

  var rect = content.getBoundingClientRect();
  var height = Math.max(content.scrollHeight, rect.height, 80);
  var children = content.children || [];
  for (var i = 0; i < children.length; i += 1) {
    var childRect = children[i].getBoundingClientRect();
    height = Math.max(height, childRect.bottom - rect.top);
  }
  height = Math.min(Math.ceil(height + 4), 1400);
  window.parent.postMessage({ type: 'primoria-widget-resize', height: height }, '*');
}

var target = document.getElementById('content') || document.body;
new ResizeObserver(reportHeight).observe(target);
window.addEventListener('load', reportHeight);
var resizeInterval = setInterval(reportHeight, 200);
setTimeout(function() { clearInterval(resizeInterval); }, 12000);
`;


const LOADING_PHRASES = [
  "Building widget",
  "Arranging visuals",
  "Wiring interactions",
  "Rendering lesson",
  "Polishing edges",
];

function useLoadingPhrase(active: boolean) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % LOADING_PHRASES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [active]);
  return LOADING_PHRASES[index];
}

function hasCompleteScriptTags(value: unknown) {
  const text = typeof value === "string" ? value : "";
  const scriptOpens = (text.match(/<script[\s>]/gi) || []).length;
  const scriptCloses = (text.match(/<\/script>/gi) || []).length;
  return scriptOpens <= scriptCloses;
}

function assembleShell() {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script type="importmap">
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
  </script>
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'unsafe-inline' 'unsafe-eval' https://esm.sh https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com;
    style-src 'unsafe-inline';
    img-src 'self' data: blob:;
    font-src 'self' data:;
    connect-src 'self' https://esm.sh https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com;
  " />
  <style>
    ${THEME_CSS}
    ${LEARNING_OBJECT_CSS}
    ${SVG_CLASSES_CSS}
    ${FORM_STYLES_CSS}
  </style>
</head>
<body>
  <div id="content"></div>
  <script>${PRIMORIA_PALETTE_JS}</script>
  <script>${IDIOMORPH_JS}</script>
  <script>${BRIDGE_JS}</script>
</body>
</html>`;
}

export function WidgetRenderer({ html = "", title, dependencies, onSendPrompt }: WidgetRendererComponentProps) {
  const safeHtml = typeof html === "string" ? html : "";
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const shellReadyRef = useRef(false);
  const committedHtmlRef = useRef("");
  const executedHtmlRef = useRef("");
  const [height, setHeight] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [settledHtml, setSettledHtml] = useState("");
  const [fadingOut, setFadingOut] = useState(false);
  const [dependencyPreloadResult, setDependencyPreloadResult] = useState<WidgetDependencyPreloadSnapshot | null>(null);
  const settledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const normalizedDependencies = useMemo(() => normalizeWidgetDependencies(dependencies), [dependencies]);
  const dependencyPreloadKey = useMemo(
    () => normalizedDependencies.map((dep) => `${dep.kind ?? "script"}:${dep.url}`).join("|"),
    [normalizedDependencies],
  );
  const dependencyPreload = useMemo<WidgetDependencyPreloadState>(() => {
    if (!dependencyPreloadKey) return { status: "idle", failed: [] };
    if (dependencyPreloadResult?.key === dependencyPreloadKey) {
      return { status: dependencyPreloadResult.status, failed: dependencyPreloadResult.failed };
    }
    return { status: "loading", failed: [] };
  }, [dependencyPreloadKey, dependencyPreloadResult]);
  const scriptsComplete = hasCompleteScriptTags(safeHtml);
  const htmlPreviewSettled = safeHtml === settledHtml;
  const canExecuteHtml = htmlPreviewSettled;
  const exportHtml = useMemo(
    () => (safeHtml ? assembleWidgetStandaloneHtml({ title, html: safeHtml, dependencies: normalizedDependencies }) : undefined),
    [safeHtml, normalizedDependencies, title],
  );

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;

      if (event.data?.type === "primoria-widget-resize" && typeof event.data.height === "number") {
        setHeight(Math.max(90, Math.min(event.data.height, 4000)));
        return;
      }

      if (event.data?.type === "primoria-send-prompt" && typeof event.data.text === "string") {
        const prompt = event.data.text.trim();
        if (prompt) onSendPrompt?.(prompt);
        return;
      }

      if (event.data?.type === "primoria-open-link" && typeof event.data.url === "string") {
        window.open(event.data.url, "_blank", "noopener,noreferrer");
      }
    },
    [onSendPrompt],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);
  useEffect(() => {
    executedHtmlRef.current = "";
  }, [safeHtml]);

  useEffect(() => {
    if (!dependencyPreloadKey) return;

    let cancelled = false;
    Promise.all(normalizedDependencies.map(preloadWidgetDependency)).then((results) => {
      if (cancelled) return;
      const failed = results.filter((result) => !result.ok).map((result) => result.url);
      setDependencyPreloadResult(
        failed.length
          ? { key: dependencyPreloadKey, status: "error", failed }
          : { key: dependencyPreloadKey, status: "ready", failed: [] },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [dependencyPreloadKey, normalizedDependencies]);

  useEffect(() => {
    if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    settledTimerRef.current = setTimeout(() => {
      setSettledHtml(safeHtml);
      setFadingOut(true);
      fadeTimerRef.current = setTimeout(() => {
        setFadingOut(false);
      }, 600);
    }, 800);
    return () => {
      if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [safeHtml]);

  useEffect(() => {
    if (!safeHtml || (loaded && height > 0)) return;
    const timeout = setTimeout(() => {
      setLoaded(true);
      setHeight((current) => (current > 0 ? current : 300));
    }, 4000);
    return () => clearTimeout(timeout);
  }, [safeHtml, loaded, height]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    if (!shellReadyRef.current) {
      shellReadyRef.current = true;
      iframe.srcdoc = assembleShell();
      return;
    }

    if (!loaded || !iframe.contentWindow || safeHtml === committedHtmlRef.current) return;
    committedHtmlRef.current = safeHtml;
    iframe.contentWindow.postMessage({ type: "primoria-update-content", html: safeHtml, dependencies: normalizedDependencies, executeScripts: false }, "*");
  }, [safeHtml, normalizedDependencies, loaded]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!canExecuteHtml || !safeHtml || !loaded || !iframe?.contentWindow || safeHtml === executedHtmlRef.current) return;
    executedHtmlRef.current = safeHtml;
    iframe.contentWindow.postMessage({ type: "primoria-update-content", html: safeHtml, dependencies: normalizedDependencies, executeScripts: true }, "*");
  }, [safeHtml, normalizedDependencies, canExecuteHtml, loaded]);

  const showIframe = Boolean(safeHtml);
  const isStreaming = Boolean(safeHtml) && !htmlPreviewSettled;
  const loadingPhrase = useLoadingPhrase(isStreaming);
  const showStreamingIndicator = isStreaming || fadingOut;
  const showDependencyPreloadIndicator = showIframe && !showStreamingIndicator && dependencyPreload.status === "loading";

  return (
    <div className="widget-renderer-shell">
      {showStreamingIndicator ? (
        <div
          className="widget-streaming-indicator"
          style={{ opacity: isStreaming ? 1 : 0, maxHeight: isStreaming ? 32 : 0 }}
        >
          <span className="tool-spinner widget-streaming-spinner" aria-hidden="true" />
          <span>{loadingPhrase}...</span>
        </div>
      ) : null}
      {showDependencyPreloadIndicator ? (
        <div className="widget-streaming-indicator" style={{ opacity: 1, maxHeight: 32 }}>
          <span className="tool-spinner widget-streaming-spinner" aria-hidden="true" />
          <span>Preparing visual resources...</span>
        </div>
      ) : null}
      {dependencyPreload.status === "error" ? (
        <div className="widget-renderer-error" role="alert">
          Visual resources are taking longer than expected. The widget will keep trying inside the frame.
        </div>
      ) : null}
      {htmlPreviewSettled && !safeHtml.trim() ? (
        <div className="widget-renderer-error" role="alert">
          Widget returned empty HTML.
        </div>
      ) : null}
      <ExportOverlay title={title} exportHtml={exportHtml} ready={Boolean(safeHtml) && canExecuteHtml}>
        <iframe
          ref={iframeRef}
          className="widget-frame"
          title={title}
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          onLoad={() => setLoaded(true)}
          style={{
            height: showIframe ? (height > 0 ? height : 300) : 0,
            display: safeHtml ? undefined : "none",
          }}
        />
      </ExportOverlay>
    </div>
  );
}
