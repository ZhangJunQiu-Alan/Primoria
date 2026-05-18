"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

export const WidgetRendererProps = z.object({
  title: z.string(),
  description: z.string(),
  html: z.string(),
});

export type WidgetRendererProps = z.infer<typeof WidgetRendererProps>;

const THEME_CSS = `
:root {
  --color-background-primary: #ffffff;
  --color-background-secondary: #f7f3ea;
  --color-text-primary: #17130f;
  --color-text-secondary: #6f675f;
  --color-border-tertiary: rgba(23, 19, 15, 0.15);
  --font-sans: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-serif: Georgia, "Times New Roman", serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --border-radius-md: 999px;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: transparent; color: var(--color-text-primary); font-family: var(--font-sans); }
button {
  min-height: 38px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid #e7ded0;
  background: #fffdf8;
  color: var(--color-text-primary);
  cursor: pointer;
}
button:hover { background: #fff8ef; }
#content.initial-render > * { animation: fadeSlideIn .35s ease-out both; }
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

const BRIDGE_JS = `
function reportHeight() {
  var content = document.getElementById('content');
  if (!content) return;
  window.parent.postMessage({ type: 'primoria-widget-resize', height: content.scrollHeight }, '*');
}
new ResizeObserver(reportHeight).observe(document.getElementById('content'));
window.addEventListener('load', reportHeight);
document.addEventListener('click', function(event) {
  var button = event.target.closest('button[data-prompt]');
  if (!button) return;
  window.parent.postMessage({ type: 'primoria-send-prompt', text: button.getAttribute('data-prompt') }, '*');
});
`;

function assembleDocument(html: string) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>${THEME_CSS}</style>
</head>
<body>
  <div id="content" class="initial-render">${html}</div>
  <script>${BRIDGE_JS}</script>
</body>
</html>`;
}

export function WidgetRenderer({ html, title }: WidgetRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(120);
  const srcDoc = useMemo(() => assembleDocument(html), [html]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === "primoria-widget-resize" && typeof event.data.height === "number") {
        setHeight(Math.max(80, Math.min(event.data.height, 2400)));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      className="widget-frame"
      title={title}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      srcDoc={srcDoc}
      style={{ height }}
    />
  );
}
