import { normalizeWidgetDependencies, type WidgetDependency } from "@/lib/ai/widget-dependencies";

type WidgetExportInput = {
  title: string;
  html: string;
  dependencies?: WidgetDependency[];
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
    function showError(prefix, value) {
      var box = document.createElement('div');
      box.className = 'primoria-error';
      box.textContent = prefix + ': ' + (value || 'unknown error');
      document.body.prepend(box);
    }
    window.addEventListener('error', function(event) { showError('Widget script error', event.message); });
    window.addEventListener('unhandledrejection', function(event) {
      var reason = event.reason;
      showError('Widget promise error', (reason && reason.message) || reason || 'promise rejected');
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

export function triggerDownload(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    return "&#39;";
  });
}
