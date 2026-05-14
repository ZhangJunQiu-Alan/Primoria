import { auditHtmlStatic, formatAuditIssuesForRepair } from './htmlAuditor.ts';
import type { Plan } from './planSchema.ts';

const BASE_PLAN: Plan = {
  approach: 'Stub plan used only to feed the auditor — must satisfy zod schema length.',
  technology: 'svg',
  template: 'generic',
  palette: { mode: 'auto', primary: '#2563eb', accent: '#e4572e' },
  keyElements: ['bars', 'observation strip'],
  interactions: [{ control: 'button:next', purpose: 'advance' }],
  accessibilityNotes: ['aria labels on buttons'],
  observationCopyHint: 'Step changed.',
};

const PLAN_WITH_LABELS: Plan = {
  ...BASE_PLAN,
  keyElements: ['bars', 'numerical labels on bars', 'observation strip'],
};

const FRACTION_PLAN: Plan = {
  ...BASE_PLAN,
  template: 'fraction-explorer',
  approach: 'Show a fraction as text, decimal, percentage, pie, and number-line position with direct value entry.',
  keyElements: ['fraction text', 'decimal text', 'pie chart', 'number-line marker'],
  interactions: [{ control: 'input:fraction', purpose: 'type a fraction or decimal directly' }],
  observationCopyHint: '1/1 equals 100% of the whole.',
};

function wrap(body: string): string {
  return `<!doctype html><html><head></head><body>${body}</body></html>`;
}

function assertRuleFired(html: string, plan: Plan, ruleKey: string, severity: 'blocker' | 'warning') {
  const report = auditHtmlStatic(html, plan);
  const bucket = severity === 'blocker' ? report.blockers : report.warnings;
  const found = bucket.find((issue) => issue.rule === ruleKey);
  if (!found) {
    throw new Error(
      `expected rule "${ruleKey}" to fire as ${severity}, but it did not. blockers=${report.blockers
        .map((b) => b.rule)
        .join(',')}; warnings=${report.warnings.map((w) => w.rule).join(',')}`,
    );
  }
}

function assertRuleSilent(html: string, plan: Plan, ruleKey: string) {
  const report = auditHtmlStatic(html, plan);
  const all = [...report.blockers, ...report.warnings];
  const found = all.find((issue) => issue.rule === ruleKey);
  if (found) {
    throw new Error(`expected rule "${ruleKey}" to be silent but it fired: ${found.message}`);
  }
}

// ── js-var-token ───────────────────────────────────────────────────────────

Deno.test('js-var-token: fires when var(--…) appears in JS code outside strings', () => {
  const html = wrap(`
    <script type="module">
      rect.setAttribute('rx', var(--radius-sm));
    </script>
  `);
  assertRuleFired(html, BASE_PLAN, 'js-var-token', 'blocker');
});

Deno.test('js-var-token: silent when var(--…) appears only inside a CSS string template', () => {
  const html = wrap(`
    <script type="module">
      el.style.cssText = "border-radius: var(--radius-sm); background: var(--color-accent-primary);";
    </script>
  `);
  assertRuleSilent(html, BASE_PLAN, 'js-var-token');
});

// ── gsap-svg-attr-conflict ──────────────────────────────────────────────────

Deno.test('gsap-svg-attr-conflict: fires when d3.attr() + bare gsap.to({x,y,width,height}) coexist', () => {
  const html = wrap(`
    <script type="module">
      enteringBars.attr("x", d => xScale(d));
      gsap.to(this, { x: 100, y: 200, width: 30, height: 80, duration: 0.22 });
    </script>
  `);
  assertRuleFired(html, BASE_PLAN, 'gsap-svg-attr-conflict', 'blocker');
});

Deno.test('gsap-svg-attr-conflict: silent when gsap wraps positions in attr: {}', () => {
  const html = wrap(`
    <script type="module">
      enteringBars.attr("x", d => xScale(d));
      gsap.to(rect, { attr: { x: 100, y: 200, width: 30, height: 80 }, duration: 0.22 });
    </script>
  `);
  assertRuleSilent(html, BASE_PLAN, 'gsap-svg-attr-conflict');
});

Deno.test('gsap-svg-attr-conflict: silent when there is no d3.attr() pairing', () => {
  const html = wrap(`
    <script type="module">
      gsap.to(icon, { x: 100, duration: 0.22 });
    </script>
  `);
  assertRuleSilent(html, BASE_PLAN, 'gsap-svg-attr-conflict');
});

Deno.test('gsap-svg-attr-conflict: fires on shorthand props {x, y, width, height}', () => {
  const html = wrap(`
    <script type="module">
      bar.attr("x", d => xScale(d));
      const x = 1, y = 2, width = 3, height = 4;
      gsap.to(this, { duration: 0.22, x, y, width, height });
    </script>
  `);
  assertRuleFired(html, BASE_PLAN, 'gsap-svg-attr-conflict', 'blocker');
});

Deno.test('gsap-svg-attr-conflict: fires even when props contain nested function bodies', () => {
  // Reproduces the bubble-sort failure sample: gsap.to(this, {...}) inside .each(),
  // with an onUpdate function body containing nested {}.
  const html = wrap(`
    <script type="module">
      const enteringBars = bars.enter().append("rect")
        .attr("x", (d, idx) => xScale(idx))
        .attr("y", (d) => visualCard.clientHeight - yScale(d))
        .attr("width", xScale.bandwidth())
        .attr("height", (d) => yScale(d));

      bars.merge(enteringBars).each(function(d, idx) {
        gsap.to(this, {
          duration: 0.22,
          ease: 'power2.out',
          x: xScale(idx),
          y: visualCard.clientHeight - yScale(d),
          width: xScale.bandwidth(),
          height: yScale(d),
          fill: '#abc',
          onUpdate: function () {
            d3.select(this).attr('aria-label', \`val \${d}\`);
          }
        });
      });
    </script>
  `);
  assertRuleFired(html, BASE_PLAN, 'gsap-svg-attr-conflict', 'blocker');
});

Deno.test('gsap-svg-attr-conflict: silent when nested onUpdate writes attrs but tween uses attr wrapper', () => {
  const html = wrap(`
    <script type="module">
      bar.attr("x", d => xScale(d));
      gsap.to(rect, {
        duration: 0.22,
        attr: { x: 100, y: 50, width: 30, height: 80 },
        onUpdate: function () { console.log('updating'); }
      });
    </script>
  `);
  assertRuleSilent(html, BASE_PLAN, 'gsap-svg-attr-conflict');
});

// ── gsap-onupdate-attr-conflict ─────────────────────────────────────────────

Deno.test('gsap-onupdate-attr-conflict: fires when onUpdate rewrites the same positional attr', () => {
  const html = wrap(`
    <script type="module">
      gsap.to(this, {
        duration: 0.3,
        x: 100,
        y: 50,
        onUpdate: function () {
          d3.select(this).attr('x', 200);
        }
      });
    </script>
  `);
  assertRuleFired(html, BASE_PLAN, 'gsap-onupdate-attr-conflict', 'blocker');
});

Deno.test('gsap-onupdate-attr-conflict: fires when onUpdate uses setAttribute on transform', () => {
  const html = wrap(`
    <script type="module">
      gsap.to(rect, {
        duration: 0.3,
        x: 100,
        onUpdate: function () {
          rect.setAttribute('transform', 'translate(10, 10)');
        }
      });
    </script>
  `);
  assertRuleFired(html, BASE_PLAN, 'gsap-onupdate-attr-conflict', 'blocker');
});

Deno.test('gsap-onupdate-attr-conflict: silent when onUpdate touches unrelated attrs (aria-label)', () => {
  const html = wrap(`
    <script type="module">
      gsap.to(this, {
        duration: 0.3,
        x: 100,
        onUpdate: function () {
          d3.select(this).attr('aria-label', 'hi');
        }
      });
    </script>
  `);
  assertRuleSilent(html, BASE_PLAN, 'gsap-onupdate-attr-conflict');
});

Deno.test('gsap-onupdate-attr-conflict: silent when there is no bare positional prop', () => {
  const html = wrap(`
    <script type="module">
      gsap.to(rect, {
        duration: 0.3,
        attr: { x: 100 },
        onUpdate: function () {
          d3.select(this).attr('x', 50);
        }
      });
    </script>
  `);
  assertRuleSilent(html, BASE_PLAN, 'gsap-onupdate-attr-conflict');
});

// ── gsap-css-bezier-ease ────────────────────────────────────────────────────

Deno.test('gsap-css-bezier-ease: fires when ease is a CSS bezier string', () => {
  const html = wrap(`
    <script type="module">
      gsap.to(el, { duration: 0.22, ease: "cubic-bezier(0.2, 0, 0, 1)" });
    </script>
  `);
  assertRuleFired(html, BASE_PLAN, 'gsap-css-bezier-ease', 'blocker');
});

Deno.test('gsap-css-bezier-ease: silent with named ease', () => {
  const html = wrap(`
    <script type="module">
      gsap.to(el, { duration: 0.22, ease: "power2.out" });
    </script>
  `);
  assertRuleSilent(html, BASE_PLAN, 'gsap-css-bezier-ease');
});

// ── gsap-ms-duration ────────────────────────────────────────────────────────

Deno.test('gsap-ms-duration: fires when parseFloat(--duration-*) is used without /1000', () => {
  const html = wrap(`
    <script type="module">
      const baseDuration = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--duration-base'));
      gsap.to(el, { duration: baseDuration });
    </script>
  `);
  assertRuleFired(html, BASE_PLAN, 'gsap-ms-duration', 'blocker');
});

Deno.test('gsap-ms-duration: silent when parseFloat(--duration-*) is divided by 1000', () => {
  const html = wrap(`
    <script type="module">
      const baseDurationSec = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--duration-base')) / 1000;
      gsap.to(el, { duration: baseDurationSec });
    </script>
  `);
  assertRuleSilent(html, BASE_PLAN, 'gsap-ms-duration');
});

Deno.test('gsap-ms-duration: silent when no gsap usage even if parseFloat token is read', () => {
  const html = wrap(`
    <script>
      const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--duration-base'));
      el.style.transitionDuration = ms + 'ms';
    </script>
  `);
  assertRuleSilent(html, BASE_PLAN, 'gsap-ms-duration');
});

// ── root-redeclaration ──────────────────────────────────────────────────────

Deno.test('root-redeclaration: fires when AI-authored <style> sets --color-*', () => {
  const html = `<!doctype html><html><head>
    <style>
      :root { --color-background-primary: #f8fafc; --color-accent-primary: #3b82f6; }
    </style>
  </head><body></body></html>`;
  assertRuleFired(html, BASE_PLAN, 'root-redeclaration', 'warning');
});

Deno.test('root-redeclaration: silent when the design-token block is the injected one (data-primoria-visual-tokens)', () => {
  const html = `<!doctype html><html><head>
    <style data-primoria-visual-tokens>
      :root { --color-background-primary: #f6f3ef; }
    </style>
  </head><body></body></html>`;
  assertRuleSilent(html, BASE_PLAN, 'root-redeclaration');
});

// ── missing-primary-visual ─────────────────────────────────────────────────

Deno.test('missing-primary-visual: fires when .iv-visual-card is missing', () => {
  const html = wrap('<main class="iv-shell"><section class="iv-controls-card"></section></main>');
  assertRuleFired(html, BASE_PLAN, 'missing-primary-visual', 'blocker');
});

Deno.test('missing-primary-visual: fires when no svg or canvas is rendered', () => {
  const html = wrap('<main class="iv-shell"><section class="iv-visual-card"><div>Blank</div></section></main>');
  assertRuleFired(html, BASE_PLAN, 'missing-primary-visual', 'blocker');
});

Deno.test('missing-primary-visual: silent when svg exists inside .iv-visual-card', () => {
  const html = wrap('<main class="iv-shell"><section class="iv-visual-card"><svg></svg></section></main>');
  assertRuleSilent(html, BASE_PLAN, 'missing-primary-visual');
});

// ── range-input-no-live-update ─────────────────────────────────────────────

Deno.test('range-input-no-live-update: fires when range input has only change handlers', () => {
  const html = wrap(`
    <section class="iv-visual-card"><svg></svg></section>
    <input type="range" />
    <script>
      document.querySelector('input').addEventListener('change', () => {});
    </script>
  `);
  assertRuleFired(html, BASE_PLAN, 'range-input-no-live-update', 'blocker');
});

Deno.test('range-input-no-live-update: silent when input event listener exists', () => {
  const html = wrap(`
    <section class="iv-visual-card"><svg></svg></section>
    <input type="range" />
    <script>
      document.querySelector('input').addEventListener('input', () => {});
    </script>
  `);
  assertRuleSilent(html, BASE_PLAN, 'range-input-no-live-update');
});

// ── fraction-dropdown-instead-of-direct-input ──────────────────────────────

Deno.test('fraction-dropdown-instead-of-direct-input: fires for fraction plans with select and no text input', () => {
  const html = wrap(`
    <section class="iv-visual-card"><svg></svg></section>
    <label>Select fraction</label>
    <select><option>1/2</option></select>
  `);
  assertRuleFired(html, FRACTION_PLAN, 'fraction-dropdown-instead-of-direct-input', 'blocker');
});

Deno.test('fraction-dropdown-instead-of-direct-input: silent when direct text input is present', () => {
  const html = wrap(`
    <section class="iv-visual-card"><svg></svg></section>
    <label for="fractionInput">Enter fraction or decimal</label>
    <input id="fractionInput" type="text" />
    <select><option>1/2</option></select>
  `);
  assertRuleSilent(html, FRACTION_PLAN, 'fraction-dropdown-instead-of-direct-input');
});

// ── fraction-missing-decimal-readout ───────────────────────────────────────

Deno.test('fraction-missing-decimal-readout: fires when no decimal label/readout is present', () => {
  const html = wrap(`
    <section class="iv-visual-card"><svg></svg></section>
    <label for="fractionInput">Enter fraction or decimal</label>
    <input id="fractionInput" type="text" />
    <label>Numerator</label><input type="range" />
    <label>Denominator</label><input type="range" />
  `);
  assertRuleFired(html, FRACTION_PLAN, 'fraction-missing-decimal-readout', 'blocker');
});

Deno.test('fraction-missing-decimal-readout: silent when decimal label exists', () => {
  const html = wrap(`
    <section class="iv-visual-card"><svg></svg></section>
    <div>Decimal</div>
    <label for="fractionInput">Enter fraction or decimal</label>
    <input id="fractionInput" type="text" />
    <label>Numerator</label><input type="range" />
    <label>Denominator</label><input type="range" />
  `);
  assertRuleSilent(html, FRACTION_PLAN, 'fraction-missing-decimal-readout');
});

// ── fraction-missing-sliders ───────────────────────────────────────────────

Deno.test('fraction-missing-sliders: fires when fewer than two sliders exist', () => {
  const html = wrap(`
    <section class="iv-visual-card"><svg></svg></section>
    <div>Decimal</div>
    <label for="fractionInput">Enter fraction or decimal</label>
    <input id="fractionInput" type="text" />
    <label>Numerator</label><input type="range" />
  `);
  assertRuleFired(html, FRACTION_PLAN, 'fraction-missing-sliders', 'blocker');
});

Deno.test('fraction-missing-sliders: fires when slider labels are missing', () => {
  const html = wrap(`
    <section class="iv-visual-card"><svg></svg></section>
    <div>Decimal</div>
    <label for="fractionInput">Enter fraction or decimal</label>
    <input id="fractionInput" type="text" />
    <input type="range" />
    <input type="range" />
  `);
  assertRuleFired(html, FRACTION_PLAN, 'fraction-missing-sliders', 'blocker');
});

Deno.test('fraction-missing-sliders: silent when numerator and denominator sliders are present', () => {
  const html = wrap(`
    <section class="iv-visual-card"><svg></svg></section>
    <div>Decimal</div>
    <label for="fractionInput">Enter fraction or decimal</label>
    <input id="fractionInput" type="text" />
    <label>Numerator</label><input type="range" />
    <label>Denominator</label><input type="range" />
  `);
  assertRuleSilent(html, FRACTION_PLAN, 'fraction-missing-sliders');
});

// ── key-elements-missing-text-labels ───────────────────────────────────────

Deno.test('key-elements-missing-text-labels: fires when plan asks for labels but HTML has no <text>', () => {
  const html = wrap('<svg><rect width="20" height="50"></rect></svg>');
  assertRuleFired(html, PLAN_WITH_LABELS, 'key-elements-missing-text-labels', 'warning');
});

Deno.test('key-elements-missing-text-labels: silent when <text> exists', () => {
  const html = wrap('<svg><rect width="20" height="50"></rect><text x="10" y="60">42</text></svg>');
  assertRuleSilent(html, PLAN_WITH_LABELS, 'key-elements-missing-text-labels');
});

Deno.test('key-elements-missing-text-labels: silent when plan does not mention labels/numbers', () => {
  const html = wrap('<svg><rect width="20" height="50"></rect></svg>');
  assertRuleSilent(html, BASE_PLAN, 'key-elements-missing-text-labels');
});

// ── empty-script-init ──────────────────────────────────────────────────────

Deno.test('empty-script-init: fires when module script has no listeners and no top-level init call', () => {
  const html = wrap(`
    <script type="module">
      import { foo } from "https://esm.sh/d3";
      function setup() { return 1; }
    </script>
  `);
  assertRuleFired(html, BASE_PLAN, 'empty-script-init', 'warning');
});

Deno.test('empty-script-init: silent when an event listener is attached', () => {
  const html = wrap(`
    <script type="module">
      document.getElementById('btn').addEventListener('click', () => {});
    </script>
  `);
  assertRuleSilent(html, BASE_PLAN, 'empty-script-init');
});

Deno.test('empty-script-init: silent when there is a top-level init call', () => {
  const html = wrap(`
    <script type="module">
      function setup() { return 1; }
      setup();
    </script>
  `);
  assertRuleSilent(html, BASE_PLAN, 'empty-script-init');
});

// ── dom-references-undefined ───────────────────────────────────────────────

Deno.test('dom-references-undefined: fires when getElementById targets a missing id', () => {
  const html = wrap(`
    <button id="nextBtn">Next</button>
    <script>
      const btn = document.getElementById('resetBtn');
    </script>
  `);
  assertRuleFired(html, BASE_PLAN, 'dom-references-undefined', 'blocker');
});

Deno.test('dom-references-undefined: silent when id exists', () => {
  const html = wrap(`
    <button id="nextBtn">Next</button>
    <script>
      const btn = document.getElementById('nextBtn');
    </script>
  `);
  assertRuleSilent(html, BASE_PLAN, 'dom-references-undefined');
});

Deno.test('dom-references-undefined: querySelector("#id") also checked', () => {
  const html = wrap(`
    <svg id="chart"></svg>
    <script>
      const missing = document.querySelector('#legend');
    </script>
  `);
  assertRuleFired(html, BASE_PLAN, 'dom-references-undefined', 'blocker');
});

// ── overall report shape ────────────────────────────────────────────────────

Deno.test('auditHtmlStatic returns passed=true when no rules fire', () => {
  const html = wrap('<section class="iv-visual-card"><svg><rect width="20" height="50"></rect></svg></section>');
  const report = auditHtmlStatic(html, BASE_PLAN);
  if (!report.passed) {
    throw new Error(
      `expected passed=true, got blockers=${report.blockers.map((b) => b.rule).join(',')}`,
    );
  }
});

Deno.test('formatAuditIssuesForRepair includes rule key, message, hint', () => {
  const html = wrap(`
    <script type="module">
      rect.setAttribute('rx', var(--radius-sm));
    </script>
  `);
  const report = auditHtmlStatic(html, BASE_PLAN);
  const formatted = formatAuditIssuesForRepair(report.blockers);
  if (formatted.length === 0) throw new Error('expected at least one formatted issue');
  if (!formatted[0].includes('js-var-token')) throw new Error('expected rule key in formatted string');
  if (!formatted[0].toLowerCase().includes('hint:')) throw new Error('expected HINT in formatted string');
});
