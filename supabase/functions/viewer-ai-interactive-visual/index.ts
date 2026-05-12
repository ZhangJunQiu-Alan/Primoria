import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import { z } from 'npm:zod@3.25.76';
import {
  GenerationAttemptError,
  isGenerationAttemptError,
  isTransientGeminiStatus,
} from './geminiCall.ts';
import { generateInteractivePlan } from './planStep.ts';
import { generateInteractiveHtmlFromPlan } from './renderStep.ts';
import { DESIGN_TOKEN_CSS } from './prompts/designTokens.ts';
import { buildTopicMemoryBlock } from './prompts/topicMemories.ts';
import { extractGeminiCandidateTexts } from '../_shared/geminiResponse.ts';
import type { Plan } from './planSchema.ts';
import { auditHtmlStatic, formatAuditIssuesForRepair, type AuditReport } from './htmlAuditor.ts';
import { auditHtmlWithLLM, type AuditOutcome, type LlmAuditReport } from './auditStep.ts';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.0-flash';
const FALLBACK_MODELS = ['gemini-2.5-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];
const MAX_OUTPUT_TOKENS = 16_384;
const JOB_TABLE = 'interactive_visual_generation_jobs';
const RENDER_TRANSIENT_DELAYS_MS = [2_000, 6_000, 15_000, 40_000] as const;
const PLAN_TRANSIENT_DELAYS_MS = [1_000, 3_000, 8_000, 20_000, 45_000, 60_000] as const;
const MAX_TRANSIENT_PLAN_RETRIES = PLAN_TRANSIENT_DELAYS_MS.length;
const MAX_TRANSIENT_RENDER_RETRIES = RENDER_TRANSIENT_DELAYS_MS.length;
const MAX_VALIDATION_REPAIRS = 2;
const STALE_RUNNING_AFTER_MS = 2 * 60_000;
const QUEUE_PROCESS_LIMIT = 3;

const TWO_STEP_ENABLED =
  (Deno.env.get('INTERACTIVE_VISUAL_TWO_STEP_ENABLED') ?? 'true').toLowerCase() !== 'false';
const CDN_ALLOWLIST_ENABLED =
  (Deno.env.get('INTERACTIVE_VISUAL_CDN_ALLOWLIST_ENABLED') ?? 'true').toLowerCase() !== 'false';
const STATIC_AUDIT_ENABLED =
  (Deno.env.get('INTERACTIVE_VISUAL_STATIC_AUDIT_ENABLED') ?? 'true').toLowerCase() !== 'false';
const LLM_AUDIT_ENABLED =
  (Deno.env.get('INTERACTIVE_VISUAL_LLM_AUDIT_ENABLED') ?? 'true').toLowerCase() !== 'false';

const ALLOWED_CDN_PREFIX = /^https:\/\/(?:esm\.sh\/|cdn\.jsdelivr\.net\/npm\/)/;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRIMORIA_INTERACTIVE_VISUAL_BASE_CSS = `
:root {
  --iv-page: var(--color-background-primary, #f6f3ef);
  --iv-surface: var(--color-background-secondary, #ffffff);
  --iv-surface-muted: var(--color-background-muted, #f8f5f0);
  --iv-border: var(--color-border-subtle, #ded6cc);
  --iv-text: var(--color-text-primary, #2f2a25);
  --iv-muted: var(--color-text-secondary, #6f665e);
  --iv-accent: var(--color-accent-primary, #2563eb);
  --iv-accent-2: var(--color-accent-secondary, #e4572e);
  --iv-good: var(--color-accent-success, #3f7f4f);
  --iv-shadow: var(--shadow-md, 0 10px 24px rgba(54, 42, 31, 0.08));
  --iv-radius: var(--radius-md, 8px);
  font-family: var(--font-sans, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
  background: var(--iv-page);
  color: var(--iv-text);
}

body {
  padding: 16px;
}

.iv-shell {
  width: min(100%, 1120px);
  margin: 0 auto;
  display: grid;
  gap: 14px;
}

.iv-header,
.iv-card,
.iv-visual-card,
.iv-controls-card,
.iv-observation-card {
  border: 1px solid var(--iv-border);
  border-radius: var(--iv-radius);
  background: var(--iv-surface);
  box-shadow: var(--iv-shadow);
}

.iv-header {
  padding: 16px 18px;
}

.iv-kicker {
  margin: 0 0 6px;
  color: var(--iv-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.iv-title {
  margin: 0;
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.12;
  letter-spacing: 0;
}

.iv-subtitle {
  margin: 8px 0 0;
  max-width: 78ch;
  color: var(--iv-muted);
  font-size: 15px;
  line-height: 1.55;
}

.iv-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
  gap: 14px;
  align-items: start;
}

.iv-card,
.iv-visual-card,
.iv-controls-card,
.iv-observation-card {
  padding: 16px;
}

.iv-visual-card {
  min-height: 420px;
}

.iv-section-title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 800;
  color: var(--iv-text);
}

.iv-controls-card {
  display: grid;
  gap: 14px;
}

.iv-control {
  display: grid;
  gap: 8px;
}

.iv-control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.iv-label {
  color: var(--iv-text);
  font-size: 14px;
  font-weight: 700;
}

.iv-value,
.iv-formula {
  color: var(--iv-accent);
  font-variant-numeric: tabular-nums;
  font-weight: 800;
}

.iv-note {
  margin: 0;
  color: var(--iv-muted);
  font-size: 13px;
  line-height: 1.45;
}

.iv-observation-card {
  border-left: 5px solid var(--iv-good);
  background: #fbfdf9;
}

.iv-conclusion {
  margin: 0;
  color: var(--iv-text);
  font-size: 14px;
  line-height: 1.6;
}

.iv-pill,
.iv-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  background: var(--iv-surface-muted);
  padding: 4px 9px;
  color: var(--iv-muted);
  font-size: 12px;
  font-weight: 700;
}

input[type="range"] {
  width: 100%;
  accent-color: var(--iv-accent);
}

button {
  border: 1px solid var(--iv-border);
  border-radius: 6px;
  background: var(--iv-surface);
  color: var(--iv-text);
  cursor: pointer;
  font: inherit;
}

svg,
canvas {
  display: block;
  width: 100%;
  max-width: 100%;
}

@media (max-width: 820px) {
  body {
    padding: 12px;
  }

  .iv-layout {
    grid-template-columns: 1fr;
  }

  .iv-visual-card {
    min-height: 340px;
  }
}
`.trim();

const RequestSchema = z.object({
  prompt: z.string().min(8),
  template: z.string().optional(),
  experienceMode: z.enum(['simulation', 'graph', 'scenario', 'story']).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  language: z.enum(['en', 'zh-CN']).optional(),
  surface: z.enum(['builder', 'ai-tutor']).optional(),
});

const ActionSchema = z.object({
  action: z.enum(['create', 'status', 'process', 'sync']).optional(),
  jobId: z.string().uuid().optional(),
});

type InteractiveVisualPayload = z.infer<typeof RequestSchema>;
type InteractiveVisualJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

type JobErrorEntry = {
  at: string;
  attempt: number;
  kind: 'transient' | 'validation' | 'fatal';
  message: string;
  retryable: boolean;
  nextAttemptAt?: string;
  httpStatus?: number;
  step?: 'plan' | 'render';
};

type JobRow = {
  id: string;
  user_id: string;
  status: InteractiveVisualJobStatus;
  prompt: string;
  request_payload: Record<string, unknown>;
  result_artifact: Record<string, unknown> | null;
  last_error: string | null;
  error_history: JobErrorEntry[] | null;
  attempt_count: number;
  next_attempt_at: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

function getEnv(name: string) {
  const value = Deno.env.get(name)?.trim() ?? '';
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function createUserClient(authorization: string) {
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_ANON_KEY'), {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });
}

function createServiceClient() {
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getAuthenticatedUser(req: Request) {
  const authorization = req.headers.get('Authorization') ?? '';
  const client = createUserClient(authorization);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return data.user;
}

function readBearerToken(req: Request) {
  const authorization = req.headers.get('Authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1]?.trim() ?? '';
}

function isQueueWorkerRequest(req: Request) {
  const bearer = readBearerToken(req);
  const apikey = req.headers.get('apikey')?.trim() ?? '';
  const workerToken = Deno.env.get('INTERACTIVE_VISUAL_WORKER_TOKEN')?.trim() ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim() ?? '';
  return Boolean((workerToken && bearer === workerToken) || (anonKey && bearer === anonKey) || (apikey && bearer === apikey));
}

export function isCompleteHtmlDocument(html: string) {
  const trimmed = html.trim();
  return /^<!doctype html[\s>]/i.test(trimmed) || /<html[\s>]/i.test(trimmed);
}

function removeAllowedNamespaceUrls(html: string) {
  return html
    .replace(
      /\sxmlns(?::[A-Za-z][\w.-]*)?\s*=\s*(["'])https?:\/\/www\.w3\.org\/(?:2000\/svg|1999\/xlink)\1/gi,
      '',
    )
    .replace(
      /(["'])https?:\/\/www\.w3\.org\/(?:2000\/svg|1999\/xlink)\1/gi,
      '$1$1',
    );
}

export function injectInteractiveVisualBaseStyles(html: string) {
  const alreadyInjected = /data-primoria-visual-base/i.test(html);
  const alreadyTokens = /data-primoria-visual-tokens/i.test(html);
  if (alreadyInjected && alreadyTokens) {
    return html;
  }

  const tokenTag = alreadyTokens
    ? ''
    : `<style data-primoria-visual-tokens>\n${DESIGN_TOKEN_CSS}\n</style>`;
  const baseTag = alreadyInjected
    ? ''
    : `<style data-primoria-visual-base>\n${PRIMORIA_INTERACTIVE_VISUAL_BASE_CSS}\n</style>`;
  const injection = [tokenTag, baseTag].filter(Boolean).join('\n');

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (headTag) => `${headTag}\n${injection}`);
  }

  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (htmlTag) => `${htmlTag}\n<head>\n${injection}\n</head>`);
  }

  return `${injection}\n${html}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectScriptSrcs(html: string): Array<{ src: string; isModule: boolean }> {
  const results: Array<{ src: string; isModule: boolean }> = [];
  const tagRe = /<script\b([^>]*)>/gi;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html))) {
    const attrs = match[1];
    const srcMatch = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
    if (!srcMatch) continue;
    const src = (srcMatch[1] ?? srcMatch[2] ?? '').trim();
    const isModule = /\btype\s*=\s*["']?module["']?/i.test(attrs);
    results.push({ src, isModule });
  }
  return results;
}

function collectImportSpecifiers(html: string): string[] {
  const results: string[] = [];
  const importRe = /\bimport\b[\s\S]*?\bfrom\s*(?:"([^"]+)"|'([^']+)')/g;
  let match: RegExpExecArray | null;
  while ((match = importRe.exec(html))) {
    results.push((match[1] ?? match[2] ?? '').trim());
  }
  const bareImportRe = /\bimport\s+(?:"([^"]+)"|'([^']+)')/g;
  while ((match = bareImportRe.exec(html))) {
    results.push((match[1] ?? match[2] ?? '').trim());
  }
  return results;
}

export function validateOfflineHtml(html: string) {
  if (!isCompleteHtmlDocument(html)) {
    throw new Error('Interactive visuals must be complete HTML documents.');
  }
  if (/\bimport\s*\(/i.test(html)) {
    throw new Error('Interactive visuals must not use dynamic import().');
  }
  if (/<link[^>]+href\s*=/i.test(html)) {
    throw new Error('Interactive visuals must not load external stylesheets.');
  }
  if (/<(iframe|embed|object)\b/i.test(html)) {
    throw new Error('Interactive visuals cannot embed external frames.');
  }
  if (/\bfetch\s*\(/i.test(html) || /\bXMLHttpRequest\b/i.test(html) || /\bWebSocket\b/i.test(html)) {
    throw new Error('Interactive visuals must not make network requests.');
  }

  if (!CDN_ALLOWLIST_ENABLED) {
    if (/<script[^>]+src\s*=/i.test(html)) {
      throw new Error('Interactive visuals must use inline JavaScript only.');
    }
    if (/<script[^>]+type\s*=\s*["']?module/i.test(html)) {
      throw new Error('Interactive visuals must not use module scripts.');
    }
    if (/\bhttps?:\/\//i.test(removeAllowedNamespaceUrls(html))) {
      throw new Error('Interactive visuals must be fully offline and cannot reference external URLs.');
    }
    return;
  }

  const allowedUrls: string[] = [];
  for (const { src, isModule } of collectScriptSrcs(html)) {
    if (!isModule) {
      throw new Error('Interactive visuals must use inline JavaScript only; <script src> must be type="module" on an allowlisted CDN.');
    }
    if (!ALLOWED_CDN_PREFIX.test(src)) {
      throw new Error(`Interactive visuals can only load module scripts from esm.sh or cdn.jsdelivr.net/npm: got ${src}`);
    }
    allowedUrls.push(src);
  }
  for (const specifier of collectImportSpecifiers(html)) {
    if (!ALLOWED_CDN_PREFIX.test(specifier)) {
      throw new Error(`Interactive visuals can only import modules from esm.sh or cdn.jsdelivr.net/npm: got ${specifier}`);
    }
    allowedUrls.push(specifier);
  }

  let stripped = removeAllowedNamespaceUrls(html);
  for (const url of allowedUrls) {
    stripped = stripped.replace(new RegExp(escapeRegExp(url), 'g'), '');
  }
  if (/\bhttps?:\/\//i.test(stripped)) {
    throw new Error('Interactive visuals must be fully offline and cannot reference external URLs.');
  }
}

function buildTopicSpecificGuidance(payload: z.infer<typeof RequestSchema>) {
  const topicText = [
    payload.prompt,
    payload.template,
    payload.title,
    payload.description,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join('\n')
    .toLowerCase();

  if (/(fraction|fractions|numerator|denominator|equivalent fraction|decimal|percentage|percent|number line)/i.test(topicText)) {
    return `
Topic-specific requirements for fraction visuals:
- On first paint, render a meaningful default state with numerator 1 and denominator 1. Never leave the hero visual blank.
- Render a full pie chart that changes with the fraction value. The 1/1 default must appear as a complete filled circle.
- Show the current value as fraction form plus a decimal conversion displayed directly below the pie chart.
- Only add percentage, number-line, or other secondary visuals when the learner request explicitly asks for them.
- Use a direct text input labeled like "Enter fraction or decimal" as the primary control. Accept values such as 2/5 or 0.032. Do not use a select dropdown as the main picker.
- Include numerator and denominator sliders for these fraction-editing visuals, and make sure both sliders update the visible values and pie chart live while dragging in either direction.
- Keep each fraction illustration set compact and readable: pie chart, decimal below it, and current fraction text grouped together.
- If the request explicitly asks for comparison, place fraction illustration sets side by side with a maximum of two per row and wrap additional sets onto the next row. Otherwise avoid extra add/remove management controls.
`.trim();
  }

  if (/(一次函数|线性函数|linear function|y\s*=\s*a\s*x\s*\+\s*b|y\s*=\s*ax\s*\+\s*b|slope|intercept|斜率|截距)/i.test(topicText)) {
    return `
Topic-specific requirements for linear function visuals:
- Make the real-time formula y = ax + b visually prominent, with a and b values updated live.
- Draw a coordinate system with readable x/y axes, tick labels, and a single clear line.
- Label the y-intercept point at x = 0 and connect it to b.
- Show a slope triangle on or near the line with Delta x = 1 and Delta y = a.
- When a changes, make the rotation/tilt change visually obvious and update a short observation sentence.
- When b changes, make the parallel vertical shift visually obvious and update a short observation sentence.
- Use two primary sliders for a and b. A reset button is useful, but do not add unrelated controls.
- Keep explanations short and dynamic. Avoid long static paragraphs.
`.trim();
  }

  const topicMemory = buildTopicMemoryBlock([
    payload.prompt,
    payload.template,
    payload.title,
    payload.description,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join('\n'));
  if (topicMemory) {
    return topicMemory;
  }

  return `
Topic-specific requirements:
- Identify the one concept the learner most needs to see, then design the interaction around that concept.
- Add dynamic labels or annotations that move or update when controls change.
- Keep the observation panel concise and tied to the current state.
`.trim();
}

export function buildInteractiveVisualPrompt(payload: z.infer<typeof RequestSchema>) {
  const languageInstruction =
    payload.language === 'zh-CN'
      ? 'Write learner-facing labels and explanatory text in Simplified Chinese.'
      : 'Write learner-facing labels and explanatory text in English.';

  const templateHint = payload.template?.trim() && payload.template !== 'generic'
    ? `Prefer this starting simulation family when it fits: ${payload.template}.`
    : 'Choose the most appropriate interactive simulation family yourself.';

  const modeHint = payload.experienceMode
    ? `The author explicitly wants this interaction mode: ${payload.experienceMode}. Honour it unless it is impossible for the request.`
    : 'Infer the best interaction mode from the request: simulation, graph, scenario, or story.';

  return `
You are an expert educational interaction designer and frontend developer.
Reason silently step-by-step, but do not reveal your chain of thought.
Return only a single, complete, runnable HTML document.
Do not return JSON.
Do not wrap the HTML in markdown fences.
Do not include commentary before or after the HTML.

The HTML document must start with <!doctype html> or <html>, include <head>, <body>, and inline <script>.

Technical requirements:
- Use only HTML, CSS, and vanilla JavaScript.
- Do not use React.
- Do not use external libraries.
- Do not use external images.
- Do not use external URLs.
- Do not use script src, link href, module imports, fetch, XMLHttpRequest, WebSocket, iframe, object, or embed.
- The code must be self-contained and run directly inside a sandboxed iframe.
- Use SVG or Canvas for the main visualization.
- Use input controls such as sliders, buttons, toggles, or draggable elements when useful.

System-provided base CSS will be injected into <head> after your answer.
Use these classes for layout and visual quality instead of writing broad CSS boilerplate:
- iv-shell, iv-header, iv-kicker, iv-title, iv-subtitle
- iv-layout, iv-card, iv-visual-card, iv-controls-card, iv-observation-card
- iv-section-title, iv-control, iv-control-row, iv-label, iv-value
- iv-note, iv-conclusion, iv-formula, iv-pill, iv-badge
You may include a small inline <style> for concept-specific SVG/Canvas geometry, animation, and labels.
Do not duplicate large CSS resets, font stacks, card systems, design tokens, or generic body styling.

Design requirements:
- The visual must be clean, modern, and suitable for teaching.
- Use a clear layout with a title area, core visualization area, control area, and observation/conclusion area.
- Important changes must be visually obvious.
- Use color, motion, labels, guides, and annotations to explain the concept.
- Avoid clutter.
- Make it responsive.
- Use the system classes for rounded cards, soft shadows, readable typography, and sufficient spacing.
- Do not make a dashboard-style page with too many large cards. The visual should be the first thing learners notice.
- Keep all visible text concise; prefer dynamic labels, annotations, and one or two current-state observations over long static paragraphs.

Educational requirements:
- Help students understand the concept intuitively.
- Do not only display formulas; show the concept visually.
- Include short explanations near the controls.
- Include a clear conclusion or observation panel.
- Every interactive control must have an educational purpose.
- The default state should be simple and easy to understand.
- Do not include markdown fences or explanations outside the HTML document string.
- Call window.PrimoriaInteractive?.track?.(eventName, payload) for meaningful learner interactions
  such as slider changes, button presses, step reveals, mode switches, or answer checks.

If the topic is mathematical, ensure the graph is labeled clearly.
If the topic is physical, keep the model qualitatively accurate.

${buildTopicSpecificGuidance(payload)}

${languageInstruction}
${templateHint}
${modeHint}

Author context:
- Surface: ${payload.surface ?? 'builder'}
- Suggested title: ${payload.title?.trim() || 'none'}
- Suggested description: ${payload.description?.trim() || 'none'}

Learner request:
${payload.prompt.trim()}
`.trim();
}

function stripHtmlMarkdownFence(text: string) {
  const trimmed = text.trim();
  const fenced = /^```(?:html)?\s*([\s\S]*?)\s*```$/i.exec(trimmed)?.[1];
  return (fenced ?? trimmed).trim();
}

export function extractInteractiveVisualHtml(text: string) {
  const stripped = stripHtmlMarkdownFence(text);
  const startMatch = /<!doctype html[\s>]|<html[\s>]/i.exec(stripped);
  if (!startMatch) {
    return null;
  }

  const fromStart = stripped.slice(startMatch.index).trim();
  const endIndex = fromStart.toLowerCase().lastIndexOf('</html>');
  if (endIndex === -1) {
    return fromStart;
  }

  return fromStart.slice(0, endIndex + '</html>'.length).trim();
}

function stripTags(text: string) {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractHtmlTitle(html: string) {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  return title ? stripTags(title) : undefined;
}

function extractHtmlDescription(html: string) {
  const metaDescription = /<meta[^>]+name\s*=\s*(["'])description\1[^>]+content\s*=\s*(["'])(.*?)\2/i.exec(html)?.[3] ??
    /<meta[^>]+content\s*=\s*(["'])(.*?)\1[^>]+name\s*=\s*(["'])description\3/i.exec(html)?.[2];
  if (metaDescription?.trim()) {
    return metaDescription.trim();
  }

  const subtitle = /class\s*=\s*(["'])[^"']*\biv-subtitle\b[^"']*\1[^>]*>([\s\S]*?)<\/[^>]+>/i.exec(html)?.[2];
  return subtitle ? stripTags(subtitle) : undefined;
}

function summarizePrompt(prompt: string, language: 'en' | 'zh-CN' | undefined) {
  const normalized = prompt.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return language === 'zh-CN' ? '交互式可视化' : 'Interactive Visual';
  }
  return normalized.length > 42 ? `${normalized.slice(0, 39).trim()}...` : normalized;
}

function inferGeneratedTemplate(payload: z.infer<typeof RequestSchema>) {
  const preferred = payload.template?.trim();
  if (preferred && preferred !== 'generic') {
    return preferred;
  }

  const topicText = `${payload.prompt}\n${payload.title ?? ''}\n${payload.description ?? ''}`.toLowerCase();
  if (/(fraction|fractions|numerator|denominator|equivalent fraction|decimal|percentage|percent|number line)/i.test(topicText)) {
    return 'fraction-explorer';
  }
  if (/(一次函数|线性函数|linear function|y\s*=\s*a\s*x\s*\+\s*b|y\s*=\s*ax\s*\+\s*b|slope|intercept|斜率|截距)/i.test(topicText)) {
    return 'linear-function-graph';
  }
  if (/(sin|sine|cos|cosine|trig|三角函数|正弦|余弦)/i.test(topicText)) {
    return 'trigonometry-graph';
  }
  if (/(wave|amplitude|frequency|phase|波|振幅|频率)/i.test(topicText)) {
    return 'wave';
  }
  return 'generic';
}

function inferGeneratedExperienceMode(payload: z.infer<typeof RequestSchema>) {
  if (payload.experienceMode) {
    return payload.experienceMode;
  }

  const topicText = payload.prompt.toLowerCase();
  if (/(graph|plot|chart|curve|function|函数|图像|图表|曲线|坐标)/i.test(topicText)) {
    return 'graph' as const;
  }
  if (/(scenario|case|situation|情境|场景)/i.test(topicText)) {
    return 'scenario' as const;
  }
  if (/(story|narrative|故事)/i.test(topicText)) {
    return 'story' as const;
  }
  return 'simulation' as const;
}

export function buildInteractiveVisualArtifactFromHtml(
  payload: z.infer<typeof RequestSchema>,
  html: string,
) {
  const generatedHtml = injectInteractiveVisualBaseStyles(html);
  validateOfflineHtml(generatedHtml);

  return {
    title: payload.title?.trim() || extractHtmlTitle(generatedHtml) || summarizePrompt(payload.prompt, payload.language),
    description:
      payload.description?.trim() ||
      extractHtmlDescription(generatedHtml) ||
      (payload.language === 'zh-CN'
        ? '操作控件，观察关键概念如何随参数实时变化。'
        : 'Use the controls to see how the core concept changes in real time.'),
    template: inferGeneratedTemplate(payload),
    experienceMode: inferGeneratedExperienceMode(payload),
    themeTone: 'primoria-system',
    generatedHtml,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildRepairInstruction(errors: string[]) {
  if (!errors.length) {
    return '';
  }

  return `
Previous generated HTML failed validation. Fix the HTML and return the complete document again.
Validation errors to fix:
${errors.map((error, index) => `${index + 1}. ${error}`).join('\n')}
Preserve the same educational intent. Do not explain the fix.
`.trim();
}

type LlmAuditSummary =
  | { ok: true; report: LlmAuditReport }
  | { ok: false; reason: 'auditor-unavailable'; message: string };

type GeneratedArtifact = ReturnType<typeof buildInteractiveVisualArtifactFromHtml> & {
  plan?: Plan;
  audit?: { static?: AuditReport; llm?: LlmAuditSummary };
};

async function generateInteractiveVisualLegacy(
  payload: z.infer<typeof RequestSchema>,
  repairErrors: string[],
): Promise<GeneratedArtifact> {
  const geminiApiKey = getEnv('GEMINI_API_KEY');
  let lastError = 'AI interactive visual generation failed.';
  let lastKind: 'transient' | 'validation' | 'fatal' = 'fatal';
  let lastHttpStatus: number | undefined;
  const prompt = [buildInteractiveVisualPrompt(payload), buildRepairInstruction(repairErrors)].filter(Boolean).join('\n\n');

  for (const model of [DEFAULT_MODEL, ...FALLBACK_MODELS.filter((candidate) => candidate !== DEFAULT_MODEL)]) {
    const response = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            text: 'You create safe, offline, interactive educational HTML documents for sandboxed iframes. Return only one complete runnable HTML document. Do not return JSON or markdown.',
          }],
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.45,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      }),
    });

    if (!response.ok) {
      lastError = `Gemini returned HTTP ${response.status}.`;
      lastKind = isTransientGeminiStatus(response.status) ? 'transient' : 'fatal';
      lastHttpStatus = response.status;
      continue;
    }

    lastHttpStatus = undefined;
    const raw = (await response.json()) as Record<string, unknown>;
    const candidateTexts = extractGeminiCandidateTexts(raw);
    if (!candidateTexts.length) {
      lastError = 'Gemini returned an empty response.';
      lastKind = 'transient';
      continue;
    }

    for (const text of candidateTexts) {
      const html = extractInteractiveVisualHtml(text);
      if (!html) {
        lastError = 'Gemini did not return a complete HTML document.';
        lastKind = 'validation';
        continue;
      }

      try {
        validateOfflineHtml(html);
        return buildInteractiveVisualArtifactFromHtml(payload, html);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Interactive visual HTML validation failed.';
        lastKind = 'validation';
        continue;
      }
    }
  }

  throw new GenerationAttemptError(lastError, lastKind, lastHttpStatus);
}

async function generateInteractiveVisual(
  payload: z.infer<typeof RequestSchema>,
  repairErrors: string[] = [],
): Promise<GeneratedArtifact> {
  if (!TWO_STEP_ENABLED) {
    return generateInteractiveVisualLegacy(payload, repairErrors);
  }

  const geminiApiKey = getEnv('GEMINI_API_KEY');
  const planInput = {
    prompt: payload.prompt,
    template: payload.template,
    experienceMode: payload.experienceMode,
    title: payload.title,
    description: payload.description,
    language: payload.language,
    surface: payload.surface,
  };
  const plan = await generateInteractivePlan(geminiApiKey, planInput);
  const renderInput = planInput;
  const html = await generateInteractiveHtmlFromPlan(
    geminiApiKey,
    renderInput,
    plan,
    repairErrors,
    extractInteractiveVisualHtml,
    validateOfflineHtml,
  );

  let staticAudit: AuditReport | undefined;
  if (STATIC_AUDIT_ENABLED) {
    staticAudit = auditHtmlStatic(html, plan);
    if (staticAudit.blockers.length > 0) {
      const hints = formatAuditIssuesForRepair(staticAudit.blockers);
      throw new GenerationAttemptError(
        `Static audit blockers (${staticAudit.blockers.map((b) => b.rule).join(', ')}):\n${hints.join('\n')}`,
        'validation',
        undefined,
        'render',
      );
    }
  }

  let llmAudit: LlmAuditSummary | undefined;
  if (LLM_AUDIT_ENABLED) {
    const outcome: AuditOutcome = await auditHtmlWithLLM({
      apiKey: geminiApiKey,
      userPrompt: payload.prompt,
      plan,
      html,
    }).catch((error) => ({
      ok: false as const,
      reason: 'auditor-unavailable' as const,
      message: error instanceof Error ? error.message : 'LLM auditor threw.',
    }));
    llmAudit = outcome;

    if (outcome.ok && outcome.report.verdict === 'repair') {
      const blockers = outcome.report.issues.filter((i) => i.severity === 'blocker');
      if (blockers.length > 0) {
        const hints = blockers.map((i) => `[llm:${i.category}] ${i.message}`);
        throw new GenerationAttemptError(
          `LLM audit blockers:\n${hints.join('\n')}`,
          'validation',
          undefined,
          'render',
        );
      }
    }
  }

  const artifact = buildInteractiveVisualArtifactFromHtml(payload, html);
  return {
    ...artifact,
    plan,
    audit:
      staticAudit || llmAudit
        ? { ...(staticAudit ? { static: staticAudit } : {}), ...(llmAudit ? { llm: llmAudit } : {}) }
        : undefined,
  };
}

function normalizeErrorHistory(value: unknown) {
  return Array.isArray(value) ? (value as JobErrorEntry[]) : [];
}

export function serializeJob(row: JobRow) {
  return {
    id: row.id,
    status: row.status,
    prompt: row.prompt,
    requestPayload: row.request_payload,
    resultArtifact: row.result_artifact,
    lastError: row.last_error,
    errorHistory: normalizeErrorHistory(row.error_history),
    attemptCount: row.attempt_count,
    nextAttemptAt: row.next_attempt_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function artifactResponse(generated: GeneratedArtifact, prompt: string) {
  return {
    version: '1',
    engine: 'gemini-html5',
    title: generated.title,
    description: generated.description,
    template: generated.template,
    experienceMode: generated.experienceMode,
    themeTone: generated.themeTone,
    aiPrompt: prompt,
    generatedHtml: generated.generatedHtml,
    ...(generated.plan ? { plan: generated.plan } : {}),
    ...(generated.audit ? { audit: generated.audit } : {}),
  };
}

function appendErrorHistory(
  history: JobErrorEntry[],
  entry: JobErrorEntry,
) {
  return [...history, entry].slice(-30);
}

function countErrorKind(history: JobErrorEntry[], kind: JobErrorEntry['kind']) {
  return history.filter((entry) => entry.kind === kind).length;
}

function countTransientForStep(history: JobErrorEntry[], step: 'plan' | 'render') {
  return history.filter((entry) => entry.kind === 'transient' && (entry.step ?? 'render') === step).length;
}

function transientBudgetForStep(step: 'plan' | 'render') {
  return step === 'plan' ? MAX_TRANSIENT_PLAN_RETRIES : MAX_TRANSIENT_RENDER_RETRIES;
}

function transientDelaysForStep(step: 'plan' | 'render') {
  return step === 'plan' ? PLAN_TRANSIENT_DELAYS_MS : RENDER_TRANSIENT_DELAYS_MS;
}

function nextTransientRetryDelay(history: JobErrorEntry[], step: 'plan' | 'render') {
  const transientCount = countTransientForStep(history, step);
  const delays = transientDelaysForStep(step);
  return delays[Math.min(Math.max(transientCount - 1, 0), delays.length - 1)];
}

async function fetchJob(serviceClient: ReturnType<typeof createServiceClient>, jobId: string) {
  const { data, error } = await serviceClient
    .from(JOB_TABLE)
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data as JobRow | null;
}

async function fetchUserJob(serviceClient: ReturnType<typeof createServiceClient>, jobId: string, userId: string) {
  const job = await fetchJob(serviceClient, jobId);
  if (!job || job.user_id !== userId) {
    return null;
  }
  return job;
}

async function createGenerationJob(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  payload: InteractiveVisualPayload,
) {
  const { data, error } = await serviceClient
    .from(JOB_TABLE)
    .insert({
      user_id: userId,
      status: 'queued',
      prompt: payload.prompt,
      request_payload: payload,
      error_history: [],
      attempt_count: 0,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }
  return data as JobRow;
}

async function markJob(
  serviceClient: ReturnType<typeof createServiceClient>,
  jobId: string,
  patch: Record<string, unknown>,
) {
  const { data, error } = await serviceClient
    .from(JOB_TABLE)
    .update(patch)
    .eq('id', jobId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }
  return data as JobRow;
}

async function fetchDueJobs(serviceClient: ReturnType<typeof createServiceClient>, limit: number) {
  const nowIso = new Date().toISOString();
  const staleIso = new Date(Date.now() - STALE_RUNNING_AFTER_MS).toISOString();
  const [{ data: queued, error: queuedError }, { data: stale, error: staleError }] = await Promise.all([
    serviceClient
      .from(JOB_TABLE)
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(limit * 5),
    serviceClient
      .from(JOB_TABLE)
      .select('*')
      .eq('status', 'running')
      .lt('updated_at', staleIso)
      .order('updated_at', { ascending: true })
      .limit(limit),
  ]);

  if (queuedError) {
    throw queuedError;
  }
  if (staleError) {
    throw staleError;
  }

  const byId = new Map<string, JobRow>();
  for (const row of [
    ...((queued ?? []) as JobRow[]).filter((candidate) => !candidate.next_attempt_at || candidate.next_attempt_at <= nowIso),
    ...((stale ?? []) as JobRow[]),
  ]) {
    byId.set(row.id, row);
  }
  return Array.from(byId.values()).slice(0, limit);
}

async function processSingleJob(
  serviceClient: ReturnType<typeof createServiceClient>,
  initialJob: JobRow,
  options: { followRetries: boolean },
) {
  let job = initialJob;

  while (job.status !== 'succeeded' && job.status !== 'failed') {
    const payload = RequestSchema.parse(job.request_payload);
    const history = normalizeErrorHistory(job.error_history);
    const validationErrors = history
      .filter((entry) => entry.kind === 'validation')
      .map((entry) => entry.message)
      .slice(-MAX_VALIDATION_REPAIRS);
    const attempt = job.attempt_count + 1;

    job = await markJob(serviceClient, job.id, {
      status: 'running',
      attempt_count: attempt,
      next_attempt_at: null,
      completed_at: null,
    });

    try {
      const generated = await generateInteractiveVisual(payload, validationErrors);
      const responseArtifact = artifactResponse(generated, payload.prompt);
      job = await markJob(serviceClient, job.id, {
        status: 'succeeded',
        result_artifact: responseArtifact,
        last_error: null,
        next_attempt_at: null,
        completed_at: new Date().toISOString(),
      });
      return job;
    } catch (error) {
      const generationError = isGenerationAttemptError(error)
        ? error
        : new GenerationAttemptError(error instanceof Error ? error.message : 'Interactive visual generation failed.', 'fatal');
      const errorStep: 'plan' | 'render' = generationError.step ?? 'render';
      const retryable =
        (generationError.kind === 'validation' && countErrorKind(history, 'validation') < MAX_VALIDATION_REPAIRS) ||
        (generationError.kind === 'transient' && countTransientForStep(history, errorStep) < transientBudgetForStep(errorStep));
      const nextAttemptAt =
        generationError.kind === 'transient' && retryable
          ? new Date(Date.now() + nextTransientRetryDelay([...history, {
              at: new Date().toISOString(),
              attempt,
              kind: generationError.kind,
              message: generationError.message,
              retryable,
              httpStatus: generationError.httpStatus,
              step: errorStep,
            }], errorStep)).toISOString()
          : undefined;
      const entry: JobErrorEntry = {
        at: new Date().toISOString(),
        attempt,
        kind: generationError.kind,
        message: generationError.message,
        retryable,
        nextAttemptAt,
        httpStatus: generationError.httpStatus,
        step: generationError.step,
      };
      const nextHistory = appendErrorHistory(history, entry);

      if (!retryable) {
        job = await markJob(serviceClient, job.id, {
          status: 'failed',
          last_error: generationError.message,
          error_history: nextHistory,
          next_attempt_at: null,
          completed_at: new Date().toISOString(),
        });
        return job;
      }

      job = await markJob(serviceClient, job.id, {
        status: generationError.kind === 'transient' ? 'queued' : 'running',
        last_error: generationError.message,
        error_history: nextHistory,
        next_attempt_at: nextAttemptAt ?? null,
      });

      if (generationError.kind === 'validation') {
        continue;
      }

      if (!options.followRetries) {
        return job;
      }

      await sleep(Math.max(0, Date.parse(nextAttemptAt ?? new Date().toISOString()) - Date.now()));
      const refreshed = await fetchJob(serviceClient, job.id);
      if (!refreshed || refreshed.status === 'succeeded' || refreshed.status === 'failed') {
        return refreshed ?? job;
      }
      job = refreshed;
    }
  }

  return job;
}

async function processGenerationJobs({
  jobId,
  userId,
  followRetries,
}: {
  jobId?: string;
  userId?: string;
  followRetries: boolean;
}) {
  const serviceClient = createServiceClient();
  const jobs = jobId
    ? [userId ? await fetchUserJob(serviceClient, jobId, userId) : await fetchJob(serviceClient, jobId)].filter(Boolean) as JobRow[]
    : await fetchDueJobs(serviceClient, QUEUE_PROCESS_LIMIT);

  const processed: Array<ReturnType<typeof serializeJob>> = [];
  for (const job of jobs) {
    const latest = await processSingleJob(serviceClient, job, { followRetries });
    if (latest) {
      processed.push(serializeJob(latest));
    }
  }

  return {
    processed: processed.length,
    jobs: processed,
  };
}

function scheduleJobProcessing(jobId: string) {
  const promise = processGenerationJobs({ jobId, followRetries: true }).catch((error) => {
    console.error('[viewer-ai-interactive-visual] background processing failed', error);
  });
  const maybeRuntime = (globalThis as unknown as { EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void } }).EdgeRuntime;
  if (typeof maybeRuntime?.waitUntil === 'function') {
    maybeRuntime.waitUntil(promise);
    return;
  }
  void promise;
}

export async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method === 'GET') {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }
      const jobId = new URL(req.url).searchParams.get('jobId') ?? '';
      if (!jobId) {
        return jsonResponse({ error: 'jobId is required.' }, 400);
      }
      const job = await fetchUserJob(createServiceClient(), jobId, user.id);
      if (!job) {
        return jsonResponse({ error: 'Generation job was not found.' }, 404);
      }
      return jsonResponse({ job: serializeJob(job) });
    }

    const body = await req.json().catch(() => ({}));
    const action = ActionSchema.parse(body).action ?? 'sync';

    if (action === 'process') {
      const actionPayload = ActionSchema.parse(body);
      if (isQueueWorkerRequest(req)) {
        const summary = await processGenerationJobs({ jobId: actionPayload.jobId, followRetries: false });
        return jsonResponse(summary);
      }

      const user = await getAuthenticatedUser(req);
      if (!user || !actionPayload.jobId) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }
      const summary = await processGenerationJobs({
        jobId: actionPayload.jobId,
        userId: user.id,
        followRetries: true,
      });
      return jsonResponse(summary);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    if (action === 'status') {
      const jobId = ActionSchema.parse(body).jobId;
      if (!jobId) {
        return jsonResponse({ error: 'jobId is required.' }, 400);
      }
      const job = await fetchUserJob(createServiceClient(), jobId, user.id);
      if (!job) {
        return jsonResponse({ error: 'Generation job was not found.' }, 404);
      }
      return jsonResponse({ job: serializeJob(job) });
    }

    if (action === 'create') {
      const payload = RequestSchema.parse(body);
      const job = await createGenerationJob(createServiceClient(), user.id, payload);
      scheduleJobProcessing(job.id);
      return jsonResponse({ jobId: job.id, status: job.status, job: serializeJob(job) }, 202);
    }

    const payload = RequestSchema.parse(body);
    const generated = await generateInteractiveVisual(payload);
    return jsonResponse(artifactResponse(generated, payload.prompt));
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Interactive visual generation failed.',
      },
      400,
    );
  }
}

if (import.meta.main) {
  serve(handler);
}
