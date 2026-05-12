import { buildRenderPrompt } from './renderStep.ts';
import type { Plan } from './planSchema.ts';

function assertIncludes(value: string, expected: string) {
  if (!value.includes(expected)) {
    throw new Error(`expected value to include "${expected}"`);
  }
}

const FRACTION_PLAN: Plan = {
  approach: 'Show one fraction in multiple representations and let the learner edit it directly.',
  technology: 'svg',
  template: 'fraction-explorer',
  palette: { mode: 'auto', primary: '#2563eb', accent: '#e4572e', surface: '#ffffff' },
  keyElements: ['fraction text', 'decimal text', 'pie chart', 'number-line marker'],
  interactions: [
    { control: 'input:fraction', purpose: 'enter a fraction or decimal directly' },
    { control: 'slider:numerator', purpose: 'adjust the numerator live' },
    { control: 'slider:denominator', purpose: 'adjust the denominator live' },
  ],
  accessibilityNotes: ['text input has label', 'sliders have aria-labels'],
  observationCopyHint: '1/1 equals 100% of the whole.',
};

const GENERIC_PLAN: Plan = {
  approach: 'Show the core concept visually and let the learner manipulate it directly.',
  technology: 'svg',
  template: 'generic',
  palette: { mode: 'auto', primary: '#2563eb', accent: '#e4572e', surface: '#ffffff' },
  keyElements: ['main visual', 'live labels'],
  interactions: [{ control: 'slider:primary', purpose: 'change the main state' }],
  accessibilityNotes: ['controls have labels'],
  observationCopyHint: 'The state changes in real time.',
};

Deno.test('buildRenderPrompt injects fraction-specific implementation guidance', () => {
  const prompt = buildRenderPrompt({
    plan: FRACTION_PLAN,
    input: {
      prompt: 'Create an interactive visualization for fractions that learners can edit quickly.',
      language: 'en',
      surface: 'builder',
      title: 'Fraction Visual Explorer',
      description: 'Explore fraction representations.',
    },
  });

  assertIncludes(prompt, 'On first paint, render a fully populated state for numerator 1 and denominator 1.');
  assertIncludes(prompt, 'full pie chart');
  assertIncludes(prompt, 'decimal conversion directly below the pie chart');
  assertIncludes(prompt, 'Enter fraction or decimal');
  assertIncludes(prompt, 'Do NOT use a select dropdown as the main fraction picker.');
  assertIncludes(prompt, 'numerator slider and a denominator slider');
  assertIncludes(prompt, 'both increasing and decreasing the value');
  assertIncludes(prompt, 'maximum of two illustration sets per row');
  assertIncludes(prompt, 'update labels while dragging via the input event');
});

Deno.test('buildRenderPrompt injects topic memory for circuits prompts', () => {
  const prompt = buildRenderPrompt({
    plan: GENERIC_PLAN,
    input: {
      prompt: 'Create an interactive visualization for electrical circuits.',
      language: 'en',
      surface: 'builder',
      title: 'Circuit Builder Simulator',
      description: 'Build and test electrical circuits interactively.',
    },
  });

  assertIncludes(prompt, 'Suggested title: Circuit Builder Simulator');
  assertIncludes(prompt, 'drag and connect batteries, bulbs, switches, and resistors');
  assertIncludes(prompt, 'Animate current flow only when the circuit is complete');
});
