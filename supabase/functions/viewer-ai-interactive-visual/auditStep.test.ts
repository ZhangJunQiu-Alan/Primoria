import { AuditParseError, parseAuditText, buildAuditPrompt } from './auditStep.ts';
import type { Plan } from './planSchema.ts';

const PLAN: Plan = {
  approach: 'Stub plan for audit parser tests, long enough to satisfy zod schema length.',
  technology: 'svg',
  template: 'generic',
  palette: { mode: 'auto', primary: '#2563eb', accent: '#e4572e' },
  keyElements: ['bars', 'observation strip'],
  interactions: [{ control: 'button:next', purpose: 'advance' }],
  accessibilityNotes: ['aria labels'],
  observationCopyHint: 'Step changed.',
};

const PASS_JSON = JSON.stringify({
  verdict: 'pass',
  issues: [],
});

const REPAIR_JSON = JSON.stringify({
  verdict: 'repair',
  issues: [
    { severity: 'blocker', category: 'missing-keyElement', message: 'No <text> labels for the bars.' },
    { severity: 'warning', category: 'accessibility', message: 'Reset button missing aria-label.' },
  ],
});

Deno.test('parseAuditText accepts a pass verdict', () => {
  const report = parseAuditText(PASS_JSON);
  if (report.verdict !== 'pass') throw new Error(`expected pass, got ${report.verdict}`);
  if (report.issues.length !== 0) throw new Error('expected no issues');
});

Deno.test('parseAuditText accepts a repair verdict with issues', () => {
  const report = parseAuditText(REPAIR_JSON);
  if (report.verdict !== 'repair') throw new Error('expected repair');
  if (report.issues.length !== 2) throw new Error('expected 2 issues');
  if (report.issues[0].severity !== 'blocker') throw new Error('expected blocker first');
});

Deno.test('parseAuditText strips ```json fences', () => {
  const fenced = '```json\n' + REPAIR_JSON + '\n```';
  parseAuditText(fenced);
});

Deno.test('parseAuditText rejects malformed JSON', () => {
  try {
    parseAuditText('{ "verdict": "pass"');
    throw new Error('expected AuditParseError');
  } catch (error) {
    if (!(error instanceof AuditParseError)) throw error;
  }
});

Deno.test('parseAuditText rejects invalid verdict value', () => {
  const bad = JSON.stringify({ verdict: 'maybe', issues: [] });
  try {
    parseAuditText(bad);
    throw new Error('expected AuditParseError');
  } catch (error) {
    if (!(error instanceof AuditParseError)) throw error;
    if (error.issues.length === 0) throw new Error('expected issues list');
  }
});

Deno.test('parseAuditText rejects issue with invalid severity', () => {
  const bad = JSON.stringify({
    verdict: 'repair',
    issues: [{ severity: 'critical', category: 'x', message: 'missing label' }],
  });
  try {
    parseAuditText(bad);
    throw new Error('expected AuditParseError');
  } catch (error) {
    if (!(error instanceof AuditParseError)) throw error;
  }
});

Deno.test('parseAuditText extracts JSON embedded in extra prose', () => {
  const noisy = `Here is my review:\n${REPAIR_JSON}\nLet me know if you need anything else.`;
  parseAuditText(noisy);
});

Deno.test('buildAuditPrompt includes user prompt, plan, html, checklist', () => {
  const prompt = buildAuditPrompt({
    userPrompt: 'create a sort visualization',
    plan: PLAN,
    html: '<!doctype html><html><body></body></html>',
  });
  if (!prompt.includes('LEARNER REQUEST')) throw new Error('missing learner request section');
  if (!prompt.includes('LOCKED PLAN')) throw new Error('missing plan section');
  if (!prompt.includes('GENERATED HTML')) throw new Error('missing html section');
  if (!prompt.includes('"verdict"')) throw new Error('missing verdict instruction');
  if (!prompt.includes('missing-keyElement')) throw new Error('missing category list');
  if (!prompt.includes('create a sort visualization')) throw new Error('user prompt not injected');
});
