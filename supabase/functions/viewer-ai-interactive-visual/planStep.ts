import { CORE_SYSTEM_INSTRUCTION, PLAN_INSTRUCTIONS } from './prompts/coreSystem.ts';
import { DESIGN_TOKEN_GUIDE } from './prompts/designTokens.ts';
import { type Plan, parsePlanText, PlanParseError } from './planSchema.ts';
import {
  callGeminiOnce,
  GEMINI_PLAN_MODELS,
  GenerationAttemptError,
  type GenerationErrorKind,
} from './geminiCall.ts';

const PLAN_TEMPERATURE = 0.4;
const PLAN_MAX_OUTPUT_TOKENS = 4_096;

export type PlanInput = {
  prompt: string;
  template?: string;
  experienceMode?: string;
  title?: string;
  description?: string;
  language?: 'en' | 'zh-CN';
  surface?: string;
};

export function buildPlanPrompt(input: PlanInput, repairNote?: string) {
  const languageLine =
    input.language === 'zh-CN'
      ? 'Note: learner-facing copy will later be rendered in Simplified Chinese.'
      : 'Note: learner-facing copy will later be rendered in English.';
  const templateHint = input.template?.trim() && input.template !== 'generic'
    ? `Author suggested template family: ${input.template}.`
    : 'No template preference from author.';
  const modeHint = input.experienceMode
    ? `Author requested experienceMode: ${input.experienceMode}.`
    : 'experienceMode not specified.';

  const parts = [
    PLAN_INSTRUCTIONS,
    DESIGN_TOKEN_GUIDE,
    languageLine,
    templateHint,
    modeHint,
    `Author context:\n- Surface: ${input.surface ?? 'builder'}\n- Suggested title: ${input.title?.trim() || 'none'}\n- Suggested description: ${input.description?.trim() || 'none'}`,
    `Learner request:\n${input.prompt.trim()}`,
  ];

  if (repairNote?.trim()) {
    parts.push(`Repair note: ${repairNote.trim()}`);
  }

  return parts.join('\n\n');
}

export async function generateInteractivePlan(
  apiKey: string,
  input: PlanInput,
  repairNote?: string,
): Promise<Plan> {
  const prompt = buildPlanPrompt(input, repairNote);
  let lastError = 'Plan generation failed.';
  let lastKind: GenerationErrorKind = 'fatal';
  let lastHttpStatus: number | undefined;

  for (const model of GEMINI_PLAN_MODELS) {
    const res = await callGeminiOnce({
      apiKey,
      model,
      systemInstruction: CORE_SYSTEM_INSTRUCTION,
      prompt,
      temperature: PLAN_TEMPERATURE,
      maxOutputTokens: PLAN_MAX_OUTPUT_TOKENS,
    });
    if (!res.ok) {
      lastError = res.message;
      lastKind = res.transient ? 'transient' : 'fatal';
      lastHttpStatus = res.status;
      continue;
    }
    lastHttpStatus = undefined;
    for (const text of res.candidateTexts) {
      try {
        return parsePlanText(text);
      } catch (error) {
        if (error instanceof PlanParseError) {
          const snippet = error.raw.replace(/\s+/g, ' ').trim().slice(0, 400);
          const issues = error.issues.slice(0, 4).join('; ');
          lastError = `${error.message} ${issues} | raw: ${snippet}`.trim();
        } else {
          lastError = error instanceof Error ? error.message : 'Plan parse failed.';
        }
        lastKind = 'validation';
      }
    }
  }

  throw new GenerationAttemptError(lastError, lastKind, lastHttpStatus, 'plan');
}
