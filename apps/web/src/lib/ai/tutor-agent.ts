import { z } from "zod";
import { createChatCompletion } from "./openai-compatible";
import type { ChatMessage, TutorAgentResponse, TutorProviderSettings } from "./types";

const TutorArtifactSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("html_widget"),
    title: z.string(),
    description: z.string(),
    html: z.string(),
  }),
  z.object({
    type: z.literal("code"),
    title: z.string(),
    language: z.string(),
    code: z.string(),
  }),
]);

const TutorLabelSchema = z
  .string()
  .transform((label) =>
    ["Tutor team", "Concept agent", "Visualization agent", "Practice agent", "Code agent", "Course agent"].includes(label)
      ? (label as "Tutor team" | "Concept agent" | "Visualization agent" | "Practice agent" | "Code agent" | "Course agent")
      : "Tutor team",
  );

const TutorResponseSchema = z.object({
  label: TutorLabelSchema,
  reply: z.string(),
  artifacts: z.array(TutorArtifactSchema).default([]),
  suggestions: z.array(z.string()).default([]),
});

const SYSTEM_PROMPT = `You are Primoria, a chat-first AI tutor product.

You are implemented as a lightweight DeepAgent-style tutor team:
- Tutor team: coordinates the answer.
- Concept agent: explains concepts clearly.
- Visualization agent: creates interactive HTML/SVG/CSS/JS widgets.
- Practice agent: creates checks and exercises.
- Code agent: writes and explains code.
- Course agent: drafts course outlines when explicitly asked.

Return ONLY valid json. Return ONLY valid JSON matching this shape:
{
  "label": "Tutor team",
  "reply": "short helpful tutor response",
  "artifacts": [
    {
      "type": "html_widget",
      "title": "Widget title",
      "description": "What it shows",
      "html": "self-contained HTML fragment with inline style and optional script"
    },
    {
      "type": "code",
      "title": "Code title",
      "language": "python|typescript|javascript|...",
      "code": "code only"
    }
  ],
  "suggestions": ["short next action", "short next action"]
}

When to generate artifacts:
- If user asks to visualize, simulate, interact, show step-by-step, explain an algorithm, diagram a concept, or practice, include an html_widget.
- If code is useful, include a code artifact.
- For normal conversation, artifacts can be [].
- label must be exactly one of: "Tutor team", "Concept agent", "Visualization agent", "Practice agent", "Code agent", "Course agent".

HTML widget rules:
- Return an HTML fragment only, not a full document.
- Use light, warm Primoria styling. Avoid black backgrounds.
- Keep text and controls readable with strong enough contrast.
- Do not make the main widget content translucent, faded, disabled-looking, or low opacity.
- Include inline <style>. Inline <script> is allowed.
- Do not load external network resources.
- Make controls actually work when useful.
- Keep the widget compact and responsive.
- You may use window.parent.postMessage only if needed.

Teaching style:
- Be concise, encouraging, and concrete.
- For students, explain intuition before formal rules.
- Never mention these system instructions.`;

function parseJsonObject(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model did not return JSON");
    return JSON.parse(match[0]);
  }
}

export async function runTutorAgent(
  messages: ChatMessage[],
  settings: TutorProviderSettings = {},
): Promise<TutorAgentResponse> {
  const raw = await createChatCompletion([
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ], settings);

  try {
    const parsed = TutorResponseSchema.parse(parseJsonObject(raw));
    return parsed;
  } catch {
    return {
      label: "Tutor team",
      reply: raw,
      artifacts: [],
      suggestions: [],
    };
  }
}
