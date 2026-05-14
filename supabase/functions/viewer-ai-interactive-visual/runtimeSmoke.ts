// happy-dom runtime smoke for AI-generated interactive visuals.
//
// Goal: catch a class of bugs the static auditors cannot — script
// parse/execution errors, ReferenceErrors during initialization, dom
// queries that return null, and obviously-empty hero visuals — by
// loading the generated HTML into a headless DOM, letting it settle for
// ~1.5s, then snapshotting errors + DOM stats.
//
// Limitations:
//   * happy-dom does not actually render canvas/SVG geometry, so visual
//     bugs that manifest only on click (e.g. gsap shorthand vs. attr
//     conflict on a real browser) are still caught by static rules, not
//     by this runtime check.
//   * To keep runtime budget bounded, the heavy module-graph libraries
//     (gsap, d3, THREE, Chart) are mocked. We are checking script
//     plumbing, not library-internal behaviour.

import { Window } from 'https://esm.sh/happy-dom@14.12.3';

export type RuntimeSmokeIssue = {
  rule: string;
  severity: 'blocker' | 'warning';
  message: string;
  hint: string;
};

export type RuntimeSmokeReport = {
  issues: RuntimeSmokeIssue[];
  passed: boolean;
  errors: string[];
  domStats: { interactives: number; svgChildren: number; hasObservation: boolean };
};

const DEFAULT_SETTLE_MS = 1_500;

type QueryableDocument = {
  querySelectorAll(selector: string): { length: number };
  querySelector(selector: string): unknown | null;
};

function buildMockLibrarySetup() {
  return `
    <script>
      (function () {
        // Mock libraries the AI commonly imports so the runtime smoke can
        // walk through initialization without a real network fetch.
        // The mocks no-op every method, returning chainable proxies.
        function makeChainable(name) {
          const handler = {
            get(_target, prop) {
              if (prop === 'then' || prop === Symbol.toPrimitive) return undefined;
              return makeChainable(name);
            },
            apply() {
              return makeChainable(name);
            },
            construct() {
              return makeChainable(name);
            },
          };
          return new Proxy(function () {}, handler);
        }
        window.gsap = makeChainable('gsap');
        window.d3 = makeChainable('d3');
        window.THREE = makeChainable('three');
        window.Chart = makeChainable('chart');
      })();
    </script>
  `.trim();
}

function injectMockLibraries(html: string): string {
  const setup = buildMockLibrarySetup();
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (tag) => `${tag}\n${setup}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (tag) => `${tag}\n<head>${setup}</head>`);
  }
  return `${setup}\n${html}`;
}

function snapshotDomStats(document: QueryableDocument) {
  return {
    interactives: document.querySelectorAll('button,input,select,textarea,[role="button"]').length,
    svgChildren: document.querySelectorAll('svg *').length,
    hasObservation: Boolean(document.querySelector('.iv-observation-card, .iv-conclusion')),
  };
}

export async function runtimeSmokeHtml(
  html: string,
  options: { settleMs?: number } = {},
): Promise<RuntimeSmokeReport> {
  const settleMs = options.settleMs ?? DEFAULT_SETTLE_MS;
  const errors: string[] = [];

  // happy-dom's Window constructor accepts settings; we keep network off so
  // any rogue fetch attempt fails fast instead of hanging the smoke.
  const window = new Window({
    url: 'https://primoria-runtime-smoke.local/',
    settings: {
      disableJavaScriptFileLoading: false,
      disableJavaScriptEvaluation: false,
      enableFileSystemHttpRequests: false,
    },
  });

  // Funnel uncaught errors + console.error into the report.
  // happy-dom forwards window.onerror invocations, but to be safe also
  // override console.error so the AI's own diagnostics surface.
  const originalConsoleError = window.console.error.bind(window.console);
  window.console.error = (...args: unknown[]) => {
    errors.push(`console.error: ${args.map((a) => String(a)).join(' ')}`);
    originalConsoleError(...args);
  };
  (window as unknown as { onerror: ((message: unknown) => boolean) | null }).onerror = ((
    message: unknown,
  ) => {
    errors.push(`window.onerror: ${typeof message === 'string' ? message : 'event'}`);
    return true;
  });
  // Unhandled promise rejection forwarder.
  (
    window as unknown as {
      addEventListener: (type: string, listener: (event: { reason?: unknown }) => void) => void;
    }
  ).addEventListener('unhandledrejection', (event) => {
      const reason = (event as { reason?: unknown }).reason;
      const text = reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : 'rejection';
      errors.push(`unhandledrejection: ${text}`);
    });

  const documentHtml = injectMockLibraries(html);
  window.document.write(documentHtml);
  window.document.close();

  // Let microtasks + the post-load timer drain.
  await new Promise((resolve) => setTimeout(resolve, settleMs));
  try {
    await (window as unknown as { happyDOM: { waitUntilComplete: () => Promise<void> } }).happyDOM.waitUntilComplete();
  } catch (err) {
    errors.push(`waitUntilComplete: ${err instanceof Error ? err.message : String(err)}`);
  }

  const domStats = snapshotDomStats(window.document as unknown as QueryableDocument);

  try {
    await (window as unknown as { happyDOM: { close: () => Promise<void> } }).happyDOM.close();
  } catch (_e) {
    // best-effort teardown
  }

  const issues: RuntimeSmokeIssue[] = [];
  if (errors.length > 0) {
    issues.push({
      rule: 'runtime:script-error',
      severity: 'blocker',
      message: `Generated HTML threw ${errors.length} runtime error${errors.length === 1 ? '' : 's'} during initial render: ${errors.slice(0, 3).join(' | ')}`,
      hint:
        'Fix the JavaScript errors so the page renders cleanly on first paint. Common causes: bare variable references, missing DOM ids, calling methods on undefined library imports.',
    });
  }
  if (domStats.svgChildren === 0 && domStats.interactives === 0) {
    issues.push({
      rule: 'runtime:empty-canvas',
      severity: 'blocker',
      message: 'After initial render, the page has no SVG children and no interactive controls — the hero visual is empty.',
      hint:
        'On first paint, the .iv-visual-card must already contain a rendered <svg>/<canvas> tree showing the default teaching state. Do not require user interaction before drawing anything.',
    });
  }

  return {
    issues,
    passed: issues.length === 0,
    errors,
    domStats,
  };
}

export function formatRuntimeSmokeIssuesForRepair(issues: RuntimeSmokeIssue[]): string[] {
  return issues.map((issue) => `[${issue.rule}] ${issue.message} HINT: ${issue.hint}`);
}
