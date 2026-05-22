"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { IDIOMORPH_JS } from "./idiomorph-inline";

export const WidgetRendererProps = z.object({
  title: z.string(),
  description: z.string(),
  html: z.string(),
});

export type WidgetRendererProps = z.infer<typeof WidgetRendererProps>;

type WidgetRendererComponentProps = WidgetRendererProps & {
  onSendPrompt?: (prompt: string) => void;
};

const THEME_CSS = `
:root {
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

const SVG_CLASSES_CSS = `
svg text.t { font: 400 14px var(--font-sans); fill: var(--p); }
svg text.ts { font: 400 12px var(--font-sans); fill: var(--s); }
svg text.th { font: 700 14px var(--font-sans); fill: var(--p); }
svg .box > rect, svg .box > circle, svg .box > ellipse { fill: var(--bg2); stroke: var(--b); }
svg .node { cursor: pointer; }
svg .node:hover { opacity: 0.86; }
svg .arr { stroke: var(--s); stroke-width: 1.5; fill: none; }
svg .leader { stroke: var(--t); stroke-width: 0.5; stroke-dasharray: 4 4; fill: none; }
svg .c-blue > rect, svg .c-blue > circle, svg .c-blue > ellipse,
svg rect.c-blue, svg circle.c-blue, svg ellipse.c-blue { fill: #e7f1ff; stroke: #4a82c5; }
svg .c-green > rect, svg .c-green > circle, svg .c-green > ellipse,
svg rect.c-green, svg circle.c-green, svg ellipse.c-green { fill: #e5f5e9; stroke: #4b9a61; }
svg .c-amber > rect, svg .c-amber > circle, svg .c-amber > ellipse,
svg rect.c-amber, svg circle.c-amber, svg ellipse.c-amber { fill: #fff2c4; stroke: #c09123; }
svg .c-coral > rect, svg .c-coral > circle, svg .c-coral > ellipse,
svg rect.c-coral, svg circle.c-coral, svg ellipse.c-coral { fill: #ffede6; stroke: #d76e52; }
svg .c-purple > rect, svg .c-purple > circle, svg .c-purple > ellipse,
svg rect.c-purple, svg circle.c-purple, svg ellipse.c-purple { fill: #f0eaff; stroke: #806bd6; }
svg .c-gray > rect, svg .c-gray > circle, svg .c-gray > ellipse,
svg rect.c-gray, svg circle.c-gray, svg ellipse.c-gray { fill: #f1eee8; stroke: #8a8178; }
`;

const FORM_STYLES_CSS = `
* { box-sizing: border-box; margin: 0; }
html { background: transparent; }
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

function runScripts(content, scripts, index) {
  if (index >= scripts.length) return;
  var info = scripts[index];
  var key = scriptKey(info.src || info.text || String(index));
  if (content.getAttribute('data-exec-' + key)) {
    runScripts(content, scripts, index + 1);
    return;
  }
  content.setAttribute('data-exec-' + key, '1');

  try {
    var nextScript = document.createElement('script');
    var type = info.type || '';
    if (!type && info.text && /\\b(import\\s|export\\s|import\\()/.test(info.text)) {
      type = 'module';
    }
    if (type) nextScript.type = type;
    if (info.src) {
      nextScript.src = info.src;
      nextScript.onload = function() { runScripts(content, scripts, index + 1); };
      nextScript.onerror = function() { runScripts(content, scripts, index + 1); };
      content.appendChild(nextScript);
    } else {
      nextScript.textContent = info.text || '';
      content.appendChild(nextScript);
      runScripts(content, scripts, index + 1);
    }
  } catch (error) {
    console.warn('[primoria-widget] script execution failed', error);
    runScripts(content, scripts, index + 1);
  }
}

window.addEventListener('message', function(event) {
  if (event.source !== window.parent) return;
  if (!event.data || event.data.type !== 'primoria-update-content') return;

  var content = document.getElementById('content');
  if (!content) return;

  var rawHtml = String(event.data.html || '');
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
  if (allScriptsClosed) {
    runScripts(content, scripts, 0);
  }
  reportHeight();
});

function reportHeight() {
  var content = document.getElementById('content');
  if (!content) return;

  var clone = content.cloneNode(true);
  var width = content.offsetWidth || content.getBoundingClientRect().width || 720;
  clone.style.cssText =
    'position:fixed;top:-9999px;left:-9999px;width:' +
    width +
    'px;height:auto;overflow:hidden;visibility:hidden;pointer-events:none;';
  document.body.appendChild(clone);
  var height = Math.max(clone.scrollHeight, 80);
  document.body.removeChild(clone);
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
    ${SVG_CLASSES_CSS}
    ${FORM_STYLES_CSS}
  </style>
</head>
<body>
  <div id="content"></div>
  <script>${IDIOMORPH_JS}</script>
  <script>${BRIDGE_JS}</script>
</body>
</html>`;
}

export function WidgetRenderer({ html, title, onSendPrompt }: WidgetRendererComponentProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const shellReadyRef = useRef(false);
  const committedHtmlRef = useRef("");
  const [height, setHeight] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [htmlSettled, setHtmlSettled] = useState(false);
  const [prevHtml, setPrevHtml] = useState(html);
  const [fadingOut, setFadingOut] = useState(false);
  const settledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  if (html !== prevHtml) {
    setPrevHtml(html);
    setHtmlSettled(false);
    setFadingOut(false);
  }

  useEffect(() => {
    if (!html) return;
    if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    settledTimerRef.current = setTimeout(() => {
      setHtmlSettled(true);
      setFadingOut(true);
      fadeTimerRef.current = setTimeout(() => {
        setFadingOut(false);
      }, 600);
    }, 800);
    return () => {
      if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [html]);

  useEffect(() => {
    if (!html || (loaded && height > 0)) return;
    const timeout = setTimeout(() => {
      setLoaded(true);
      setHeight((current) => (current > 0 ? current : 300));
    }, 4000);
    return () => clearTimeout(timeout);
  }, [html, loaded, height]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    if (!shellReadyRef.current) {
      shellReadyRef.current = true;
      iframe.srcdoc = assembleShell();
      return;
    }

    if (!loaded || !iframe.contentWindow || html === committedHtmlRef.current) return;
    committedHtmlRef.current = html;
    iframe.contentWindow.postMessage({ type: "primoria-update-content", html }, "*");
  }, [html, loaded]);

  const showIframe = Boolean(html);
  const isStreaming = Boolean(html) && !htmlSettled;
  const loadingPhrase = useLoadingPhrase(isStreaming);
  const showStreamingIndicator = isStreaming || fadingOut;

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
      <iframe
        ref={iframeRef}
        className="widget-frame"
        title={title}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        onLoad={() => setLoaded(true)}
        style={{
          height: showIframe ? (height > 0 ? height : 300) : 0,
          opacity: showIframe ? 1 : 0,
          display: html ? undefined : "none",
        }}
      />
    </div>
  );
}
