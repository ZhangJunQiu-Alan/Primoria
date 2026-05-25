import { auditHtmlWithAst } from './astAudit.ts';

function wrap(body: string): string {
  return `<!doctype html><html><head></head><body>${body}</body></html>`;
}

function assertIssueFired(html: string, ruleKey: string, severity: 'blocker' | 'warning' = 'blocker') {
  const report = auditHtmlWithAst(html);
  const found = report.issues.find((i) => i.rule === ruleKey && i.severity === severity);
  if (!found) {
    throw new Error(
      `expected AST rule "${ruleKey}" to fire as ${severity}; got issues=${report.issues
        .map((i) => `${i.rule}(${i.severity})`)
        .join(', ')}`,
    );
  }
}

function assertIssueSilent(html: string, ruleKey: string) {
  const report = auditHtmlWithAst(html);
  const found = report.issues.find((i) => i.rule === ruleKey);
  if (found) {
    throw new Error(`expected AST rule "${ruleKey}" to be silent but it fired: ${found.message}`);
  }
}

// ── js-parse-error ─────────────────────────────────────────────────────────

Deno.test('js-parse-error: fires when script has invalid syntax', () => {
  const html = wrap(`
    <script type="module">
      const x = ;
    </script>
  `);
  assertIssueFired(html, 'js-parse-error', 'blocker');
});

Deno.test('js-parse-error: silent on valid module syntax', () => {
  const html = wrap(`
    <script type="module">
      const x = 1;
      document.querySelector('button')?.addEventListener('click', () => console.log(x));
    </script>
  `);
  assertIssueSilent(html, 'js-parse-error');
});

// ── ast:gsap-svg-attr-conflict ─────────────────────────────────────────────

Deno.test('ast:gsap-svg-attr-conflict: fires on bubble-sort-style pattern', () => {
  const html = wrap(`
    <script type="module">
      const enteringBars = bars.enter().append('rect')
        .attr('x', (d, idx) => xScale(idx))
        .attr('y', d => visualCard.clientHeight - yScale(d))
        .attr('width', xScale.bandwidth())
        .attr('height', d => yScale(d));

      bars.merge(enteringBars).each(function (d, idx) {
        gsap.to(this, {
          duration: 0.22,
          ease: 'power2.out',
          x: xScale(idx),
          y: visualCard.clientHeight - yScale(d),
          width: xScale.bandwidth(),
          height: yScale(d),
          fill: '#abc'
        });
      });
    </script>
  `);
  assertIssueFired(html, 'ast:gsap-svg-attr-conflict', 'blocker');
});

Deno.test('ast:gsap-svg-attr-conflict: fires on shorthand props', () => {
  const html = wrap(`
    <script type="module">
      bar.attr('x', d => xScale(d));
      const x = 1, y = 2, width = 3, height = 4;
      gsap.to(rect, { duration: 0.22, x, y, width, height });
    </script>
  `);
  assertIssueFired(html, 'ast:gsap-svg-attr-conflict', 'blocker');
});

Deno.test('ast:gsap-svg-attr-conflict: silent when coords are wrapped in attr', () => {
  const html = wrap(`
    <script type="module">
      bar.attr('x', d => xScale(d));
      gsap.to(rect, { duration: 0.22, attr: { x: 100, y: 50, width: 30, height: 80 } });
    </script>
  `);
  assertIssueSilent(html, 'ast:gsap-svg-attr-conflict');
});

Deno.test('ast:gsap-svg-attr-conflict: silent when there is no d3 .attr() pairing', () => {
  const html = wrap(`
    <script type="module">
      gsap.to(icon, { x: 100, duration: 0.22 });
    </script>
  `);
  assertIssueSilent(html, 'ast:gsap-svg-attr-conflict');
});

// ── ast:gsap-spread-on-d3-target ───────────────────────────────────────────

Deno.test('ast:gsap-spread-on-d3-target: warns on spread coords when d3 writes positional attrs', () => {
  const html = wrap(`
    <script type="module">
      bar.attr('x', d => xScale(d));
      const common = { duration: 0.3, ease: 'power2.out' };
      gsap.to(rect, { ...common });
    </script>
  `);
  assertIssueFired(html, 'ast:gsap-spread-on-d3-target', 'warning');
});

// ── ast:addeventlistener-undefined-handler ─────────────────────────────────

Deno.test('ast:addeventlistener-undefined-handler: fires on identifier handler that is not bound', () => {
  const html = wrap(`
    <button id="go">go</button>
    <script>
      document.getElementById('go').addEventListener('click', handleGo);
    </script>
  `);
  assertIssueFired(html, 'ast:addeventlistener-undefined-handler', 'blocker');
});

Deno.test('ast:addeventlistener-undefined-handler: silent on bound identifier', () => {
  const html = wrap(`
    <button id="go">go</button>
    <script>
      function handleGo() {}
      document.getElementById('go').addEventListener('click', handleGo);
    </script>
  `);
  assertIssueSilent(html, 'ast:addeventlistener-undefined-handler');
});

Deno.test('ast:addeventlistener-undefined-handler: silent on inline arrow handler', () => {
  const html = wrap(`
    <button id="go">go</button>
    <script>
      document.getElementById('go').addEventListener('click', () => {});
    </script>
  `);
  assertIssueSilent(html, 'ast:addeventlistener-undefined-handler');
});

// ── ast:dom-id-missing ─────────────────────────────────────────────────────

Deno.test('ast:dom-id-missing: fires when getElementById targets a missing id', () => {
  const html = wrap(`
    <button id="next">next</button>
    <script>
      const reset = document.getElementById('reset');
    </script>
  `);
  assertIssueFired(html, 'ast:dom-id-missing', 'blocker');
});

Deno.test('ast:dom-id-missing: silent when id exists', () => {
  const html = wrap(`
    <button id="reset">reset</button>
    <script>
      const reset = document.getElementById('reset');
    </script>
  `);
  assertIssueSilent(html, 'ast:dom-id-missing');
});

Deno.test('ast:dom-id-missing: fires for querySelector("#missing")', () => {
  const html = wrap(`
    <svg id="chart"></svg>
    <script>
      const legend = document.querySelector('#legend');
    </script>
  `);
  assertIssueFired(html, 'ast:dom-id-missing', 'blocker');
});

Deno.test('ast:dom-id-missing: ignores composite selectors that cannot be checked statically', () => {
  const html = wrap(`
    <button>go</button>
    <script>
      const btn = document.querySelector('button.primary');
    </script>
  `);
  assertIssueSilent(html, 'ast:dom-id-missing');
});

// ── passed flag ────────────────────────────────────────────────────────────

Deno.test('auditHtmlWithAst returns passed=true on a clean script', () => {
  const html = wrap(`
    <button id="go">go</button>
    <script>
      function handleClick() {}
      document.getElementById('go').addEventListener('click', handleClick);
    </script>
  `);
  const report = auditHtmlWithAst(html);
  if (!report.passed) {
    throw new Error(`expected passed=true; got issues=${report.issues.map((i) => i.rule).join(',')}`);
  }
});
