import { buildPlanPrompt } from './planStep.ts';

function assertIncludes(value: string, expected: string) {
  if (!value.includes(expected)) {
    throw new Error(`expected value to include "${expected}"`);
  }
}

Deno.test('buildPlanPrompt injects topic memory for programming logic prompts', () => {
  const prompt = buildPlanPrompt({
    prompt: 'Create an interactive visualization for programming logic and algorithms.',
    language: 'en',
    surface: 'builder',
    title: 'Programming Logic Visualizer',
    description: 'Understand coding logic through animated execution.',
  });

  assertIncludes(prompt, 'Suggested title: Programming Logic Visualizer');
  assertIncludes(prompt, 'Show flowcharts, variables, loops, and conditionals updating dynamically');
  assertIncludes(prompt, 'Animate how data changes in memory or variable state at each step.');
});
