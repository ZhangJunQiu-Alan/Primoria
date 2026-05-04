export type InteractiveVisualMode = 'simulation' | 'graph' | 'scenario' | 'story';

export type InteractiveVisualModeOption = {
  value: InteractiveVisualMode;
  label: string;
  shortLabel: string;
  description: string;
  previewTitle: string;
  previewBody: string;
};

export const INTERACTIVE_VISUAL_MODE_OPTIONS: InteractiveVisualModeOption[] = [
  {
    value: 'simulation',
    label: 'Simulation',
    shortLabel: 'Simulation',
    description: 'Best for manipulable systems, experiments, and cause/effect exploration.',
    previewTitle: 'Interactive simulation',
    previewBody: 'Generates a live experiment with controls, animation, and measurable behavior.',
  },
  {
    value: 'graph',
    label: 'Graph',
    shortLabel: 'Graph',
    description: 'Best for curves, functions, coordinate systems, and real-time plotting.',
    previewTitle: 'Interactive graph',
    previewBody: 'Generates a plotted visual with sliders so learners can watch the graph change live.',
  },
  {
    value: 'scenario',
    label: 'Scenario',
    shortLabel: 'Scenario',
    description: 'Best for branching decisions, worked situations, and applied reasoning.',
    previewTitle: 'Interactive scenario',
    previewBody: 'Generates a guided situation with step-by-step decisions and applied feedback.',
  },
  {
    value: 'story',
    label: 'Story',
    shortLabel: 'Story',
    description: 'Best for animated explainers, concept walkthroughs, and narrative teaching.',
    previewTitle: 'Interactive story',
    previewBody: 'Generates a visual walkthrough that reveals the concept in a smoother narrative flow.',
  },
];

export function inferInteractiveVisualMode(
  prompt: string,
  preferredMode?: string | null,
): InteractiveVisualMode {
  const normalizedMode = preferredMode?.trim().toLowerCase();
  if (
    normalizedMode === 'simulation' ||
    normalizedMode === 'graph' ||
    normalizedMode === 'scenario' ||
    normalizedMode === 'story'
  ) {
    return normalizedMode;
  }

  const normalizedPrompt = prompt.toLowerCase();
  if (/(graph|curve|cos|cosine|sine|sin|plot|wave|function|trig|coordinate)/i.test(normalizedPrompt)) {
    return 'graph';
  }
  if (/(scenario|case study|roleplay|choose|branch|decision|situation|appl(y|ied))/i.test(normalizedPrompt)) {
    return 'scenario';
  }
  if (/(story|narrative|journey|walkthrough|scene|animated story|comic)/i.test(normalizedPrompt)) {
    return 'story';
  }
  return 'simulation';
}

export function getInteractiveVisualModeOption(mode: string | null | undefined) {
  return (
    INTERACTIVE_VISUAL_MODE_OPTIONS.find((option) => option.value === mode) ??
    INTERACTIVE_VISUAL_MODE_OPTIONS[0]
  );
}

export function getInteractiveVisualGenerationPreview({
  mode,
  prompt,
  template,
}: {
  mode: InteractiveVisualMode;
  prompt: string;
  template: string;
}) {
  const option = getInteractiveVisualModeOption(mode);
  const trimmedPrompt = prompt.trim();
  const promptHint = trimmedPrompt
    ? trimmedPrompt.length > 112
      ? `${trimmedPrompt.slice(0, 109).trim()}...`
      : trimmedPrompt
    : 'Describe the concept, the learner goal, and the kind of interaction you want.';

  return {
    badge: option.shortLabel,
    title: option.previewTitle,
    body: option.previewBody,
    detail:
      template && template !== 'generic'
        ? `Template family: ${template}`
        : 'Template family: chosen automatically from the prompt',
    promptHint,
  };
}
