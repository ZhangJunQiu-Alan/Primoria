import { CORE_SYSTEM_INSTRUCTION, CORE_SYSTEM_PROMPT } from './prompts/coreSystem.ts';
import { DESIGN_TOKEN_GUIDE } from './prompts/designTokens.ts';
import { pickSkillsForTemplate, renderSkills } from './prompts/skills/index.ts';
import { buildTopicMemoryBlock } from './prompts/topicMemories.ts';
import type { Plan } from './planSchema.ts';
import {
  callGeminiOnce,
  GEMINI_RENDER_MODELS,
  GenerationAttemptError,
  type GenerationErrorKind,
} from './geminiCall.ts';

const RENDER_TEMPERATURE = 0.45;
const RENDER_MAX_OUTPUT_TOKENS = 16_384;

export type RenderInput = {
  prompt: string;
  template?: string;
  experienceMode?: string;
  title?: string;
  description?: string;
  language?: 'en' | 'zh-CN';
  surface?: string;
};

const IV_CLASS_GUIDE = `
Use these injected layout classes (do not redefine them):
- iv-shell, iv-header, iv-kicker, iv-title, iv-subtitle
- iv-layout, iv-card, iv-visual-card, iv-controls-card, iv-observation-card
- iv-section-title, iv-control, iv-control-row, iv-label, iv-value
- iv-note, iv-conclusion, iv-formula, iv-pill, iv-badge
The visualization belongs inside .iv-visual-card. Sliders / buttons belong inside .iv-controls-card. A short live insight belongs inside .iv-observation-card.
`.trim();

export function buildRenderPrompt(args: {
  plan: Plan;
  input: RenderInput;
  repairErrors?: string[];
}) {
  const { plan, input, repairErrors } = args;
  const skills = pickSkillsForTemplate(plan.template, plan.technology, input.prompt);
  const skillBlock = renderSkills(skills);
  const topicMemoryBlock = buildTopicMemoryBlock([
    input.prompt,
    input.template,
    input.title,
    input.description,
  ].filter(Boolean).join('\n'));
  const languageLine =
    input.language === 'zh-CN'
      ? 'Write learner-facing labels and explanatory text in Simplified Chinese.'
      : 'Write learner-facing labels and explanatory text in English.';

  const planBlock = [
    `Plan JSON (authoritative — implement exactly):\n${JSON.stringify(plan, null, 2)}`,
    'Implementation contract for the plan:',
    '- Every item in plan.keyElements MUST have a VISIBLE, identifiable counterpart in the rendered HTML. If keyElements lists "Numerical labels on bars", you MUST render <text> elements next to each bar showing the number — aria-labels alone do NOT satisfy this requirement.',
    '- Every item in plan.interactions MUST be wired to working JavaScript that updates the visualization and produces a visible reaction.',
    '- plan.observationCopyHint must materialize as live-updating text inside .iv-observation-card (or .iv-conclusion).',
    '- plan.palette colors are the visual identity — use plan.palette.primary for the primary accent and plan.palette.accent for secondary highlights when token defaults are not appropriate.',
    '- Before finishing, mentally walk through each keyElement and confirm a reader scanning the page would visually identify it without inspecting code or hovering.',
  ].join('\n');

  const authorContext = [
    `- Surface: ${input.surface ?? 'builder'}`,
    `- Suggested title: ${input.title?.trim() || 'none'}`,
    `- Suggested description: ${input.description?.trim() || 'none'}`,
  ].join('\n');

  const repairBlock = (repairErrors ?? []).length
    ? `Previous HTML failed validation. Fix the issues, keep the plan above intact, and return a complete document.\nValidation errors to fix:\n${(repairErrors ?? [])
        .map((err, idx) => `${idx + 1}. ${err}`)
        .join('\n')}\nDo not explain the fix.`
    : '';

  return [
    CORE_SYSTEM_PROMPT,
    DESIGN_TOKEN_GUIDE,
    skillBlock,
    topicMemoryBlock,
    IV_CLASS_GUIDE,
    planBlock,
    languageLine,
    `Author context:\n${authorContext}`,
    `Learner request:\n${input.prompt.trim()}`,
    repairBlock,
  ]
    .filter((part) => part && part.trim().length > 0)
    .join('\n\n');
}

export async function generateInteractiveHtmlFromPlan(
  apiKey: string,
  input: RenderInput,
  plan: Plan,
  repairErrors: string[] = [],
  extractor: (text: string) => string | null,
  validate: (html: string) => void,
): Promise<string> {
  const prompt = buildRenderPrompt({ plan, input, repairErrors });
  let lastError = 'Render generation failed.';
  let lastKind: GenerationErrorKind = 'fatal';
  let lastHttpStatus: number | undefined;

  for (const model of GEMINI_RENDER_MODELS) {
    const res = await callGeminiOnce({
      apiKey,
      model,
      systemInstruction: CORE_SYSTEM_INSTRUCTION,
      prompt,
      temperature: RENDER_TEMPERATURE,
      maxOutputTokens: RENDER_MAX_OUTPUT_TOKENS,
    });
    if (!res.ok) {
      lastError = res.message;
      lastKind = res.transient ? 'transient' : 'fatal';
      lastHttpStatus = res.status;
      continue;
    }
    lastHttpStatus = undefined;
    for (const text of res.candidateTexts) {
      const html = extractor(text);
      if (!html) {
        lastError = 'Gemini did not return a complete HTML document.';
        lastKind = 'validation';
        continue;
      }
      try {
        validate(html);
        return html;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'HTML validation failed.';
        lastKind = 'validation';
      }
    }
  }

  throw new GenerationAttemptError(lastError, lastKind, lastHttpStatus, 'render');
}
