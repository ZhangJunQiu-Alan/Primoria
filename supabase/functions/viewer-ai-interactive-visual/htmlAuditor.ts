import type { Plan } from './planSchema.ts';

export type AuditSeverity = 'blocker' | 'warning';

export type AuditIssue = {
  rule: string;
  severity: AuditSeverity;
  message: string;
  hint: string;
};

export type AuditReport = {
  blockers: AuditIssue[];
  warnings: AuditIssue[];
  passed: boolean;
};

type Rule = {
  key: string;
  severity: AuditSeverity;
  hint: string;
  check: (ctx: AuditContext) => string | null;
};

type AuditContext = {
  html: string;
  plan: Plan;
  scripts: ScriptBlock[];
  ids: Set<string>;
};

type ScriptBlock = {
  raw: string;
  isModule: boolean;
  body: string;
};

const SCRIPT_TAG_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

function extractScripts(html: string): ScriptBlock[] {
  const blocks: ScriptBlock[] = [];
  let match: RegExpExecArray | null;
  while ((match = SCRIPT_TAG_RE.exec(html))) {
    const attrs = match[1] ?? '';
    const body = match[2] ?? '';
    const isModule = /\btype\s*=\s*["']?module["']?/i.test(attrs);
    blocks.push({ raw: match[0], isModule, body });
  }
  return blocks;
}

function extractIds(html: string): Set<string> {
  const ids = new Set<string>();
  const re = /\bid\s*=\s*(?:"([^"]+)"|'([^']+)')/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const id = (match[1] ?? match[2] ?? '').trim();
    if (id) ids.add(id);
  }
  return ids;
}

function stripStringLiterals(jsCode: string): string {
  // Replace contents of "..." '...' `...` with spaces of equal length so positions are preserved
  // Naive: doesn't handle template-literal expressions; good enough for audit heuristics.
  return jsCode.replace(/(['"`])((?:\\.|(?!\1).)*)\1/g, (m, q, body) => `${q}${' '.repeat(body.length)}${q}`);
}

function isFractionLikePlan(plan: Plan): boolean {
  const haystack = [
    plan.template,
    plan.approach,
    ...plan.keyElements,
    ...plan.interactions.map((interaction) => `${interaction.control} ${interaction.purpose}`),
    plan.observationCopyHint,
  ]
    .join('\n')
    .toLowerCase();
  return /(fraction|fractions|numerator|denominator|equivalent fraction|decimal|percentage|percent|number line)/i.test(
    haystack,
  );
}

function hasLiveInputUpdates(html: string, scripts: ScriptBlock[]): boolean {
  if (/\boninput\s*=/i.test(html)) {
    return true;
  }
  return scripts.some((script) =>
    /addEventListener\s*\(\s*['"]input['"]/i.test(script.body) || /\.oninput\s*=/i.test(script.body)
  );
}

function findUnconvertedDurationParseFloat(body: string): boolean {
  const re = /parseFloat\s*\(/g;
  let start: RegExpExecArray | null;
  while ((start = re.exec(body))) {
    // Walk forward from the '(' after parseFloat to find the matching ')'
    let depth = 0;
    let i = start.index + start[0].length - 1; // position of the '('
    let closeIdx = -1;
    for (; i < body.length; i += 1) {
      const ch = body[i];
      if (ch === '(') depth += 1;
      else if (ch === ')') {
        depth -= 1;
        if (depth === 0) {
          closeIdx = i;
          break;
        }
      }
    }
    if (closeIdx === -1) continue;
    const inside = body.slice(start.index, closeIdx + 1);
    if (!inside.includes('--duration-')) continue;
    const after = body.slice(closeIdx + 1, closeIdx + 30);
    if (!/^\s*\/\s*1000\b/.test(after)) {
      return true;
    }
  }
  return false;
}

function countRangeInputs(html: string): number {
  return (html.match(/<input\b[^>]*\btype\s*=\s*(?:"range"|'range'|range)(?=[\s>])/gi) ?? []).length;
}

const RULES: Rule[] = [
  {
    key: 'js-var-token',
    severity: 'blocker',
    hint: 'Do not use CSS var(--token) syntax inside JavaScript. Use literal numbers or read tokens via getComputedStyle(document.documentElement).getPropertyValue("--token").trim().',
    check: ({ scripts }) => {
      for (const script of scripts) {
        const stripped = stripStringLiterals(script.body);
        if (/\bvar\s*\(\s*--/.test(stripped)) {
          return 'Found `var(--...)` syntax in JavaScript code (outside string literals).';
        }
      }
      return null;
    },
  },
  {
    key: 'gsap-svg-attr-conflict',
    severity: 'blocker',
    hint: 'When using d3 .attr("x"|"y"|"width"|"height", …) on SVG elements, animate with gsap.to(el, { attr: { x, y, width, height } }) or use d3.transition() — never gsap.to(el, { x, y, width, height }) bare shorthand, which doubles positions.',
    check: ({ scripts }) => {
      for (const script of scripts) {
        // Use raw body so we see the "x" string argument; only strip for the gsap arg scan.
        const hasD3Attr = /\.attr\s*\(\s*(["'])(?:x|y|width|height)\1/i.test(script.body);
        if (!hasD3Attr) continue;
        const stripped = stripStringLiterals(script.body);
        const bareGsapRe = /gsap\s*\.\s*(?:to|from|fromTo|set)\s*\(\s*[^,]+,\s*\{([^}]*)\}/g;
        let m: RegExpExecArray | null;
        while ((m = bareGsapRe.exec(stripped))) {
          const props = m[1];
          const mentionsBare = /\b(?:x|y|width|height)\s*:/.test(props);
          const hasAttrWrapper = /\battr\s*:/.test(props);
          if (mentionsBare && !hasAttrWrapper) {
            return 'gsap.to(...) uses bare {x|y|width|height} on an SVG element that also has .attr() set — produces doubled positions.';
          }
        }
      }
      return null;
    },
  },
  {
    key: 'gsap-css-bezier-ease',
    severity: 'blocker',
    hint: 'gsap.to ease must be a named ease ("power2.out", "sine.inOut", etc.) or a function. CSS cubic-bezier(...) strings silently fall back to linear.',
    check: ({ scripts }) => {
      for (const script of scripts) {
        if (/ease\s*:\s*['"`]cubic-bezier\s*\(/i.test(script.body)) {
          return 'Found `ease: "cubic-bezier(...)"` passed to gsap — gsap does not accept CSS bezier strings.';
        }
      }
      return null;
    },
  },
  {
    key: 'gsap-ms-duration',
    severity: 'blocker',
    hint: '--duration-* tokens are in milliseconds. gsap.to duration is in seconds. Either use literal seconds (0.22) or divide the token value by 1000 before passing to gsap.',
    check: ({ scripts }) => {
      for (const script of scripts) {
        if (!findUnconvertedDurationParseFloat(script.body)) continue;
        if (/gsap\s*\./.test(script.body) && /duration\s*:/.test(script.body)) {
          return 'parseFloat(--duration-*) result is passed to gsap without /1000 conversion (token is ms, gsap wants seconds).';
        }
      }
      return null;
    },
  },
  {
    key: 'root-redeclaration',
    severity: 'warning',
    hint: 'Do not redeclare design-token variables (--color-*, --shadow-*, --radius-*, --space-*, --font-*, --duration-*, --ease-*) in your own <style>. The runtime injects them — your redeclaration overrides theming.',
    check: ({ html }) => {
      // Find <style> blocks WITHOUT data-primoria-visual-* attribute
      const styleRe = /<style\b([^>]*)>([\s\S]*?)<\/style>/gi;
      let m: RegExpExecArray | null;
      while ((m = styleRe.exec(html))) {
        const attrs = m[1] ?? '';
        const body = m[2] ?? '';
        if (/data-primoria-visual-/i.test(attrs)) continue;
        if (/:root\b[^{]*\{[^}]*--(?:color|shadow|radius|space|font|duration|ease)-/i.test(body)) {
          return 'AI-authored <style> contains a :root { --color-* / --duration-* / ... } redeclaration.';
        }
      }
      return null;
    },
  },
  {
    key: 'missing-primary-visual',
    severity: 'blocker',
    hint: 'Render the hero teaching visual as an actual <svg> or <canvas> inside .iv-visual-card on first paint.',
    check: ({ html }) => {
      const hasVisualCard = /\biv-visual-card\b/i.test(html);
      const hasGraphic = /<(svg|canvas)\b/i.test(html);
      if (!hasVisualCard) {
        return 'HTML is missing the .iv-visual-card hero container.';
      }
      if (!hasGraphic) {
        return 'HTML does not render an <svg> or <canvas> for the primary visual.';
      }
      return null;
    },
  },
  {
    key: 'range-input-no-live-update',
    severity: 'blocker',
    hint: 'Range inputs must update on the input event while dragging, not only on change/release.',
    check: ({ html, scripts }) => {
      if (!/<input\b[^>]*\btype\s*=\s*(?:"range"|'range'|range)(?=[\s>])/i.test(html)) {
        return null;
      }
      if (hasLiveInputUpdates(html, scripts)) {
        return null;
      }
      return 'HTML contains range inputs but no live input handler (addEventListener("input") or oninput=) was found.';
    },
  },
  {
    key: 'fraction-dropdown-instead-of-direct-input',
    severity: 'blocker',
    hint: 'Fraction and decimal visuals should use a direct text/number input for quick entry. Do not rely on a dropdown as the primary value picker.',
    check: ({ html, plan }) => {
      if (!isFractionLikePlan(plan) || !/<select\b/i.test(html)) {
        return null;
      }
      const hasDirectInput = /<input\b[^>]*\btype\s*=\s*(?:"text"|'text'|text|"number"|'number'|number)(?=[\s>])/i.test(html) ||
        /<input\b(?![^>]*\btype\s*=)[^>]*>/i.test(html);
      if (hasDirectInput) {
        return null;
      }
      return 'Fraction-style visualization uses a <select> but no direct text/number input for quick value entry.';
    },
  },
  {
    key: 'fraction-missing-decimal-readout',
    severity: 'blocker',
    hint: 'Fraction visuals must show a decimal conversion, ideally labeled as decimal and positioned directly below the pie chart.',
    check: ({ html, plan }) => {
      if (!isFractionLikePlan(plan)) {
        return null;
      }
      const strippedInputLabel = html.replace(/enter fraction or decimal/gi, '');
      if (/\bdecimal\b/i.test(strippedInputLabel) || /小数/.test(strippedInputLabel)) {
        return null;
      }
      return 'Fraction-style visualization does not expose an obvious decimal readout label.';
    },
  },
  {
    key: 'fraction-missing-sliders',
    severity: 'blocker',
    hint: 'Fraction editing visuals must expose both numerator and denominator sliders with clear labels.',
    check: ({ html, plan }) => {
      if (!isFractionLikePlan(plan)) {
        return null;
      }
      if (countRangeInputs(html) < 2) {
        return 'Fraction-style visualization is missing the required numerator and denominator slider pair.';
      }
      const hasNumeratorLabel = /\bnumerator\b/i.test(html) || /分子/.test(html);
      const hasDenominatorLabel = /\bdenominator\b/i.test(html) || /分母/.test(html);
      if (!hasNumeratorLabel || !hasDenominatorLabel) {
        return 'Fraction-style visualization is missing a clear numerator or denominator label for its sliders.';
      }
      return null;
    },
  },
  {
    key: 'key-elements-missing-text-labels',
    severity: 'warning',
    hint: 'plan.keyElements mentions numeric/text labels but no <text> elements were emitted. Render the labels as actual <text> nodes (not just aria-labels).',
    check: ({ html, plan }) => {
      const mentionsLabels = plan.keyElements.some((el) =>
        /\b(label|labels|数字|数值|value|values|number|numbers|tick|ticks|caption|annotation)\b/i.test(el),
      );
      if (!mentionsLabels) return null;
      const textCount = (html.match(/<text\b/gi) ?? []).length;
      if (textCount === 0) {
        return 'plan.keyElements mentions labels/numbers but no <text> elements were rendered.';
      }
      return null;
    },
  },
  {
    key: 'empty-script-init',
    severity: 'warning',
    hint: 'The module script never wires up an event listener nor calls an init function at top-level. Make sure the visualization is initialized.',
    check: ({ scripts }) => {
      const moduleScripts = scripts.filter((s) => s.isModule);
      if (moduleScripts.length === 0) return null;
      for (const script of moduleScripts) {
        const stripped = stripStringLiterals(script.body);
        const hasListener = /addEventListener\s*\(/.test(stripped);
        // Look for a top-level call: function name followed by () at the start of a line.
        // Heuristic: line that starts with a bare identifier(...) and not 'function' / 'const' / 'let' / 'var' / 'export' / 'import' / 'if' / 'for' / 'while' / 'class' / 'return'
        const topLevelCallRe = /^\s*(?!function\b|const\b|let\b|var\b|export\b|import\b|if\b|for\b|while\b|class\b|return\b|\/\/|\/\*|\}|\{|\}\s*\)|\.|\*|\s*$)[A-Za-z_$][\w$]*\s*\(/m;
        const hasTopLevelInit = topLevelCallRe.test(stripped);
        if (hasListener || hasTopLevelInit) return null;
      }
      return 'Module script has no event listeners and no top-level initialization call.';
    },
  },
  {
    key: 'dom-references-undefined',
    severity: 'blocker',
    hint: 'Every document.getElementById("X") and document.querySelector("#X") must target an id that exists in the HTML. Missing ids result in null and unhandled TypeErrors.',
    check: ({ scripts, ids }) => {
      const getByIdRe = /document\s*\.\s*getElementById\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      const queryHashRe = /document\s*\.\s*querySelector(?:All)?\s*\(\s*['"]#([A-Za-z_-][\w-]*)['"]/g;
      for (const script of scripts) {
        let m: RegExpExecArray | null;
        while ((m = getByIdRe.exec(script.body))) {
          if (!ids.has(m[1])) {
            return `document.getElementById("${m[1]}") targets an id not present in the HTML.`;
          }
        }
        while ((m = queryHashRe.exec(script.body))) {
          if (!ids.has(m[1])) {
            return `document.querySelector("#${m[1]}") targets an id not present in the HTML.`;
          }
        }
      }
      return null;
    },
  },
];

export function auditHtmlStatic(html: string, plan: Plan): AuditReport {
  const ctx: AuditContext = {
    html,
    plan,
    scripts: extractScripts(html),
    ids: extractIds(html),
  };

  const blockers: AuditIssue[] = [];
  const warnings: AuditIssue[] = [];

  for (const rule of RULES) {
    const finding = rule.check(ctx);
    if (!finding) continue;
    const issue: AuditIssue = {
      rule: rule.key,
      severity: rule.severity,
      message: finding,
      hint: rule.hint,
    };
    if (rule.severity === 'blocker') {
      blockers.push(issue);
    } else {
      warnings.push(issue);
    }
  }

  return {
    blockers,
    warnings,
    passed: blockers.length === 0,
  };
}

export function formatAuditIssuesForRepair(issues: AuditIssue[]): string[] {
  return issues.map((issue) => `[${issue.rule}] ${issue.message} HINT: ${issue.hint}`);
}
