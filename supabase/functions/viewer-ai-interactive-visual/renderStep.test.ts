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

const GEOMETRY_PLAN: Plan = {
  approach: 'Show one original triangle and one transformed triangle on a coordinate plane.',
  technology: 'svg',
  template: 'geometry-transformations',
  palette: { mode: 'auto', primary: '#2563eb', accent: '#e4572e', surface: '#ffffff' },
  keyElements: ['coordinate plane', 'original triangle', 'transformed triangle', 'vertex labels'],
  interactions: [
    { control: 'slider:translate_x', purpose: 'move the shape horizontally' },
    { control: 'slider:rotation_degrees', purpose: 'rotate the shape around its center' },
  ],
  accessibilityNotes: ['controls have labels'],
  observationCopyHint: 'The transformed triangle moves while the original stays as a reference.',
};

const CHEMISTRY_PLAN: Plan = {
  approach: 'Show one safe reaction with a particle view and a live balanced-equation check.',
  technology: 'svg',
  template: 'chemical-reactions',
  palette: { mode: 'auto', primary: '#2563eb', accent: '#e4572e', surface: '#ffffff' },
  keyElements: ['reaction equation', 'reactant zone', 'product zone', 'particle view'],
  interactions: [{ control: 'slider:temperature', purpose: 'change collision energy' }],
  accessibilityNotes: ['controls have labels'],
  observationCopyHint: 'The equation is balanced and the particles are colliding with more energy.',
};

const WORLD_GEOGRAPHY_PLAN: Plan = {
  approach: 'Show a simplified offline map with clickable regions and a details panel.',
  technology: 'svg',
  template: 'world-geography',
  palette: { mode: 'auto', primary: '#2563eb', accent: '#e4572e', surface: '#ffffff' },
  keyElements: ['world map', 'selected region details', 'continent filters'],
  interactions: [{ control: 'button:continent_filter', purpose: 'focus one region group' }],
  accessibilityNotes: ['controls have labels'],
  observationCopyHint: 'The selected region updates the geography facts immediately.',
};

const PROBABILITY_PLAN: Plan = {
  approach: 'Show a pre-populated dice histogram and compare experiment against theory.',
  technology: 'svg',
  template: 'probability-dice',
  palette: { mode: 'auto', primary: '#2563eb', accent: '#e4572e', surface: '#ffffff' },
  keyElements: ['histogram bars', 'theoretical overlay', 'stats readout'],
  interactions: [{ control: 'button:roll_25', purpose: 'add more trials' }],
  accessibilityNotes: ['controls have labels'],
  observationCopyHint: 'More trials make the experimental results move closer to theory.',
};

const WAVE_SOUND_PLAN: Plan = {
  approach: 'Show one waveform and one compression model side by side.',
  technology: 'svg',
  template: 'wave-sound',
  palette: { mode: 'auto', primary: '#2563eb', accent: '#e4572e', surface: '#ffffff' },
  keyElements: ['waveform', 'compression bands', 'observation strip'],
  interactions: [{ control: 'slider:wavelength', purpose: 'change spacing between compression bands' }],
  accessibilityNotes: ['controls have labels'],
  observationCopyHint: 'Shorter wavelengths squeeze the compression bands together.',
};

const PROJECTILE_PLAN: Plan = {
  approach: 'Show one projectile arc with live flight measurements and simple comparisons.',
  technology: 'svg',
  template: 'projectile',
  palette: { mode: 'auto', primary: '#2563eb', accent: '#e4572e', surface: '#ffffff' },
  keyElements: ['launch point', 'trajectory path', 'apex marker', 'landing marker', 'metrics strip'],
  interactions: [{ control: 'slider:launch_angle', purpose: 'change the arc shape and landing distance' }],
  accessibilityNotes: ['controls have labels'],
  observationCopyHint: 'Higher launch angles trade range for height in this no-drag model.',
};

const PROGRAMMING_LOGIC_PLAN: Plan = {
  approach: 'Show a fixed loop example with visible state changes.',
  technology: 'svg',
  template: 'programming-logic-flow',
  palette: { mode: 'auto', primary: '#2563eb', accent: '#e4572e', surface: '#ffffff' },
  keyElements: ['flowchart', 'state panel', 'pseudocode list'],
  interactions: [{ control: 'button:step', purpose: 'advance execution one state change at a time' }],
  accessibilityNotes: ['controls have labels'],
  observationCopyHint: 'Odd values update total while even values skip the add step.',
};

const SUPPLY_DEMAND_PLAN: Plan = {
  approach: 'Show supply and demand curves, then compare equilibrium with a chosen market price.',
  technology: 'svg',
  template: 'supply-demand',
  palette: { mode: 'auto', primary: '#2563eb', accent: '#e4572e', surface: '#ffffff' },
  keyElements: ['price axis', 'quantity axis', 'equilibrium marker'],
  interactions: [{ control: 'slider:market_price', purpose: 'compare equilibrium against the current market price' }],
  accessibilityNotes: ['controls have labels'],
  observationCopyHint: 'A shortage appears when demand stays above supply at the chosen price.',
};

const WEATHER_CLIMATE_PLAN: Plan = {
  approach: 'Compare a short-term weather scene with a long-term regional climate baseline.',
  technology: 'svg',
  template: 'weather-climate',
  palette: { mode: 'auto', primary: '#2563eb', accent: '#e4572e', surface: '#ffffff' },
  keyElements: ['weather scene', 'climate baseline panel', 'region controls'],
  interactions: [{ control: 'button:region', purpose: 'switch the selected climate baseline' }],
  accessibilityNotes: ['controls have labels'],
  observationCopyHint: 'Today is wetter than the selected region’s climate baseline.',
};

const HISTORICAL_TIMELINE_PLAN: Plan = {
  approach: 'Show one horizontal timeline with embedded events and a details panel.',
  technology: 'svg',
  template: 'historical-timeline',
  palette: { mode: 'auto', primary: '#2563eb', accent: '#e4572e', surface: '#ffffff' },
  keyElements: ['timeline axis', 'event markers', 'details panel'],
  interactions: [{ control: 'slider:zoom', purpose: 'change event spacing while keeping chronology visible' }],
  accessibilityNotes: ['controls have labels'],
  observationCopyHint: 'The selected event overlaps with nearby developments in the current filter.',
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

Deno.test('buildRenderPrompt injects geometry-transformation-specific implementation guidance', () => {
  const prompt = buildRenderPrompt({
    plan: GEOMETRY_PLAN,
    input: {
      prompt: 'Create an interactive geometry transformations visualizer for a triangle on a coordinate plane.',
      language: 'en',
      surface: 'builder',
      title: 'Geometry Transformations Studio',
      description: 'Translate, rotate, reflect, and scale shapes on a live grid.',
    },
  });

  assertIncludes(prompt, 'Render with SVG only inside .iv-visual-card.');
  assertIncludes(prompt, 'Do not use canvas, D3, GSAP, or CSS transform-based geometry.');
  assertIncludes(prompt, 'On first paint, both the original and transformed triangles must already be visible.');
  assertIncludes(prompt, 'Update SVG geometry directly with setAttribute(\'points\', ...)');
  assertIncludes(prompt, 'toggle:reflect_x');
  assertIncludes(prompt, 'track(\'transform_changed\'');
});

Deno.test('buildRenderPrompt injects chemistry-specific implementation guidance', () => {
  const prompt = buildRenderPrompt({
    plan: CHEMISTRY_PLAN,
    input: {
      prompt: 'Create an interactive chemical reactions simulator for one safe reaction.',
      language: 'en',
      surface: 'builder',
      title: 'Chemical Reactions Simulator',
      description: 'Balance reactions and watch particles rearrange into products.',
    },
  });

  assertIncludes(prompt, 'Render with SVG only inside .iv-visual-card.');
  assertIncludes(prompt, 'On first paint, show one simple reaction already visible');
  assertIncludes(prompt, 'Do not use canvas, D3, GSAP');
  assertIncludes(prompt, 'track(\'reaction_changed\'');
});

Deno.test('buildRenderPrompt injects world-geography-specific implementation guidance', () => {
  const prompt = buildRenderPrompt({
    plan: WORLD_GEOGRAPHY_PLAN,
    input: {
      prompt: 'Create an interactive world geography explorer with continent filters.',
      language: 'en',
      surface: 'builder',
      title: 'World Geography Explorer',
      description: 'Click regions on a world map to compare countries and climates.',
    },
  });

  assertIncludes(prompt, 'simplified offline world map');
  assertIncludes(prompt, 'Do not use canvas, D3, GSAP, external map tiles, GeoJSON, TopoJSON');
  assertIncludes(prompt, 'continent filter buttons');
  assertIncludes(prompt, 'track(\'region_selected\'');
});

Deno.test('buildRenderPrompt injects probability-dice-specific implementation guidance', () => {
  const prompt = buildRenderPrompt({
    plan: PROBABILITY_PLAN,
    input: {
      prompt: 'Create an interactive probability and dice simulation with a histogram.',
      language: 'en',
      surface: 'builder',
      title: 'Probability and Dice Simulator',
      description: 'Roll dice, graph outcomes, and compare theory with experiment.',
    },
  });

  assertIncludes(prompt, 'On first paint, show a histogram that is already populated');
  assertIncludes(prompt, 'Do not use canvas, Chart.js, D3, GSAP');
  assertIncludes(prompt, 'button:roll_25');
  assertIncludes(prompt, 'track(\'roll_batch\'');
});

Deno.test('buildRenderPrompt injects wave-sound-specific implementation guidance', () => {
  const prompt = buildRenderPrompt({
    plan: WAVE_SOUND_PLAN,
    input: {
      prompt: 'Create an interactive wave and sound visualizer with wavelength and volume controls.',
      language: 'en',
      surface: 'builder',
      title: 'Wave and Sound Visualization',
      description: 'Tune wave properties and connect the graph to sound behavior.',
    },
  });

  assertIncludes(prompt, 'Render with SVG only inside .iv-visual-card.');
  assertIncludes(prompt, 'Do not use canvas, Web Audio, D3, GSAP');
  assertIncludes(prompt, 'compression and rarefaction');
  assertIncludes(prompt, 'track(\'wave_changed\'');
});

Deno.test('buildRenderPrompt injects projectile-specific implementation guidance', () => {
  const prompt = buildRenderPrompt({
    plan: PROJECTILE_PLAN,
    input: {
      prompt: 'Create an interactive projectile motion visualization with launch angle and speed controls.',
      language: 'en',
      surface: 'builder',
      title: 'Projectile Motion',
      description: 'Change launch conditions and inspect the trajectory.',
    },
  });

  assertIncludes(prompt, 'Suggested title: Projectile Motion Lab');
  assertIncludes(prompt, 'Render one complete projectile trajectory on first paint');
  assertIncludes(prompt, 'SVG only inside .iv-visual-card');
  assertIncludes(prompt, 'constant gravity');
  assertIncludes(prompt, 'track(\'projectile_changed\'');
});

Deno.test('buildRenderPrompt injects programming-logic-flow-specific implementation guidance', () => {
  const prompt = buildRenderPrompt({
    plan: PROGRAMMING_LOGIC_PLAN,
    input: {
      prompt: 'Create an interactive programming logic flow visualizer for a loop.',
      language: 'en',
      surface: 'builder',
      title: 'Programming Logic Flow',
      description: 'Step through conditions and loops to follow program state changes.',
    },
  });

  assertIncludes(prompt, 'show a complete small flowchart already visible');
  assertIncludes(prompt, 'Do not use canvas, GSAP, or freeform code execution');
  assertIncludes(prompt, 'button:step');
  assertIncludes(prompt, 'track(\'logic_step\'');
});

Deno.test('buildRenderPrompt injects supply-demand-specific implementation guidance', () => {
  const prompt = buildRenderPrompt({
    plan: SUPPLY_DEMAND_PLAN,
    input: {
      prompt: 'Create an interactive supply and demand graph with equilibrium and shortage explanations.',
      language: 'en',
      surface: 'builder',
      title: 'Supply and Demand Economics',
      description: 'Shift market curves and watch equilibrium respond instantly.',
    },
  });

  assertIncludes(prompt, 'labeled price and quantity axes');
  assertIncludes(prompt, 'market-price reference line');
  assertIncludes(prompt, 'slider:market_price');
  assertIncludes(prompt, 'track(\'market_shifted\'');
});

Deno.test('buildRenderPrompt injects weather-climate-specific implementation guidance', () => {
  const prompt = buildRenderPrompt({
    plan: WEATHER_CLIMATE_PLAN,
    input: {
      prompt: 'Create an interactive weather and climate explorer for different regions.',
      language: 'en',
      surface: 'builder',
      title: 'Weather and Climate Systems',
      description: 'Compare weather patterns, seasonal changes, and climate trends.',
    },
  });

  assertIncludes(prompt, 'Do not use canvas, remote data, maps, GSAP');
  assertIncludes(prompt, 'weather scene and baseline visible together');
  assertIncludes(prompt, 'button-group:region');
  assertIncludes(prompt, 'track(\'weather_region_changed\'');
});

Deno.test('buildRenderPrompt injects historical-timeline-specific implementation guidance', () => {
  const prompt = buildRenderPrompt({
    plan: HISTORICAL_TIMELINE_PLAN,
    input: {
      prompt: 'Create an interactive historical timeline explorer with zoom and filters.',
      language: 'en',
      surface: 'builder',
      title: 'Historical Timeline Explorer',
      description: 'Zoom through eras, filter events, and compare changes across history.',
    },
  });

  assertIncludes(prompt, 'horizontal timeline with multiple visible events already embedded');
  assertIncludes(prompt, 'All event data must be embedded locally');
  assertIncludes(prompt, 'slider:zoom');
  assertIncludes(prompt, 'track(\'timeline_event_selected\'');
});
