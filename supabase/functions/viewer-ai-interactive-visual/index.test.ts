import {
  buildInteractiveVisualArtifactFromHtml,
  buildInteractiveVisualPrompt,
  extractInteractiveVisualHtml,
  injectInteractiveVisualBaseStyles,
  isCompleteHtmlDocument,
  validateOfflineHtml,
} from './index.ts';

function assertIncludes(value: string, expected: string) {
  if (!value.includes(expected)) {
    throw new Error(`expected value to include "${expected}"`);
  }
}

function assertThrows(fn: () => unknown, expected: string) {
  try {
    fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes(expected)) {
      throw new Error(`expected error to include "${expected}", got "${message}"`);
    }
    return;
  }
  throw new Error(`expected function to throw "${expected}"`);
}

Deno.test('legacy interactive visual prompt requires complete offline iframe HTML', () => {
  const prompt = buildInteractiveVisualPrompt({
    prompt: '请生成一个 y=ax+b 的一次函数交互图。',
    language: 'zh-CN',
    surface: 'builder',
  });

  assertIncludes(prompt, 'complete, runnable HTML document');
  assertIncludes(prompt, 'Do not return JSON.');
  assertIncludes(prompt, 'Do not wrap the HTML in markdown fences.');
  assertIncludes(prompt, 'Use only HTML, CSS, and vanilla JavaScript.');
  assertIncludes(prompt, 'System-provided base CSS will be injected');
  assertIncludes(prompt, 'iv-shell, iv-header, iv-kicker, iv-title, iv-subtitle');
  assertIncludes(prompt, 'title area, core visualization area, control area, and observation/conclusion area');
  assertIncludes(prompt, 'Show a slope triangle on or near the line with Delta x = 1 and Delta y = a.');
  assertIncludes(prompt, 'Write learner-facing labels and explanatory text in Simplified Chinese.');
});

Deno.test('complete HTML documents pass offline validation', () => {
  const html = `<!doctype html>
<html>
  <head>
    <style>body { margin: 0; }</style>
  </head>
  <body>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><line x1="0" y1="100" x2="100" y2="0" /></svg>
    <input type="range" />
    <script>window.PrimoriaInteractive?.track?.('slider_changed', { value: 1 });</script>
  </body>
</html>`;

  if (!isCompleteHtmlDocument(html)) {
    throw new Error('expected complete HTML document');
  }
  validateOfflineHtml(html);
});

Deno.test('dynamic SVG namespace constants pass offline validation', () => {
  const html = `<!doctype html>
<html>
  <head></head>
  <body>
    <svg id="graph" viewBox="0 0 100 100"></svg>
    <script>
      const svg = document.getElementById('graph');
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      const label = document.createElementNS("https://www.w3.org/2000/svg", "text");
      svg.append(line, label);
    </script>
  </body>
</html>`;

  validateOfflineHtml(html);
});

Deno.test('allowlisted ESM module imports pass offline validation', () => {
  const html = `<!doctype html>
<html>
  <head></head>
  <body>
    <script type="module">
      import * as THREE from "https://esm.sh/three";
      const _ = THREE.Vector3;
    </script>
  </body>
</html>`;

  validateOfflineHtml(html);
});

Deno.test('allowlisted module script src passes offline validation', () => {
  const html = `<!doctype html>
<html>
  <head></head>
  <body>
    <script type="module" src="https://esm.sh/d3"></script>
  </body>
</html>`;

  validateOfflineHtml(html);
});

Deno.test('non-allowlisted CDN imports are rejected', () => {
  const html = `<!doctype html>
<html>
  <head></head>
  <body>
    <script type="module">
      import { foo } from "https://unpkg.com/foo";
    </script>
  </body>
</html>`;

  assertThrows(() => validateOfflineHtml(html), 'esm.sh or cdn.jsdelivr.net/npm');
});

Deno.test('dynamic import() is rejected', () => {
  const html = `<!doctype html>
<html>
  <head></head>
  <body>
    <script>
      const _ = import('https://esm.sh/d3');
    </script>
  </body>
</html>`;

  assertThrows(() => validateOfflineHtml(html), 'dynamic import');
});

Deno.test('raw Gemini HTML is extracted and wrapped as API artifact metadata', () => {
  const raw = '```html\n<!doctype html><html><head><title>一次函数探索</title></head><body><main class="iv-shell"></main><script></script></body></html>\n```';
  const html = extractInteractiveVisualHtml(raw);
  if (!html) {
    throw new Error('expected HTML extraction');
  }

  const artifact = buildInteractiveVisualArtifactFromHtml(
    {
      prompt: '请生成一个 y=ax+b 的一次函数交互图。',
      language: 'zh-CN',
      surface: 'builder',
    },
    html,
  );

  if (artifact.title !== '一次函数探索') {
    throw new Error(`expected title from HTML, got ${artifact.title}`);
  }
  if (artifact.template !== 'linear-function-graph') {
    throw new Error(`expected linear template, got ${artifact.template}`);
  }
  if (artifact.experienceMode !== 'graph') {
    throw new Error(`expected graph mode, got ${artifact.experienceMode}`);
  }
  assertIncludes(artifact.generatedHtml, 'data-primoria-visual-base');
  assertIncludes(artifact.generatedHtml, 'data-primoria-visual-tokens');
});

Deno.test('system base styles and design tokens are injected into complete HTML documents', () => {
  const html = '<!doctype html><html><head><title>x</title></head><body><main class="iv-shell"></main></body></html>';
  const injected = injectInteractiveVisualBaseStyles(html);

  assertIncludes(injected, 'data-primoria-visual-base');
  assertIncludes(injected, 'data-primoria-visual-tokens');
  assertIncludes(injected, '--color-text-primary');
  assertIncludes(injected, '.iv-shell');
  if (injected.indexOf('data-primoria-visual-base') > injected.indexOf('<title>x</title>')) {
    throw new Error('expected system base style to be injected near the start of head');
  }
  if (injected.indexOf('data-primoria-visual-tokens') > injected.indexOf('data-primoria-visual-base')) {
    throw new Error('expected design tokens to be injected before base CSS');
  }
  validateOfflineHtml(injected);
});

Deno.test('HTML fragments are rejected by edge validation', () => {
  assertThrows(
    () => validateOfflineHtml('<section><input type="range" /></section>'),
    'complete HTML documents',
  );
});

Deno.test('external dependencies and network APIs are rejected', () => {
  const base = (body: string) => `<!doctype html><html><head></head><body>${body}</body></html>`;

  assertThrows(() => validateOfflineHtml(base('<script src="/app.js"></script>')), 'inline JavaScript only');
  assertThrows(() => validateOfflineHtml(base('<script type="module" src="https://evil.example/x.js"></script>')), 'esm.sh or cdn.jsdelivr.net/npm');
  assertThrows(() => validateOfflineHtml(base('<iframe srcdoc="<p>x</p>"></iframe>')), 'external frames');
  assertThrows(() => validateOfflineHtml(base('<script>fetch("/api")</script>')), 'network requests');
  assertThrows(() => validateOfflineHtml(base('<img src="https://example.com/graph.png" />')), 'external URLs');
  assertThrows(() => validateOfflineHtml(base('<link rel="stylesheet" href="/style.css" />')), 'external stylesheets');
});
