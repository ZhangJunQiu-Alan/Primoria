import { normalizeHexColor, parsePlanText, PlanParseError } from './planSchema.ts';

const VALID_PLAN_JSON = JSON.stringify({
  approach: 'Show y = ax + b with sliders driving slope and intercept on a coordinate plane.',
  technology: 'svg',
  template: 'linear-function',
  palette: { mode: 'auto', primary: '#2563eb', accent: '#e4572e', surface: '#ffffff' },
  keyElements: ['live formula y=ax+b', 'slope triangle', 'y-intercept marker'],
  interactions: [
    { control: 'slider:a', purpose: 'rotate the line about (0,b)' },
    { control: 'slider:b', purpose: 'shift the line vertically' },
  ],
  accessibilityNotes: ['sliders have aria-labels', 'contrast AA against surface'],
  observationCopyHint: 'Increasing a tilts the line steeper through (0, b).',
});

Deno.test('parsePlanText accepts a well-formed plan', () => {
  const plan = parsePlanText(VALID_PLAN_JSON);
  if (plan.technology !== 'svg') throw new Error('expected svg technology');
  if (plan.template !== 'linear-function') throw new Error('expected linear-function template');
  if (plan.keyElements.length < 2) throw new Error('expected at least 2 key elements');
});

Deno.test('parsePlanText strips ```json fences', () => {
  const fenced = '```json\n' + VALID_PLAN_JSON + '\n```';
  parsePlanText(fenced);
});

Deno.test('parsePlanText extracts JSON embedded in extra prose', () => {
  const noisy = `Here is the plan:\n${VALID_PLAN_JSON}\nLet me know if it works.`;
  parsePlanText(noisy);
});

Deno.test('parsePlanText rejects responses without a JSON object', () => {
  try {
    parsePlanText('Sorry, I cannot help with that request.');
    throw new Error('expected PlanParseError');
  } catch (error) {
    if (!(error instanceof PlanParseError)) throw error;
  }
});

Deno.test('parsePlanText rejects malformed JSON', () => {
  try {
    parsePlanText('{ "approach": "incomplete json"');
    throw new Error('expected PlanParseError');
  } catch (error) {
    if (!(error instanceof PlanParseError)) throw error;
  }
});

Deno.test('parsePlanText reports truncation distinctly from missing object', () => {
  const truncated = '```json\n{ "approach": "something", "palette": { "primary": "#fff",';
  try {
    parsePlanText(truncated);
    throw new Error('expected PlanParseError');
  } catch (error) {
    if (!(error instanceof PlanParseError)) throw error;
    if (!error.message.toLowerCase().includes('truncated')) {
      throw new Error(`expected truncation message, got: ${error.message}`);
    }
  }
});

Deno.test('parsePlanText reports no-object when response has no braces', () => {
  try {
    parsePlanText('Sorry, I cannot answer that.');
    throw new Error('expected PlanParseError');
  } catch (error) {
    if (!(error instanceof PlanParseError)) throw error;
    if (error.message.toLowerCase().includes('truncated')) {
      throw new Error(`no-brace response should not be reported as truncated: ${error.message}`);
    }
  }
});

Deno.test('parsePlanText rejects schema violations and lists issues', () => {
  const bad = JSON.stringify({
    approach: 'too short',
    technology: 'svg',
    template: 'x',
    palette: { mode: 'auto', primary: 'definitely-not-a-color', accent: '#e4572e' },
    keyElements: ['only one'],
    interactions: [],
    accessibilityNotes: [],
    observationCopyHint: 'ok',
  });
  try {
    parsePlanText(bad);
    throw new Error('expected PlanParseError');
  } catch (error) {
    if (!(error instanceof PlanParseError)) throw error;
    if (error.issues.length === 0) throw new Error('expected issues to be reported');
  }
});

Deno.test('normalizeHexColor accepts 6-digit hex unchanged', () => {
  if (normalizeHexColor('#2563EB') !== '#2563eb') throw new Error('expected lowercased 6-digit hex');
  if (normalizeHexColor('#ffffff') !== '#ffffff') throw new Error('expected white');
});

Deno.test('normalizeHexColor expands 3-digit shorthand', () => {
  if (normalizeHexColor('#fff') !== '#ffffff') throw new Error(`got ${normalizeHexColor('#fff')}`);
  if (normalizeHexColor('#0Af') !== '#00aaff') throw new Error(`got ${normalizeHexColor('#0Af')}`);
});

Deno.test('normalizeHexColor strips alpha from 4-digit and 8-digit hex', () => {
  if (normalizeHexColor('#fff8') !== '#ffffff') throw new Error('expected alpha-stripped white');
  if (normalizeHexColor('#2563EBFF') !== '#2563eb') throw new Error('expected alpha-stripped 8-digit');
});

Deno.test('normalizeHexColor converts rgb() and rgba()', () => {
  if (normalizeHexColor('rgb(37, 99, 235)') !== '#2563eb') {
    throw new Error(`got ${normalizeHexColor('rgb(37, 99, 235)')}`);
  }
  if (normalizeHexColor('rgba(228, 87, 46, 0.8)') !== '#e4572e') {
    throw new Error(`got ${normalizeHexColor('rgba(228, 87, 46, 0.8)')}`);
  }
});

Deno.test('normalizeHexColor rejects named colors and CSS vars', () => {
  if (normalizeHexColor('blue') !== null) throw new Error('named colors should fail');
  if (normalizeHexColor('var(--color-accent-primary)') !== null) throw new Error('CSS vars should fail');
});

Deno.test('parsePlanText accepts plan with rgb() palette and normalizes it', () => {
  const planJson = JSON.stringify({
    approach: 'Render the sine curve with sliders for amplitude, frequency, and phase live.',
    technology: 'canvas2d',
    template: 'wave',
    palette: { mode: 'auto', primary: 'rgb(37, 99, 235)', accent: '#FFF', surface: '#ffffff' },
    keyElements: ['axes with ticks', 'live sine trace', 'current-state stats'],
    interactions: [{ control: 'slider:amplitude', purpose: 'change wave height' }],
    accessibilityNotes: ['sliders have aria-labels'],
    observationCopyHint: 'Doubling amplitude doubles the peak height.',
  });
  const plan = parsePlanText(planJson);
  if (plan.palette.primary !== '#2563eb') throw new Error(`primary not normalized: ${plan.palette.primary}`);
  if (plan.palette.accent !== '#ffffff') throw new Error(`accent shorthand not expanded: ${plan.palette.accent}`);
});
