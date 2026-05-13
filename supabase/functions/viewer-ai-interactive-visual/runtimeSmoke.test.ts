import { runtimeSmokeHtml } from './runtimeSmoke.ts';

function wrap(body: string): string {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Test</title></head>
<body>${body}</body>
</html>`;
}

Deno.test('runtimeSmokeHtml: passes on a healthy minimal visualization', async () => {
  const html = wrap(`
    <section class="iv-visual-card">
      <svg viewBox="0 0 100 100"><rect x="10" y="10" width="20" height="20" /></svg>
    </section>
    <button id="go" type="button">go</button>
    <script>
      const btn = document.getElementById('go');
      if (btn) {
        btn.addEventListener('click', function () {});
      }
    </script>
  `);
  const report = await runtimeSmokeHtml(html, { settleMs: 200 });
  if (!report.passed) {
    throw new Error(
      `expected passed=true, got issues=${report.issues.map((i) => i.rule).join(',')} errors=${report.errors.join('|')}`,
    );
  }
});

Deno.test('runtimeSmokeHtml: flags empty hero visual', async () => {
  const html = wrap(`<div class="iv-shell"><p>Just text, no svg or canvas.</p></div>`);
  const report = await runtimeSmokeHtml(html, { settleMs: 200 });
  const empty = report.issues.find((i) => i.rule === 'runtime:empty-canvas');
  if (!empty) {
    throw new Error(
      `expected runtime:empty-canvas issue; got ${report.issues.map((i) => i.rule).join(',')}`,
    );
  }
});

Deno.test('runtimeSmokeHtml: surfaces script init errors', async () => {
  const html = wrap(`
    <svg><circle r="5" /></svg>
    <script>
      // Touches a property on undefined → TypeError at init time.
      const missing = window.thisIsNotDefined.someMethod();
    </script>
  `);
  const report = await runtimeSmokeHtml(html, { settleMs: 200 });
  const err = report.issues.find((i) => i.rule === 'runtime:script-error');
  if (!err) {
    throw new Error(`expected runtime:script-error; got ${report.issues.map((i) => i.rule).join(',')}`);
  }
});
